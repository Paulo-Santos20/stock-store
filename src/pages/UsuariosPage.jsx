import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { FiPlusCircle, FiEdit, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import './UsuariosPage.css';

const formatTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
    return timestamp.toDate().toLocaleDateString('pt-BR');
};

const UsuariosPage = () => {
  const { currentUserData } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define permissões
  const canAdd = currentUserData?.role === 'administrador';
  const canEditDetails = currentUserData?.role === 'administrador' || currentUserData?.role === 'gerente';
  const canEditRole = currentUserData?.role === 'administrador'; // Apenas Admin pode mudar roles
  const canToggle = currentUserData?.role === 'administrador';
  const canDelete = currentUserData?.role === 'administrador';

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
      } catch (error) {
        console.error("Erro ao buscar usuários: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleToggleActive = async (id, currentStatus) => {
    if (!canToggle) return alert("Sem permissão para alterar o status.");
    // Impede desativar o próprio utilizador
    if (id === currentUserData?.id) {
        alert("Não pode desativar a sua própria conta.");
        return;
    }
    const userRef = doc(db, 'users', id);
    try {
      await updateDoc(userRef, { active: !currentStatus });
      setUsers(users.map(u => u.id === id ? { ...u, active: !currentStatus } : u));
    } catch (error) {
      console.error("Erro ao alterar status do usuário:", error);
      alert('Falha ao alterar o status.');
    }
  };

  // NOVO: Função para alterar a role diretamente da tabela
  const handleRoleChange = async (id, newRole) => {
      if (!canEditRole) return; // Segurança extra
      // Impede alterar a própria role
      if (id === currentUserData?.id) {
        alert("Não pode alterar a sua própria permissão.");
        // Reverte a mudança visual no select (busca o valor original)
        const originalUser = users.find(u => u.id === id);
        if(originalUser) {
            // Força a re-renderização para o select voltar ao valor original
            setUsers([...users]); 
            // Encontra o elemento select e redefine o valor (alternativa mais complexa)
            // const selectElement = document.getElementById(`role-select-${id}`);
            // if (selectElement) selectElement.value = originalUser.role;
        }
        return;
      }
      const userRef = doc(db, 'users', id);
      try {
          await updateDoc(userRef, { role: newRole });
          setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
          alert("Permissão atualizada com sucesso!");
      } catch (error) {
          console.error("Erro ao alterar permissão:", error);
          alert('Falha ao alterar a permissão.');
      }
  };

  const handleDelete = async (id) => {
    if (!canDelete) return alert("Sem permissão para excluir.");
    if (id === currentUserData?.id) {
        alert("Não pode excluir a sua própria conta.");
        return;
    }
    if (window.confirm('Tem a certeza que deseja excluir este usuário?')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        setUsers(users.filter(u => u.id !== id));
      } catch (error) {
        console.error("Erro ao eliminar usuário:", error);
        alert('Falha ao excluir o usuário.');
      }
    }
  };

  if (loading) return <p>A carregar usuários...</p>;

  return (
    <>
      <div className="page-header">
        <h2 className="dashboard-title">Usuários do Sistema</h2>
        {canAdd && (
          <Link to="/usuarios/novo" className="action-button">
            <FiPlusCircle size={20} /> Adicionar Usuário
          </Link>
        )}
      </div>

      <div className="data-section">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Permissão (Role)</th>
                <th>Status</th>
                <th>Criado em</th>
                {(canEditDetails || canToggle || canDelete) && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id}>
                    <td className="user-name-cell">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      {/* Select para alterar Role (apenas para Admin e não para si mesmo) */}
                      {canEditRole && user.id !== currentUserData?.id ? (
                        <select
                          className="role-select"
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        >
                          <option value="administrador">Administrador</option>
                          <option value="gerente">Gerente</option>
                          <option value="operador">Operador</option>
                          <option value="cliente">Cliente</option>
                        </select>
                      ) : (
                        <span className="role-text">{user.role}</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${user.active ? 'status-active' : 'status-inactive'}`}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>{formatTimestamp(user.createdAt)}</td>
                    {(canEditDetails || canToggle || canDelete) && (
                      <td className="actions-cell">
                        {canEditDetails && (
                          <Link to={`/usuarios/editar/${user.id}`}>
                            <button title="Editar Dados"><FiEdit size={18} /></button>
                          </Link>
                        )}
                        {canToggle && (
                          <button title={user.active ? "Desativar" : "Ativar"} onClick={() => handleToggleActive(user.id, user.active)}>
                            {user.active ? <FiToggleRight size={22} color="green" /> : <FiToggleLeft size={22} />}
                          </button>
                        )}
                        {canDelete && (
                          <button title="Excluir" onClick={() => handleDelete(user.id)}>
                            <FiTrash2 size={18} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={(canEditDetails || canToggle || canDelete) ? 6 : 5} style={{ textAlign: 'center', padding: '40px' }}>
                    Nenhum usuário encontrado.
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

export default UsuariosPage;