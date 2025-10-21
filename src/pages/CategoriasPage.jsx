import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FiEdit, FiPlusCircle, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi';
import './CategoriasPage.css';

const formatTimestamp = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
  return timestamp.toDate().toLocaleDateString('pt-BR');
};

const CategoriasPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const categoryRef = doc(db, 'categories', id);
    try {
      await updateDoc(categoryRef, { isActive: !currentStatus });
      setCategories(categories.map(c => c.id === id ? { ...c, isActive: !currentStatus } : c));
    } catch (error) {
      console.error("Erro ao alterar status da categoria:", error);
      alert('Falha ao alterar o status da categoria.');
    }
  };

  // NOVA FUNÇÃO: Excluir a categoria permanentemente
  const handleDelete = async (id) => {
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
        <Link to="/categorias/novo" className="action-button">
          <FiPlusCircle size={20} />
          Criar Nova Categoria
        </Link>
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
                <th>Ações</th>
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
                    <td className="actions-cell">
                      <Link to={`/categorias/editar/${category.id}`}>
                        <button title="Editar"><FiEdit size={18} /></button>
                      </Link>
                      <button title={category.isActive ? "Desativar" : "Ativar"} onClick={() => handleToggleActive(category.id, category.isActive)}>
                        {category.isActive ? <FiToggleRight size={22} color="green" /> : <FiToggleLeft size={22} />}
                      </button>
                      {/* NOVO BOTÃO: Excluir */}
                      <button title="Excluir" onClick={() => handleDelete(category.id)}>
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
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