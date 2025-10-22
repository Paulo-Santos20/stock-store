import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import './MeusPedidosPage.css'; // CSS específico

// Componente para o 'badge' de status do pedido (reutilizado de VendasPage)
const OrderStatusBadge = ({ status }) => {
  const formattedStatus = status?.toLowerCase().replace(/\s+/g, '-') || 'desconhecido';
  const statusClass = `order-status-badge status-${formattedStatus}`;
  return <span className={statusClass}>{status || 'N/A'}</span>;
};

// Função para formatar Timestamp
const formatTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
    return timestamp.toDate().toLocaleDateString('pt-BR');
};

const MeusPedidosPage = () => {
  const { currentUser } = useAuth(); // Usamos currentUser para obter o UID
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyOrders = async () => {
      if (currentUser) {
        try {
          // Busca pedidos onde o 'clientId' é igual ao UID do utilizador logado
          const q = query(
            collection(db, 'orders'),
            where('clientId', '==', currentUser.uid),
            orderBy('date', 'desc') // Ordena pelos mais recentes
          );
          const querySnapshot = await getDocs(q);
          const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setOrders(ordersData);
        } catch (error) {
          console.error("Erro ao buscar meus pedidos: ", error);
          // Verificar se o erro é de índice e informar o utilizador/admin se necessário
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false); // Se não há utilizador, termina o loading
      }
    };
    fetchMyOrders();
  }, [currentUser]); // Depende do currentUser estar carregado

  if (loading) return <p className="loading-fullscreen">A carregar os seus pedidos...</p>;

  return (
    <div className="meus-pedidos-page">
      <header className="meus-pedidos-header">
        <h1>Meus Pedidos</h1>
        {/* Adicionar botão de logout ou link para perfil se necessário */}
      </header>
      <main className="meus-pedidos-main">
        {orders.length > 0 ? (
          <div className="data-section">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Valor Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td>{formatTimestamp(order.date)}</td>
                      <td>{(order.totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td><OrderStatusBadge status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p>Você ainda não realizou nenhum pedido.</p>
        )}
      </main>
    </div>
  );
};

export default MeusPedidosPage;
