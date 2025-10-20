import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import './FormPages.css';

const CategoriaFormPage = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'categories'), { name, description });
      // Idealmente, navegar para uma página que lista as categorias
      navigate('/'); 
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      alert('Falha ao criar categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <h2 className="dashboard-title">Criar Nova Categoria</h2>
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nome da Categoria</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="description">Descrição</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="4"></textarea>
          </div>
          <div className="form-actions">
            <button type="submit" className="form-button" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Categoria'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CategoriaFormPage;