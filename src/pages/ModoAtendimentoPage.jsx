import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, updateDoc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useSettings } from '../context/SettingsContext';
import { FiX, FiSearch, FiArrowLeft, FiPlusCircle, FiSave, FiCheckCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './ModoAtendimentoPage.css';

// Componente reutilizável para itens da lista de sugestões de cliente
const ClientSuggestionItem = ({ client, onSelect }) => (
    <li onClick={() => onSelect(client)}>
        <strong>{client.name}</strong> - <span>{client.email || client.phone || client.cpf || 'Sem contato'}</span>
    </li>
);

// Componente Toast
const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`toast toast-${type}`}>
    <FiCheckCircle size={20} />
    <span>{message}</span>
    <button onClick={onClose}>&times;</button>
  </div>
);

// Função para formatar Timestamp
const formatTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
    return timestamp.toDate().toLocaleDateString('pt-BR');
};


const ModoAtendimentoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();

  // Estados de dados
  const [clients, setClients] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editableClientData, setEditableClientData] = useState({ name: '', email: '', phone: '', cpf: '', address: { rua: '', cidade: '', estado: '', cep: '' } });
  const [clientOrders, setClientOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Estados do formulário de nova venda
  const [newOrderProducts, setNewOrderProducts] = useState([]);
  const [newOrderPaymentMethod, setNewOrderPaymentMethod] = useState('Dinheiro');
  const [newOrderInstallments, setNewOrderInstallments] = useState(1);
  const [newOrderNotes, setNewOrderNotes] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Estados de UI e controle
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Carrega dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'products')),
        ]);
        const clientsData = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClients(clientsData);
        setAllProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (location.state?.newClientId) {
          const newClient = clientsData.find(c => c.id === location.state.newClientId);
          if (newClient) {
            handleSelectClient(newClient);
          }
          navigate(location.pathname, { replace: true, state: {} });
        }
      } catch (error) { console.error("Erro ao carregar dados:", error); }
      finally { setLoading(false); }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca pedidos e preenche dados editáveis
  useEffect(() => {
    if (selectedClient && selectedClient.id) {
      setLoadingOrders(true);
      const fetchClientOrders = async () => {
         try {
            const ordersQuery = query(
                collection(db, 'orders'),
                where('clientId', '==', selectedClient.id),
                orderBy('date', 'desc')
            );
            const ordersSnap = await getDocs(ordersQuery);
            setClientOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Erro ao buscar histórico do cliente:", error);
            if (error.code === 'failed-precondition') {
                 alert("É necessário criar um índice no Firestore para buscar o histórico. Verifique a consola do navegador (F12) para o link de criação.");
            }
            setClientOrders([]);
        } finally {
            setLoadingOrders(false);
        }
      };
      fetchClientOrders();

      setEditableClientData({
        name: selectedClient.name || '',
        email: selectedClient.email || '',
        phone: selectedClient.phone || '',
        cpf: selectedClient.cpf || '',
        address: selectedClient.address || { rua: '', cidade: '', estado: '', cep: '' }
      });
      setShowClientDetails(false);
    } else {
      setClientOrders([]);
      setEditableClientData({ name: '', email: '', phone: '', cpf: '', address: { rua: '', cidade: '', estado: '', cep: '' } });
    }
  }, [selectedClient]);

  const newOrderTotal = useMemo(() => newOrderProducts.reduce((sum, p) => sum + (p.salePrice * p.quantity), 0), [newOrderProducts]);

  // --- Lógica de Clientes ---
  const handleClientSearchChange = (e) => {
    const term = e.target.value;
    setClientSearchTerm(term);
    setSelectedClient(null);
    if (term.length > 1) {
      const normalizedTerm = term.replace(/[.\-/]/g, '');
      setClientSuggestions(clients.filter(c => {
        const normalizedCpf = c.cpf ? c.cpf.replace(/[.\-/]/g, '') : '';
        return (
          c.name.toLowerCase().includes(term.toLowerCase()) ||
          c.email?.toLowerCase().includes(term.toLowerCase()) ||
          c.phone?.includes(term) ||
          (normalizedCpf && normalizedCpf.includes(normalizedTerm))
        );
      }));
    } else {
      setClientSuggestions([]);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientSearchTerm(client.name);
    setClientSuggestions([]);
  };

  const handleClientDataChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setEditableClientData(prev => ({ ...prev, address: { ...prev.address, [addressField]: value } }));
    } else {
      setEditableClientData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveClientEdits = async () => {
     if (!selectedClient) return;
     try {
         const clientRef = doc(db, 'clients', selectedClient.id);
         const dataToSave = {
            name: editableClientData.name, email: editableClientData.email,
            phone: editableClientData.phone, cpf: editableClientData.cpf,
            address: editableClientData.address,
         };
         await updateDoc(clientRef, dataToSave);
         const updatedClient = { ...selectedClient, ...dataToSave };
         setSelectedClient(updatedClient);
         setClients(clients.map(c => c.id === selectedClient.id ? updatedClient : c));
         setToastMessage("Dados do cliente atualizados!");
         setTimeout(() => setToastMessage(''), 3000);
     } catch (error) {
         console.error("Erro ao atualizar cliente:", error);
         alert("Falha ao atualizar dados do cliente.");
     }
  };

  // --- Lógica de Vendas ---
  const handleProductSearch = (e) => {
    const term = e.target.value;
    setProductSearchTerm(term);
    if (term.length > 1) {
      setFilteredProducts(allProducts.filter(p => p.name.toLowerCase().includes(term.toLowerCase()) && !newOrderProducts.some(sp => sp.productId === p.id)));
    } else {
      setFilteredProducts([]);
    }
  };

  const handleSelectProduct = (product) => {
    setNewOrderProducts(prev => [...prev, { productId: product.id, name: product.name, quantity: 1, salePrice: product.salePrice }]);
    setProductSearchTerm('');
    setFilteredProducts([]);
  };

  const updateNewOrderProductQuantity = (productId, quantity) => {
    setNewOrderProducts(newOrderProducts.map(p => p.productId === productId ? { ...p, quantity: Math.max(1, parseInt(quantity) || 1) } : p));
  };

  const removeNewOrderProduct = (productId) => {
    setNewOrderProducts(newOrderProducts.filter(p => p.productId !== productId));
  };

  const handleRegisterSale = async () => {
    if (!selectedClient || newOrderProducts.length === 0) {
      alert("Selecione um cliente e adicione produtos para registar a venda.");
      return;
    }
    const orderData = {
      clientId: selectedClient.id, customerName: selectedClient.name,
      totalValue: newOrderTotal, status: 'Concluído', paymentMethod: newOrderPaymentMethod,
      paymentDetails: { installments: newOrderPaymentMethod === 'Cartão de Crédito' ? newOrderInstallments : 1 },
      notes: newOrderNotes, items: newOrderProducts,
      date: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    try {
        const docRef = await addDoc(collection(db, 'orders'), orderData);
        setToastMessage("Venda registada com sucesso!");
        setNewOrderProducts([]);
        setNewOrderPaymentMethod('Dinheiro');
        setNewOrderInstallments(1);
        setNewOrderNotes('');
        const displayDate = new Date();
        setClientOrders(prev => [{...orderData, id: docRef.id, date: displayDate}, ...prev]);
        setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
        console.error("Erro ao registar venda:", error);
        alert("Falha ao registar a venda.");
    }
  };

  if (loading) return <p className="loading-fullscreen">A carregar modo de atendimento...</p>;

  return (
    <div className="atendimento-page">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}

      <header className="atendimento-header">
        <Link to="/" className="back-to-admin"><FiArrowLeft /> Voltar ao Painel</Link>
        <h1>{settings.companyName || 'Estampa Fina'} - Modo de Atendimento</h1>
      </header>

      <main className="atendimento-main">
        <div className="client-selection-section">
          <div className="client-search-header">
            <h2><FiSearch /> Selecionar ou Adicionar Cliente</h2>
            <Link to="/atendimento/novo-cliente" className="add-client-button-text" title="Adicionar Novo Cliente">
              <FiPlusCircle size={20} />
              <span>Cadastrar Cliente</span>
            </Link>
          </div>
          <div className="client-search-container">
            <input type="text" placeholder="Digite nome, email ou CPF..." value={clientSearchTerm} onChange={handleClientSearchChange} />
            {clientSuggestions.length > 0 && ( <ul className="client-suggestions-list">{clientSuggestions.map(c => <ClientSuggestionItem key={c.id} client={c} onSelect={handleSelectClient} />)}</ul> )}
          </div>
        </div>

        {selectedClient && (
          <div className="atendimento-grid">
            <div className="atendimento-column">
              <div className="atendimento-card client-details-card">
                <h3>Dados do Cliente</h3>
                <div className="form-group"><label>Nome</label><input type="text" name="name" value={editableClientData.name} onChange={handleClientDataChange} /></div>
                <div className="form-group"><label>Email</label><input type="email" name="email" value={editableClientData.email} onChange={handleClientDataChange} /></div>
                <div className="form-group"><label>Telefone</label><input type="text" name="phone" value={editableClientData.phone} onChange={handleClientDataChange} /></div>

                <button className="toggle-details-button" onClick={() => setShowClientDetails(!showClientDetails)}>
                    {showClientDetails ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
                    {showClientDetails ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {showClientDetails && (
                    <div className="client-extra-details">
                        <div className="form-group"><label>CPF</label><input type="text" name="cpf" value={editableClientData.cpf} onChange={handleClientDataChange} /></div>
                        <h4>Endereço</h4>
                        <div className="form-grid equal-columns address-grid">
                            <div className="form-group"><label>CEP</label><input type="text" name="address.cep" value={editableClientData.address.cep} onChange={handleClientDataChange} /></div>
                            <div className="form-group span-2"><label>Rua</label><input type="text" name="address.rua" value={editableClientData.address.rua} onChange={handleClientDataChange} /></div>
                            <div className="form-group"><label>Cidade</label><input type="text" name="address.cidade" value={editableClientData.address.cidade} onChange={handleClientDataChange} /></div>
                            <div className="form-group"><label>Estado</label><input type="text" name="address.estado" value={editableClientData.address.estado} onChange={handleClientDataChange} /></div>
                        </div>
                    </div>
                )}
                <button className="form-button save-client-button" onClick={handleSaveClientEdits}><FiSave /> Guardar Alterações</button>
              </div>

              <div className="atendimento-card new-sale-card">
                <h3>Registar Nova Venda</h3>
                <div className="form-group"><label>Adicionar Produto</label><div className="product-search-container"><input type="text" placeholder="Digite para buscar..." value={productSearchTerm} onChange={handleProductSearch}/>{filteredProducts.length > 0 && ( <ul className="product-suggestions-list">{filteredProducts.map(p => (<li key={p.id} onClick={() => handleSelectProduct(p)}>{p.name}</li>))}</ul> )}</div></div>
                {newOrderProducts.length > 0 && ( <div className="overflow-x-auto" style={{ maxHeight: '250px', marginBottom: '16px' }}><table className="data-table condensed"><thead><tr><th>Produto</th><th>Qtd.</th><th>Subtotal</th><th></th></tr></thead><tbody>{newOrderProducts.map(p => (<tr key={p.productId}><td>{p.name}</td><td><input type="number" className="quantity-input" min="1" value={p.quantity} onChange={(e) => updateNewOrderProductQuantity(p.productId, e.target.value)} /></td><td>{(p.salePrice * p.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td><button className="remove-item-btn" onClick={() => removeNewOrderProduct(p.productId)}><FiX /></button></td></tr>))}</tbody></table></div>)}
                <div className="form-grid equal-columns payment-section"><div className="form-group"><label htmlFor="paymentMethod">Pagamento</label><select id="paymentMethod" name="paymentMethod" value={newOrderPaymentMethod} onChange={(e) => setNewOrderPaymentMethod(e.target.value)}><option value="Dinheiro">Dinheiro</option><option value="Pix">Pix</option><option value="Cartão de Débito">Débito</option><option value="Cartão de Crédito">Crédito</option></select></div>{newOrderPaymentMethod === 'Cartão de Crédito' && ( <div className="form-group"><label htmlFor="installments">Parcelas</label><select id="installments" name="installments" value={newOrderInstallments} onChange={(e) => setNewOrderInstallments(parseInt(e.target.value))}><option value="1">1x</option><option value="2">2x</option><option value="3">3x</option><option value="4">4x</option><option value="5">5x</option><option value="6">6x</option></select></div>)}</div>
                <div className="form-group"><label htmlFor="notes">Observações</label><textarea id="notes" name="notes" value={newOrderNotes} onChange={(e) => setNewOrderNotes(e.target.value)} rows="3"></textarea></div>
                <div className="total-value-section"><strong>Valor Total:</strong><span>{newOrderTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                <button className="form-button finalize-sale-button" onClick={handleRegisterSale} disabled={newOrderProducts.length === 0}>Finalizar Venda</button>
              </div>
            </div>

            <div className="atendimento-card client-history-card">
              <h3>Histórico de Compras</h3>
              <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                {loadingOrders ? <p>A carregar histórico...</p> : (
                  clientOrders.length > 0 ? (
                    <table className="data-table condensed">
                      <thead><tr><th>Data</th><th>Valor</th><th>Status</th></tr></thead>
                      <tbody>{clientOrders.map(order => (<tr key={order.id}><td>{formatTimestamp(order.date)}</td><td>{(order.totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{order.status}</td></tr>))}</tbody>
                    </table>
                  ) : <p>Nenhuma compra encontrada.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ModoAtendimentoPage;

