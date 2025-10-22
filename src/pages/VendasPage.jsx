import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext'; // 1. Importe o hook de autenticação
import { FiPlusCircle, FiSearch, FiEye, FiCheckCircle } from 'react-icons/fi'; // Importe FiCheckCircle
import './VendasPage.css';

// Componente para o 'badge' de status do pedido
const OrderStatusBadge = ({ status }) => {
  const formattedStatus = status?.toLowerCase().replace(/\s+/g, '-') || 'desconhecido';
  const statusClass = `order-status-badge status-${formattedStatus}`;
  return <span className={statusClass}>{status || 'N/A'}</span>;
};

const formatTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
    return timestamp.toDate().toLocaleDateString('pt-BR');
};

// NOVO: Componente Toast
const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`toast toast-${type}`}>
    <FiCheckCircle size={20} />
    <span>{message}</span>
    <button onClick={onClose}>&times;</button>
  </div>
);

const VendasPage = () => {
  const { currentUserData } = useAuth(); // 2. Pega os dados do utilizador logado
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos');
  const [toastMessage, setToastMessage] = useState(''); // NOVO: Estado para o toast

  const isAdmin = currentUserData?.role === 'administrador'; // 3. Verifica se é Admin

  // Busca os pedidos do Firestore
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersQuery = query(collection(db, 'orders'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(ordersQuery);
        const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);
      } catch (error) {
        console.error("Erro ao buscar vendas: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    const orderRef = doc(db, 'orders', orderId);
    try {
      await updateDoc(orderRef, { status: newStatus });
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      // NOVO: Ativa o toast
      setToastMessage('Status alterado com sucesso!');
      setTimeout(() => setToastMessage(''), 3000); // Esconde após 3 segundos
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      alert("Não foi possível alterar o status do pedido.");
    }
  };
  
  // Lógica de filtragem
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = searchTerm === '' ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = activeFilter === 'todos' || 
        order.status.toLowerCase().replace(/\s+/g, '-') === activeFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [orders, searchTerm, activeFilter]);

  if (loading) return <p>A carregar vendas...</p>;

  // Lista de status para os filtros e o <select>
  const statusOptions = [
    { value: 'aguardando-pagamento', label: 'Aguardando Pagamento' },
    { value: 'solicitado', label: 'Solicitado' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'concluído', label: 'Concluído' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  return (
    <>
      {/* NOVO: Renderiza o toast se a mensagem existir */}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}

      <div className="page-header">
        <h2 className="dashboard-title">Vendas</h2>
        <Link to="/vendas/novo" className="action-button">
          <FiPlusCircle size={20} />
          Registar Venda
        </Link>
      </div>

      {/* Painel de Filtragem */}
      <div className="filter-panel">
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Pesquisar por nome do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button onClick={() => setActiveFilter('todos')} className={activeFilter === 'todos' ? 'active' : ''}>Todos</button>
          {statusOptions.map(opt => (
             <button 
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)} 
                className={activeFilter === opt.value ? 'active' : ''}
             >
               {opt.label}s
             </button>
          ))}
        </div>
      </div>

      {/* Listagem de Vendas */}
      <div className="data-section">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Data</th>
                <th>Valor Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => {
                  // 4. Lógica de permissão de edição
                  const isFinalStatus = order.status === 'Concluído' || order.status === 'Cancelado';
                  const canEditStatus = isAdmin || !isFinalStatus; // Admin pode sempre editar

                  return (
                    <tr key={order.id}>
                      <td className="order-customer-cell">{order.customerName}</td>
                      <td>{formatTimestamp(order.date)}</td>
                      <td>{(order.totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>
                        {/* 5. Aplica a nova lógica de permissão */}
                        {canEditStatus ? (
                          <select 
                            className="status-select" 
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          >
                            {statusOptions.map(opt => (
                              <option key={opt.value} value={opt.label}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <OrderStatusBadge status={order.status} />
                        )}
                      </td>
                      <td className="actions-cell">
                        <Link to={`/vendas/detalhes/${order.id}`}>
                          <button title="Ver Detalhes"><FiEye size={18} /></button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    Nenhuma venda encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default VendasPage;