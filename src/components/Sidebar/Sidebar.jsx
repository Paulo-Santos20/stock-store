import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Ajuste o caminho se necessário
import { FiGrid, FiBox, FiPlusCircle, FiBarChart2, FiLogOut } from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Estampa Fina</h1>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className="nav-link">
          <FiGrid size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/estoque" className="nav-link">
          <FiBox size={20} />
          <span>Estoque</span>
        </NavLink>
        <NavLink to="/produtos/novo" className="nav-link">
          <FiPlusCircle size={20} />
          <span>Adicionar Produto</span>
        </NavLink>
        <NavLink to="/relatorios" className="nav-link">
          <FiBarChart2 size={20} />
          <span>Relatórios</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <button onClick={logout} className="logout-button">
          <FiLogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;