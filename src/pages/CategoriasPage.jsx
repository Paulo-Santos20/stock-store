import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext'; // Importe o hook de autenticação
import { FiEdit, FiPlusCircle, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi';
import './CategoriasPage.css';

const formatTimestamp = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
  return timestamp.toDate().toLocaleDateString('pt-BR');
};

const CategoriasPage = () => {
  const { currentUserData } = useAuth(); // Pega os dados do utilizador logado
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define as permissões
  const canAdd = currentUserData?.role === 'administrador' || currentUserData?.role === 'gerente' || currentUserData?.role === 'operador';
  const canEdit = canAdd;
  const canDelete = currentUserData?.role === 'administrador' || currentUserData?.role === 'gerente';
  const canToggle = canEdit; // Assume que quem edita pode ativar/desativar

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategories(categoriesData);
      } catch (error) {
        console.error("Erro ao buscar categorias: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleToggleActive = async (id, currentStatus) => {
    if (!canToggle) return alert("Sem permissão.");
    const categoryRef = doc(db, 'categories', id);
    try {
      await updateDoc(categoryRef, { isActive: !currentStatus });
      setCategories(categories.map(c => c.id === id ? { ...c, isActive: !currentStatus } : c));
    } catch (error) {
      console.error("Erro ao alterar status da categoria:", error);
      alert('Falha ao alterar o status da categoria.');
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) return alert("Sem permissão.");
    if (window.confirm('Tem a certeza que deseja excluir esta categoria? Esta ação é irreversível.')) {
      try {
        await deleteDoc(doc(db, 'categories', id));
        setCategories(categories.filter(c => c.id !== id));
      } catch (error) {
        console.error("Erro ao eliminar categoria:", error);
        alert('Falha ao excluir a categoria.');
      }
    }
  };

  if (loading) return <p>A carregar categorias...</p>;

  return (
    <>
      <div className="page-header">
        <h2 className="dashboard-title">Categorias</h2>
        {canAdd && (
          <Link to="/categorias/novo" className="action-button">
            <FiPlusCircle size={20} />
            Criar Nova Categoria
          </Link>
        )}
      </div>

      <div className="data-section">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome da Categoria</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Criado em</th>
                {(canEdit || canDelete || canToggle) && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {categories.length > 0 ? (
                categories.map(category => (
                  <tr key={category.id}>
                    <td className="category-name-cell">{category.name}</td>
                    <td>{category.slug || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${category.isActive ? 'status-active' : 'status-inactive'}`}>
                        {category.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td>{formatTimestamp(category.createdAt)}</td>
                    {(canEdit || canDelete || canToggle) && (
                      <td className="actions-cell">
                        {canEdit && (
                          <Link to={`/categorias/editar/${category.id}`}>
                            <button title="Editar"><FiEdit size={18} /></button>
                          </Link>
                        )}
                        {canToggle && (
                          <button title={category.isActive ? "Desativar" : "Ativar"} onClick={() => handleToggleActive(category.id, category.isActive)}>
                            {category.isActive ? <FiToggleRight size={22} color="green" /> : <FiToggleLeft size={22} />}
                          </button>
                        )}
                        {canDelete && (
                          <button title="Excluir" onClick={() => handleDelete(category.id)}>
                            <FiTrash2 size={18} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={(canEdit || canDelete || canToggle) ? 5 : 4} style={{ textAlign: 'center', padding: '40px' }}>
                    Nenhuma categoria encontrada.
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

export default CategoriasPage;

