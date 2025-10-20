import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from 'firebase/auth';
import './FormPages.css'; // Usaremos um CSS genérico para formulários

const PerfilPage = () => {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (currentUser.displayName === displayName) {
      return; // Nenhuma alteração feita
    }

    try {
      await updateProfile(currentUser, { displayName });
      setMessage('Perfil atualizado com sucesso!');
    } catch (err) {
      setError('Não foi possível atualizar o perfil.');
      console.error(err);
    }
  };

  return (
    <>
      <h2 className="dashboard-title">Meu Perfil</h2>
      <div className="form-container">
        <form onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={currentUser?.email || ''}
              disabled // O email não pode ser alterado por aqui
            />
          </div>
          <div className="form-group">
            <label htmlFor="displayName">Nome Completo</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>
          
          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="form-button">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </>
  );
};

export default PerfilPage;
