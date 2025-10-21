import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import './FormPages.css';
import { FiX } from 'react-icons/fi';

const VendaFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // Estados principais
  const [order, setOrder] = useState({
    clientId: '',
    customerName: '',
    totalValue: 0,
    status: 'Aguardando Pagamento', // Novo status padrão
    paymentMethod: '',
    paymentDetails: { installments: 1 } // Novo campo para detalhes do pagamento
  });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  // Estados de UI e controle
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Busca os dados iniciais (clientes, produtos e a venda, se estiver a editar)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'products'))
        ]);
        setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAllProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (isEditing) {
          const docRef = doc(db, 'orders', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const orderData = docSnap.data();
            // Garante que o estado tenha a mesma estrutura
            const fullOrderData = {
              ...orderData,
              paymentDetails: orderData.paymentDetails || { installments: 1 }
            };
            setOrder({ id: docSnap.id, ...fullOrderData });
            setSelectedProducts(orderData.items || []);
          } else {
            navigate('/vendas');
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditing, navigate]);

  // Calcula o valor total da venda sempre que a lista de produtos selecionados mudar
  useEffect(() => {
    const total = selectedProducts.reduce((sum, product) => {
      return sum + (product.salePrice * product.quantity);
    }, 0);
    setOrder(prev => ({ ...prev, totalValue: total }));
  }, [selectedProducts]);

  // Lógica de busca de produtos
  const handleProductSearch = (e) => {
    const term = e.target.value;
    setProductSearchTerm(term);
    if (term.length > 1) {
      const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(term.toLowerCase()) &&
        !selectedProducts.some(sp => sp.id === p.id)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    setProductSearchTerm('');
    setFilteredProducts([]);
  };

  const updateSelectedProductQuantity = (productId, quantity) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
    ));
  };
  
  const removeSelectedProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'clientId') {
      const selectedClient = clients.find(c => c.id === value);
      setOrder(prev => ({ ...prev, clientId: value, customerName: selectedClient ? selectedClient.name : '' }));
    } else if (name === 'installments') {
      setOrder(prev => ({ ...prev, paymentDetails: { ...prev.paymentDetails, installments: parseInt(value) } }));
    } else if (name === 'paymentMethod') {
      // Reinicia as parcelas se o método de pagamento não for cartão de crédito
      const isCreditCard = value === 'Cartão de Crédito';
      setOrder(prev => ({
        ...prev,
        paymentMethod: value,
        paymentDetails: {
          installments: isCreditCard ? prev.paymentDetails.installments : 1
        }
      }));
    } else {
      setOrder(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0) {
      alert("Adicione pelo menos um produto à venda.");
      return;
    }
    setIsSubmitting(true);
    
    const orderData = { 
      ...order, 
      items: selectedProducts.map(({ id, name, quantity, salePrice }) => ({ productId: id, name, quantity, salePrice })),
      updatedAt: serverTimestamp()
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, 'orders', id), orderData);
      } else {
        orderData.date = serverTimestamp();
        await addDoc(collection(db, 'orders'), orderData);
      }
      navigate('/vendas');
    } catch (error) {
      console.error("Erro ao salvar venda:", error);
      alert('Falha ao salvar a venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <p>A carregar formulário...</p>;

  return (
    <>
      <form className="form-container large" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>{isEditing ? 'Editar Venda' : 'Registar Nova Venda'}</h3>
          <div className="form-grid equal-columns">
            <div className="form-group">
              <label htmlFor="clientId">Cliente</label>
              <select id="clientId" name="clientId" value={order.clientId} onChange={handleChange} required>
                <option value="">Selecione um cliente</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="paymentMethod">Forma de Pagamento</label>
              <select id="paymentMethod" name="paymentMethod" value={order.paymentMethod} onChange={handleChange} required>
                <option value="">Selecione</option>
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
            {/* Campo de parcelas que aparece condicionalmente */}
            {order.paymentMethod === 'Cartão de Crédito' && (
              <div className="form-group">
                <label htmlFor="installments">Parcelas</label>
                <select id="installments" name="installments" value={order.paymentDetails.installments} onChange={handleChange}>
                  <option value="1">1x (À vista)</option>
                  <option value="2">2x</option>
                  <option value="3">3x</option>
                  <option value="4">4x</option>
                  <option value="5">5x</option>
                  <option value="6">6x</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={order.status} onChange={handleChange} required>
                <option value="Aguardando Pagamento">Aguardando Pagamento</option>
                <option value="Pendente de Envio">Pendente de Envio</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
            <h3>Produtos da Venda</h3>
            <div className="form-group">
                <label htmlFor="productSearch">Adicionar Produto</label>
                <div className="product-search-container">
                    <input 
                        type="text" 
                        id="productSearch"
                        placeholder="Digite o nome do produto para buscar..."
                        value={productSearchTerm}
                        onChange={handleProductSearch}
                    />
                    {filteredProducts.length > 0 && (
                        <ul className="product-suggestions-list">
                            {filteredProducts.map(p => (
                                <li key={p.id} onClick={() => handleSelectProduct(p)}>
                                    {p.name} - <span>(Em estoque: {p.quantity || 0})</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {selectedProducts.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Quantidade</th>
                                <th>Preço Unit.</th>
                                <th>Subtotal</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedProducts.map(p => (
                                <tr key={p.id}>
                                    <td>{p.name}</td>
                                    <td><input type="number" className="quantity-input" min="1" value={p.quantity} onChange={(e) => updateSelectedProductQuantity(p.id, parseInt(e.target.value))} /></td>
                                    <td>{(p.salePrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td>{(p.salePrice * p.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td><button type="button" className="remove-item-btn" onClick={() => removeSelectedProduct(p.id)}><FiX /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="total-value-section">
                <strong>Valor Total:</strong>
                <span>{order.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
        </div>

        <div className="form-actions">
          <button type="button" className="form-button secondary" onClick={() => navigate('/vendas')}>Cancelar</button>
          <button type="submit" className="form-button" disabled={isSubmitting}>
            {isSubmitting ? 'A Guardar...' : (isEditing ? 'Guardar Alterações' : 'Registar Venda')}
          </button>
        </div>
      </form>
    </>
  );
};

export default VendaFormPage;