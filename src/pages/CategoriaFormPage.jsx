import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext'; // Importe o hook de autenticação
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
  const { currentUserData } = useAuth(); // Pega os dados do utilizador logado
  const isEditing = Boolean(id);

  const [category, setCategory] = useState({
    name: '',
    description: '',
    slug: '',
    isActive: true,
    createdAt: null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing); // Só carrega se estiver editando
  const [hasPermission, setHasPermission] = useState(false); // Estado para controlar permissão

  // Verifica a permissão de acesso à página
  useEffect(() => {
    // Apenas Admin, Gerente e Operador podem criar/editar categorias
    const canAccess = currentUserData?.role === 'administrador' || 
                      currentUserData?.role === 'gerente' || 
                      currentUserData?.role === 'operador';
    
    if (!canAccess && currentUserData) { // Evita alerta inicial
      alert("Você não tem permissão para aceder a esta página.");
      navigate('/'); // Redireciona para o Dashboard
    } else if (canAccess) {
        setHasPermission(true); // Permite a renderização
        // Se não estiver editando, define loading como false imediatamente
        if (!isEditing) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserData, navigate]);

  // Efeito para gerar o slug automaticamente a partir do nome
  useEffect(() => {
    // Só executa se tiver permissão
    if (!hasPermission) return;
    setCategory(prev => ({ ...prev, slug: generateSlug(prev.name) }));
  }, [category.name, hasPermission]);

  // Efeito para buscar os dados da categoria ao editar
  useEffect(() => {
    // Só executa se tiver permissão e estiver no modo de edição
    if (!hasPermission || !isEditing) return;

    const fetchCategory = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'categories', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          // Garante que o estado tenha todos os campos esperados
          const data = docSnap.data();
          setCategory({
              id: docSnap.id,
              name: data.name || '',
              description: data.description || '',
              slug: data.slug || generateSlug(data.name || ''),
              isActive: data.isActive !== undefined ? data.isActive : true,
              createdAt: data.createdAt || null,
          });
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
  }, [id, isEditing, navigate, hasPermission]); // Adiciona hasPermission

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCategory(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasPermission) return; // Segurança extra
    if (!category.name) {
      alert('O nome da categoria é obrigatório.');
      return;
    }
    setIsSubmitting(true);
    
    // Prepara os dados para salvar
    const { id: categoryId, isActive, createdAt, ...categoryData } = category; // Não salva isActive nem createdAt via formulário
    categoryData.updatedAt = serverTimestamp();

    try {
      if (isEditing) {
        const docRef = doc(db, 'categories', id);
        await updateDoc(docRef, categoryData);
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
  
  // Se não tem permissão ou ainda está a carregar
  if (!hasPermission || loading) return <p>A verificar permissão e carregar dados...</p>;

  // Renderiza o formulário
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
            <input type="text" id="slug" name="slug" value={category.slug} readOnly disabled />
            <small>Gerado automaticamente a partir do nome.</small>
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

