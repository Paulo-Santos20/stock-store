import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { FiGrid, FiBox, FiTag, FiUsers, FiDollarSign, FiFileText, FiBarChart2, FiLogOut, FiAlertTriangle, FiUserCheck } from 'react-icons/fi'; // <-- Importe FiUserCheck
import './Sidebar.css';

const Sidebar = ({ className }) => {
  const { logout } = useAuth();
  const { settings } = useSettings();

  return (
    <aside
      className={`sidebar ${className || ''}`}
      style={{
        '--sidebar-bg-color': settings.primaryColor,
        '--sidebar-title-color': settings.secondaryColor,
        '--sidebar-font-color': settings.tertiaryColor,
      }}
    >
      <div className="sidebar-header">
        <h1 className="sidebar-title">{settings.companyName}</h1>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className="nav-link"><FiGrid size={20} /><span>Dashboard</span></NavLink>
        <NavLink to="/alertas" className="nav-link"><FiAlertTriangle size={20} /><span>Alertas</span></NavLink>
        <NavLink to="/produtos" className="nav-link"><FiBox size={20} /><span>Produtos</span></NavLink>
        <NavLink to="/categorias" className="nav-link"><FiTag size={20} /><span>Categorias</span></NavLink>
        <NavLink to="/clientes" className="nav-link"><FiUsers size={20} /><span>Clientes</span></NavLink>
        <NavLink to="/vendas" className="nav-link"><FiDollarSign size={20} /><span>Vendas</span></NavLink>
        <NavLink to="/orcamentos" className="nav-link"><FiFileText size={20} /><span>Orçamentos</span></NavLink>
        {/* Adicione o novo link para Usuários aqui */}
        <NavLink to="/usuarios" className="nav-link"><FiUserCheck size={20} /><span>Usuários</span></NavLink>
        <NavLink to="/relatorios" className="nav-link"><FiBarChart2 size={20} /><span>Relatórios</span></NavLink>
      </nav>
      <div className="sidebar-footer">
        <button onClick={logout} className="logout-button"><FiLogOut size={20} /><span>Sair</span></button>
      </div>
    </aside>
  );
};

export default Sidebar;

