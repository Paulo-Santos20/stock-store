import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FiPlusCircle, FiSearch, FiEye, FiEdit } from 'react-icons/fi';
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

const VendasPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos');

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

  return (
    <>
      <div className="page-header">
        <h2 className="dashboard-title">Vendas</h2>
        <Link to="/vendas/novo" className="action-button">
          <FiPlusCircle size={20} />
          Registar Venda
        </Link>
      </div>

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
          <button onClick={() => setActiveFilter('aguardando-pagamento')} className={activeFilter === 'aguardando-pagamento' ? 'active' : ''}>Aguardando Pagamento</button>
          <button onClick={() => setActiveFilter('solicitado')} className={activeFilter === 'solicitado' ? 'active' : ''}>Solicitados</button>
          <button onClick={() => setActiveFilter('enviado')} className={activeFilter === 'enviado' ? 'active' : ''}>Enviados</button>
          <button onClick={() => setActiveFilter('concluído')} className={activeFilter === 'concluído' ? 'active' : ''}>Concluídos</button>
          <button onClick={() => setActiveFilter('cancelado')} className={activeFilter === 'cancelado' ? 'active' : ''}>Cancelados</button>
        </div>
      </div>

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
                filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td className="order-customer-cell">{order.customerName}</td>
                    <td>{formatTimestamp(order.date)}</td>
                    <td>{(order.totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td><OrderStatusBadge status={order.status} /></td>
                    <td className="actions-cell">
                      {/* CORREÇÃO: Link para a página de detalhes da venda */}
                      <Link to={`/vendas/detalhes/${order.id}`}>
                        <button title="Ver Detalhes"><FiEye size={18} /></button>
                      </Link>
                      <Link to={`/vendas/editar/${order.id}`}>
                        <button title="Editar Status"><FiEdit size={18} /></button>
                      </Link>
                    </td>
                  </tr>
                ))
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

