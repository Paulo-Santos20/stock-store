import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, query, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FiPlusCircle, FiSearch, FiEdit, FiTrash2 } from 'react-icons/fi';
import './ClientesPage.css';

// Componente para o 'badge' de status do cliente
const ClientStatusBadge = ({ status }) => {
  const statusClass = `client-status-badge status-${status?.toLowerCase()}`;
  return <span className={statusClass}>{status || 'N/A'}</span>;
};

// Função para determinar o status do cliente com base nas regras
const determineClientStatus = (client, orderCount) => {
  if (orderCount > 10) return 'Premium';
  if (orderCount > 5) return 'VIP';

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  if (client.createdAt && typeof client.createdAt.toDate === 'function') {
    if (client.createdAt.toDate() > sevenDaysAgo) {
      return 'Novo';
    }
  }
  
  return 'Regular';
};


const ClientesPage = () => {
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos');

  // Busca os clientes e pedidos do Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsQuery = getDocs(collection(db, 'clients'));
        const ordersQuery = getDocs(collection(db, 'orders'));

        const [clientsSnapshot, ordersSnapshot] = await Promise.all([clientsQuery, ordersQuery]);

        const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const ordersData = ordersSnapshot.docs.map(doc => doc.data());

        setClients(clientsData);
        setOrders(ordersData);

      } catch (error) {
        console.error("Erro ao buscar dados: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja excluir este cliente?')) {
      try {
        await deleteDoc(doc(db, 'clients', id));
        setClients(clients.filter(c => c.id !== id));
      } catch (error) {
        console.error("Erro ao eliminar cliente: ", error);
        alert('Falha ao excluir o cliente.');
      }
    }
  };
  
  // Lógica de processamento e filtragem
  const processedAndFilteredClients = useMemo(() => {
    const processedClients = clients.map(client => {
      const orderCount = orders.filter(order => order.clientId === client.id).length;
      const dynamicStatus = determineClientStatus(client, orderCount);
      return { ...client, status: dynamicStatus };
    });

    return processedClients.filter(client => {
      const matchesSearch = searchTerm === '' ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.phone && client.phone.includes(searchTerm));

      const matchesFilter = activeFilter === 'todos' || 
        client.status.toLowerCase() === activeFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [clients, orders, searchTerm, activeFilter]);

  if (loading) return <p>A carregar clientes...</p>;

  return (
    <>
      <div className="page-header">
        <h2 className="dashboard-title">Clientes</h2>
        <Link to="/clientes/novo" className="action-button">
          <FiPlusCircle size={20} />
          Adicionar Cliente
        </Link>
      </div>

      {/* Painel de Filtragem */}
      <div className="filter-panel">
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button onClick={() => setActiveFilter('todos')} className={activeFilter === 'todos' ? 'active' : ''}>Todos</button>
          <button onClick={() => setActiveFilter('novo')} className={activeFilter === 'novo' ? 'active' : ''}>Novos</button>
          <button onClick={() => setActiveFilter('regular')} className={activeFilter === 'regular' ? 'active' : ''}>Regulares</button>
          <button onClick={() => setActiveFilter('vip')} className={activeFilter === 'vip' ? 'active' : ''}>VIP</button>
          <button onClick={() => setActiveFilter('premium')} className={activeFilter === 'premium' ? 'active' : ''}>Premium</button>
        </div>
      </div>

      {/* Listagem de Clientes */}
      <div className="data-section">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {processedAndFilteredClients.length > 0 ? (
                processedAndFilteredClients.map(client => (
                  <tr key={client.id}>
                    <td className="client-name-cell">{client.name}</td>
                    <td>{client.email}</td>
                    <td>{client.phone || 'N/A'}</td>
                    <td><ClientStatusBadge status={client.status} /></td>
                    <td className="actions-cell">
                      {/* CORREÇÃO: Envolve o botão de edição com um Link */}
                      <Link to={`/clientes/editar/${client.id}`}>
                        <button title="Editar"><FiEdit size={18} /></button>
                      </Link>
                      <button title="Excluir" onClick={() => handleDelete(client.id)}><FiTrash2 size={18} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    Nenhum cliente encontrado com os filtros atuais.
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

export default ClientesPage;