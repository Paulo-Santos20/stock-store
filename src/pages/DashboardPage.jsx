import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FiUsers, FiShoppingCart, FiDollarSign, FiArchive, FiEdit, FiToggleLeft, FiToggleRight, FiPlusCircle } from 'react-icons/fi';
import './DashboardPage.css';

// --- Componentes Reutilizáveis ---
const MetricCard = ({ title, value, icon, color }) => (
  <div className="metric-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3>{title}</h3>
        <p style={{ color }}>{value}</p>
      </div>
      {icon}
    </div>
  </div>
);

const formatTimestamp = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
  return timestamp.toDate().toLocaleDateString('pt-BR');
};


// --- Componente Principal do Dashboard ---
const DashboardPage = () => {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsQuery = getDocs(collection(db, 'products'));
        const usersQuery = getDocs(collection(db, 'users'));
        const ordersQuery = getDocs(query(collection(db, 'orders'), orderBy('date', 'desc')));

        const [productsSnapshot, usersSnapshot, ordersSnapshot] = await Promise.all([productsQuery, usersQuery, ordersQuery]);

        setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setOrders(ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        setError('Falha ao carregar dados. Verifique suas coleções no Firestore e as regras de segurança.');
        console.error("Erro detalhado:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dashboardData = useMemo(() => {
    const now = new Date();
    const startOfMonth = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));

    const monthlyRevenue = orders
      .filter(order => order.date >= startOfMonth && order.status === 'Concluído')
      .reduce((sum, order) => sum + order.totalValue, 0);

    const pendingOrders = orders.filter(order => order.status === 'Pendente').length;
    const recentOrders = orders.slice(0, 5);

    const salesLast7Days = Array(7).fill(0).map((_, i) => {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const total = orders
        .filter(order => order.date.toDate().toDateString() === day.toDateString() && order.status === 'Concluído')
        .reduce((sum, order) => sum + order.totalValue, 0);
      return { name: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), Vendas: total };
    }).reverse();
    
    const newCustomers = users.filter(user => user.createdAt >= startOfMonth).length;
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    const roleChartData = Object.entries(roleCounts).map(([name, value]) => ({ name, value }));
    
    return {
      monthlyRevenue, pendingOrders, newCustomers, totalProducts: products.length,
      salesLast7Days, roleChartData, recentOrders,
    };
  }, [users, products, orders]);

  if (loading) return <p>Carregando dashboard...</p>;
  if (error) return <p className="login-error">{error}</p>;

  return (
    <>
      <div className="data-section">
        <h3 className="chart-title">Ações Rápidas</h3>
        <div className="actions-grid">
          <Link to="/produtos/novo" className="action-button"><FiPlusCircle size={20} />Cadastrar Produto</Link>
          <Link to="/categorias/novo" className="action-button"><FiPlusCircle size={20} />Criar Categoria</Link>
        </div>
      </div>

      <h2 className="dashboard-title" style={{ marginTop: '48px' }}>Visão Geral</h2>
      <div className="metrics-grid">
        <MetricCard title="Faturamento Mensal" value={dashboardData.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={<FiDollarSign size={32} color="#2e7d32"/>} color="#2e7d32" />
        <MetricCard title="Novos Clientes (Mês)" value={dashboardData.newCustomers} icon={<FiUsers size={32} color="#1976d2"/>} color="#1976d2" />
        <MetricCard title="Pedidos Pendentes" value={dashboardData.pendingOrders} icon={<FiShoppingCart size={32} color="#ed6c02"/>} color="#ed6c02" />
        <MetricCard title="Total de Produtos" value={dashboardData.totalProducts} icon={<FiArchive size={32} color="#696969"/>} color="#696969" />
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3 className="chart-title">Vendas nos Últimos 7 Dias</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.salesLast7Days}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
              <Legend />
              <Line type="monotone" dataKey="Vendas" stroke="var(--cor-vinho)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h3 className="chart-title">Distribuição de Funções</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={dashboardData.roleChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {dashboardData.roleChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['var(--cor-vinho)', '#696969'][index % 2]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="data-section">
        <h3 className="chart-title">Pedidos Recentes</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Cliente</th><th>Data</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              {dashboardData.recentOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.customerName}</td>
                  <td>{formatTimestamp(order.date)}</td>
                  <td>{order.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td><span className="status-dot" style={{ backgroundColor: order.status === 'Concluído' ? 'green' : (order.status === 'Pendente' ? 'orange' : 'red') }}></span>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="data-section">
        <h3 className="chart-title">Gerenciamento de Usuários</h3>
         <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Nome / Email</th><th>Função</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td><div className="user-info"><span className="name">{user.name}</span><span className="email">{user.email}</span></div></td>
                  <td><span className="role-text">{user.role}</span></td>
                  <td><span className={`status-badge ${user.active ? 'status-active' : 'status-inactive'}`}>{user.active ? 'Ativo' : 'Inativo'}</span></td>
                  <td className="actions-cell">
                    <button title="Editar Usuário"><FiEdit size={18} /></button>
                    <button title="Ativar/Desativar Usuário">{user.active ? <FiToggleRight size={22} color="green" /> : <FiToggleLeft size={22} />}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;