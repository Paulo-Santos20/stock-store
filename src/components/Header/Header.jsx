import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { FiBell, FiSearch, FiUser, FiSettings, FiLogOut, FiChevronDown } from 'react-icons/fi';
import './Header.css';

// Componente para um item de notificação individual e interativo
const NotificationItem = ({ notification }) => {
  const markAsRead = async (id) => {
    // Apenas marca como lida se não estiver lida
    if (!notification.read) {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, { read: true });
    }
  };

  return (
    <Link to={notification.ctaLink || '/alertas'} className={`notification-item ${!notification.read ? 'unread' : ''}`} onClick={() => markAsRead(notification.id)}>
      <p className="notification-message">{notification.message}</p>
      <span className="notification-time">{notification.timestamp?.toDate().toLocaleTimeString('pt-BR')}</span>
    </Link>
  );
};

const Header = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Listener em tempo real que "ouve" a coleção de notificações no Firestore
  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe(); // Limpa o listener ao sair
  }, []);

  // Gera o título da página dinamicamente com base na rota atual
  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/produtos')) return 'Produtos';
    if (path.startsWith('/categorias')) return 'Categorias';
    if (path.startsWith('/clientes')) return 'Clientes';
    if (path.startsWith('/vendas')) return 'Vendas';
    if (path.startsWith('/orcamentos')) return 'Orçamentos';
    if (path.startsWith('/alertas')) return 'Alertas';
    if (path.startsWith('/perfil')) return 'Meu Perfil';
    if (path.startsWith('/configuracoes')) return 'Configurações';
    return 'Estampa Fina';
  }, [location.pathname]);

  // Navega para a página de pesquisa ao submeter o formulário
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${searchQuery.trim()}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="page-title">{pageTitle}</h1>
        
        <div className="header-center">
          <form onSubmit={handleSearch} className="search-bar-container">
            <FiSearch className="search-icon" />
            <input type="text" className="search-input" placeholder="Pesquisar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </form>
          <button className="attendance-mode-button">Modo de Atendimento</button>
        </div>

        <div className="header-right-section">
          <div className="header-actions">
            {/* Ícone de Notificações */}
            <div className="notification-bell" onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}>
              <FiBell size={24} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </div>

            {/* Menu do Utilizador */}
            <div className="user-menu" onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}>
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Foto do utilizador" className="user-avatar" />
              ) : (
                <div className="default-avatar"><FiUser size={22} /></div>
              )}
              <FiChevronDown size={16} />
            </div>

            {/* Dropdown de Notificações */}
            {showNotifications && (
              <div className="dropdown-menu notifications-dropdown">
                <div className="dropdown-header"><h3>Notificações</h3></div>
                <div className="notifications-list">
                  {notifications.length > 0 ? (
                    notifications.map(note => <NotificationItem key={note.id} notification={note} />)
                  ) : <p className="no-notifications">Nenhuma notificação.</p>}
                </div>
              </div>
            )}

            {/* Dropdown do Utilizador */}
            {showUserMenu && (
              <div className="dropdown-menu user-dropdown">
                <div className="dropdown-header">
                  <h3>{currentUser?.displayName || 'Utilizador'}</h3>
                  <p>{currentUser?.email}</p>
                </div>
                <ul className="dropdown-list">
                  <li><Link to="/perfil" className="dropdown-item"><FiUser /><span>Meu Perfil</span></Link></li>
                  <li><Link to="/configuracoes" className="dropdown-item"><FiSettings /><span>Configurações</span></Link></li>
                  <li><div className="dropdown-item" onClick={logout}><FiLogOut /><span>Sair</span></div></li>
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