import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useSettings } from '../context/SettingsContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // CORREÇÃO: Importa a função diretamente
import './FormPages.css';
import { FiX } from 'react-icons/fi';

const OrcamentoFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isEditing = Boolean(id);

  const [quote, setQuote] = useState({ clientId: '', customerName: '', totalValue: 0, status: 'Pendente' });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsSnap, productsSnap] = await Promise.all([ getDocs(collection(db, 'clients')), getDocs(collection(db, 'products')) ]);
        setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAllProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (isEditing) {
          const docRef = doc(db, 'quotes', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const quoteData = docSnap.data();
            setQuote({ id: docSnap.id, ...quoteData });
            setSelectedProducts(quoteData.items || []);
            if (quoteData.clientId === '') {
                setIsNewCustomer(true);
            }
          }
        }
      } catch (error) { console.error("Erro ao carregar dados:", error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [id, isEditing]);

  useEffect(() => {
    const total = selectedProducts.reduce((sum, p) => sum + (p.salePrice * p.quantity), 0);
    setQuote(prev => ({ ...prev, totalValue: total }));
  }, [selectedProducts]);

  const handleProductSearch = (e) => {
    const term = e.target.value;
    setProductSearchTerm(term);
    if (term.length > 1) {
      setFilteredProducts(allProducts.filter(p => p.name.toLowerCase().includes(term.toLowerCase()) && !selectedProducts.some(sp => sp.id === p.id)));
    } else {
      setFilteredProducts([]);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    setProductSearchTerm('');
    setFilteredProducts([]);
  };

  const updateSelectedProductQuantity = (productId, quantity) => setSelectedProducts(selectedProducts.map(p => p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p));
  const removeSelectedProduct = (productId) => setSelectedProducts(selectedProducts.filter(p => p.id !== productId));

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'clientId') {
      const selectedClient = clients.find(c => c.id === value);
      setQuote(prev => ({ ...prev, clientId: value, customerName: selectedClient ? selectedClient.name : '' }));
    } else if (name === 'customerNameInput') {
      setQuote(prev => ({...prev, customerName: value, clientId: ''}));
    } else {
      setQuote(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleToggleNewCustomer = () => {
    setIsNewCustomer(prev => !prev);
    setQuote(prev => ({ ...prev, clientId: '', customerName: '' }));
  };

  const handleGeneratePdf = () => {
    const doc = new jsPDF();
    const customer = isNewCustomer ? { name: quote.customerName } : clients.find(c => c.id === quote.clientId);

    doc.setFontSize(20);
    doc.text(settings.companyName || "Estampa Fina", 14, 22);
    doc.setFontSize(12);
    doc.text("Orçamento", 190, 22, { align: 'right' });
    
    doc.setFontSize(10);
    doc.text(`Cliente: ${customer?.name || 'N/A'}`, 14, 40);
    doc.text(`Email: ${customer?.email || 'N/A'}`, 14, 45);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 190, 40, { align: 'right' });

    const tableData = selectedProducts.map(p => [
      p.name, p.quantity,
      (p.salePrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      (p.salePrice * p.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]);

    // CORREÇÃO: Chama a função autoTable diretamente
    autoTable(doc, {
      head: [['Produto', 'Quantidade', 'Preço Unit.', 'Subtotal']],
      body: tableData,
      startY: 55,
    });
    
    const finalY = doc.lastAutoTable.finalY;
    doc.setFontSize(14);
    doc.text("Valor Total:", 150, finalY + 15, { align: 'right' });
    doc.text(quote.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 190, finalY + 15, { align: 'right' });

    doc.save(`orcamento-${quote.customerName.replace(/\s/g, '_') || 'cliente'}.pdf`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quote.customerName) {
        alert("O nome do cliente é obrigatório.");
        return;
    }
    setIsSubmitting(true);
    
    const quoteData = { ...quote, items: selectedProducts, updatedAt: serverTimestamp() };
    try {
      if (isEditing) {
        await updateDoc(doc(db, 'quotes', id), quoteData);
      } else {
        quoteData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'quotes'), quoteData);
      }
      navigate('/orcamentos');
    } catch (error) {
      console.error("Erro ao salvar orçamento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <p>A carregar formulário...</p>;

  return (
    <>
      <form className="form-container large" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>{isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}</h3>
          <div className="form-group-inline">
            <label>Cliente não cadastrado?</label>
            <input type="checkbox" checked={isNewCustomer} onChange={handleToggleNewCustomer} disabled={isEditing} />
          </div>

          <div className="form-group">
            <label htmlFor="clientId">Cliente</label>
            {isNewCustomer ? (
              <input type="text" id="customerNameInput" name="customerNameInput" placeholder="Digite o nome do cliente" value={quote.customerName} onChange={handleChange} required disabled={isEditing} />
            ) : (
              <select id="clientId" name="clientId" value={quote.clientId} onChange={handleChange} required disabled={isEditing}>
                <option value="">Selecione um cliente</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="form-section">
            <h3>Produtos do Orçamento</h3>
            <div className="form-group">
                <label htmlFor="productSearch">Adicionar Produto</label>
                <div className="product-search-container">
                    <input type="text" id="productSearch" placeholder="Digite para buscar..." value={productSearchTerm} onChange={handleProductSearch}/>
                    {filteredProducts.length > 0 && (
                        <ul className="product-suggestions-list">{filteredProducts.map(p => (<li key={p.id} onClick={() => handleSelectProduct(p)}>{p.name}</li>))}</ul>
                    )}
                </div>
            </div>

            {selectedProducts.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead><tr><th>Produto</th><th>Qtd.</th><th>Preço</th><th>Subtotal</th><th>Ação</th></tr></thead>
                        <tbody>{selectedProducts.map(p => (<tr key={p.id}><td>{p.name}</td><td><input type="number" className="quantity-input" min="1" value={p.quantity} onChange={(e) => updateSelectedProductQuantity(p.id, parseInt(e.target.value))} /></td><td>{(p.salePrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{(p.salePrice * p.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td><button type="button" className="remove-item-btn" onClick={() => removeSelectedProduct(p.id)}><FiX /></button></td></tr>))}</tbody>
                    </table>
                </div>
            )}
            <div className="total-value-section"><strong>Valor Total:</strong><span>{quote.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
        </div>

        <div className="form-actions">
          <button type="button" className="form-button secondary" onClick={() => navigate('/orcamentos')}>Cancelar</button>
          <button type="button" className="form-button" onClick={handleGeneratePdf} disabled={selectedProducts.length === 0}>Gerar PDF</button>
          <button type="submit" className="form-button" disabled={isSubmitting}>{isSubmitting ? 'A Guardar...' : 'Guardar Orçamento'}</button>
        </div>
      </form>
    </>
  );
};

export default OrcamentoFormPage;

