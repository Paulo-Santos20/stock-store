import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { FiBell, FiSearch, FiUser, FiSettings, FiLogOut, FiChevronDown } from 'react-icons/fi';
import './Header.css';

// ... Componente NotificationItem (sem alterações) ...
const NotificationItem = ({ notification }) => (
  <div className={`notification-item ${!notification.read ? 'unread' : ''}`}>
    <p className="notification-message">{notification.message}</p>
    <span className="notification-time">{notification.timestamp?.toDate().toLocaleTimeString('pt-BR')}</span>
  </div>
);


const Header = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Listener em tempo real para as notificações
  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Lógica para o título dinâmico da página
  const pageTitle = useMemo(() => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/estoque': return 'Estoque';
      case '/produtos/novo': return 'Novo Produto';
      case '/perfil': return 'Meu Perfil';
      case '/configuracoes': return 'Configurações';
      default:
        if (location.pathname.startsWith('/produtos/editar')) return 'Editar Produto';
        return 'Estampa Fina';
    }
  }, [location.pathname]);
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Em uma app real, aqui você faria a busca no backend/Algolia
      // Por enquanto, vamos navegar para uma página de resultados
      navigate(`/pesquisa?q=${searchQuery.trim()}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="page-title">{pageTitle}</h1>

        <div className="header-right-section">
          {/* Barra de Pesquisa */}
          <form onSubmit={handleSearch} className="search-bar-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Pesquisar produtos, clientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Ações (Notificações e Usuário) */}
          <div className="header-actions">
            <div className="notification-bell" onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}>
              <FiBell size={24} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </div>

            <div className="user-menu" onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}>
              {/* Idealmente, aqui viria a foto do usuário */}
              <FiUser size={26} />
              <FiChevronDown size={16} />
            </div>

            {/* Dropdown de Notificações */}
            {showNotifications && (
              <div className="dropdown-menu">
                <div className="dropdown-header"><h3>Notificações</h3></div>
                <div className="notifications-list">
                  {notifications.length > 0 ? (
                    notifications.map(note => <NotificationItem key={note.id} notification={note} />)
                  ) : (
                    <p className="no-notifications">Nenhuma notificação encontrada.</p>
                  )}
                </div>
              </div>
            )}

            {/* Dropdown do Usuário */}
            {showUserMenu && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <h3>{currentUser?.displayName || currentUser?.email}</h3>
                  <p>{currentUser?.email}</p>
                </div>
                <ul className="dropdown-list">
                  <li><Link to="/perfil" className="dropdown-item"><FiUser /><span>Meu Perfil</span></Link></li>
                  <li><Link to="/configuracoes" className="dropdown-item"><FiSettings /><span>Configurações</span></Link></li>
                  <li>
                    <div className="dropdown-item" onClick={logout}>
                      <FiLogOut /><button>Sair</button>
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;