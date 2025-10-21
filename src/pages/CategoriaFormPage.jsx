import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './FormPages.css';

const formatTimestamp = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
  return timestamp.toDate().toLocaleString('pt-BR');
};

const generateSlug = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/ /g, '-') // substitui espaços por hífens
    .replace(/[^\w-]+/g, ''); // remove caracteres especiais
};

const CategoriaFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [category, setCategory] = useState({
    name: '',
    description: '',
    slug: '',
    isActive: true,
    createdAt: null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  // Efeito para gerar o slug automaticamente a partir do nome
  useEffect(() => {
    setCategory(prev => ({ ...prev, slug: generateSlug(prev.name) }));
  }, [category.name]);

  // Efeito para buscar os dados da categoria ao editar
  useEffect(() => {
    if (isEditing) {
      const fetchCategory = async () => {
        try {
          const docRef = doc(db, 'categories', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCategory({ id: docSnap.id, ...docSnap.data() });
          } else {
            console.error("Categoria não encontrada!");
            navigate('/categorias');
          }
        } catch (error) {
          console.error("Erro ao buscar categoria:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchCategory();
    }
  }, [id, isEditing, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCategory(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category.name) {
      alert('O nome da categoria é obrigatório.');
      return;
    }
    setIsSubmitting(true);
    
    // Prepara os dados para salvar, removendo o ID do objeto
    const { id: categoryId, ...categoryData } = category;
    categoryData.updatedAt = serverTimestamp();

    try {
      if (isEditing) {
        // No modo de edição, não alteramos o status 'isActive' nem o 'createdAt'
        const { isActive, createdAt, ...updateData } = categoryData;
        const docRef = doc(db, 'categories', id);
        await updateDoc(docRef, updateData);
      } else {
        // No modo de criação, definimos o status inicial e a data de criação
        categoryData.createdAt = serverTimestamp();
        categoryData.isActive = true; // Categorias novas são sempre ativas
        await addDoc(collection(db, 'categories'), categoryData);
      }
      navigate('/categorias');
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      alert('Falha ao salvar a categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isEditing && loading) return <p>A carregar categoria...</p>;

  return (
    <>
      <form className="form-container" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</h3>
          
          <div className="form-group">
            <label htmlFor="name">Nome da Categoria</label>
            <input type="text" id="name" name="name" value={category.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="slug">Slug (URL)</label>
            <input type="text" id="slug" name="slug" value={category.slug} onChange={handleChange} readOnly disabled />
          </div>

          <div className="form-group">
            <label htmlFor="description">Descrição (Opcional)</label>
            <textarea id="description" name="description" value={category.description} onChange={handleChange} rows="4"></textarea>
          </div>

          {isEditing && (
            <div className="form-grid-info">
              <div className="form-group">
                <label>Status</label>
                <input type="text" value={category.isActive ? 'Ativa' : 'Inativa'} disabled />
              </div>
              <div className="form-group">
                <label>Criado em</label>
                <input type="text" value={formatTimestamp(category.createdAt)} disabled />
              </div>
            </div>
          )}

        </div>
        <div className="form-actions">
          <button type="button" className="form-button secondary" onClick={() => navigate('/categorias')}>Cancelar</button>
          <button type="submit" className="form-button" disabled={isSubmitting}>
            {isSubmitting ? 'A Guardar...' : (isEditing ? 'Guardar Alterações' : 'Guardar Categoria')}
          </button>
        </div>
      </form>
    </>
  );
};

export default CategoriaFormPage;

