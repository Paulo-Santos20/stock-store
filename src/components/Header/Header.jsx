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
    // Link leva para o 'ctaLink' da notificação ou para a página de Alertas como fallback
    <Link to={notification.ctaLink || '/alertas'} className={`notification-item ${!notification.read ? 'unread' : ''}`} onClick={() => markAsRead(notification.id)}>
      <p className="notification-message">{notification.message}</p>
      {/* Mostra a hora da notificação formatada */}
      <span className="notification-time">{notification.timestamp?.toDate().toLocaleTimeString('pt-BR')}</span>
    </Link>
  );
};

const Header = () => {
  // Hooks para autenticação, localização e navegação
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Estados para gerir as notificações, menus e pesquisa
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Listener em tempo real que "ouve" a coleção de notificações no Firestore
  useEffect(() => {
    // Cria uma query para buscar as 10 notificações mais recentes, ordenadas por data
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(10));
    // onSnapshot cria um listener que atualiza o estado sempre que houver mudanças na coleção
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    // Limpa o listener quando o componente é desmontado para evitar leaks de memória
    return () => unsubscribe();
  }, []);

  // Gera o título da página dinamicamente com base na rota atual
  const pageTitle = useMemo(() => {
    const path = location.pathname;
    // Mapeamento de rotas para títulos
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/alertas')) return 'Alertas';
    if (path.startsWith('/produtos')) return 'Produtos';
    if (path.startsWith('/categorias')) return 'Categorias';
    if (path.startsWith('/clientes')) return 'Clientes';
    if (path.startsWith('/vendas')) return 'Vendas';
    if (path.startsWith('/orcamentos')) return 'Orçamentos';
    if (path.startsWith('/perfil')) return 'Meu Perfil';
    if (path.startsWith('/configuracoes')) return 'Configurações';
    // Título padrão
    return 'Estampa Fina';
  }, [location.pathname]);

  // Navega para a página de pesquisa ao submeter o formulário
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${searchQuery.trim()}`);
    }
  };

  // Calcula o número de notificações não lidas
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Título da Página (à esquerda) */}
        <h1 className="page-title">{pageTitle}</h1>
        
        {/* Secção Central (Pesquisa e Botão) */}
        <div className="header-center">
          <form onSubmit={handleSearch} className="search-bar-container">
            <FiSearch className="search-icon" />
            <input type="text" className="search-input" placeholder="Pesquisar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </form>
          {/* Link para o Modo de Atendimento */}
          <Link to="/atendimento" className="attendance-mode-button">
            Modo de Atendimento
          </Link>
        </div>

        {/* Secção Direita (Ações) */}
        <div className="header-right-section">
          <div className="header-actions">
            {/* Ícone de Notificações */}
            <div className="notification-bell" onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}>
              <FiBell size={24} />
              {/* Badge com a contagem de notificações não lidas */}
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </div>

            {/* Menu do Utilizador */}
            <div className="user-menu" onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}>
              {/* Mostra a foto do utilizador ou um ícone padrão */}
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Foto do utilizador" className="user-avatar" />
              ) : (
                <div className="default-avatar"><FiUser size={22} /></div>
              )}
              <FiChevronDown size={16} /> {/* Ícone de seta para baixo */}
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
                  <li><Link to="/perfil" className="dropdown-item" onClick={() => setShowUserMenu(false)}><FiUser /><span>Meu Perfil</span></Link></li>
                  <li><Link to="/configuracoes" className="dropdown-item" onClick={() => setShowUserMenu(false)}><FiSettings /><span>Configurações</span></Link></li>
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