import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Email ou senha inválidos.');
      } else {
        setError('Ocorreu um erro ao tentar fazer login.');
      }
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Estampa Fina</h1>
        <h2 className="login-subtitle">Controle de Estoque</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            id="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            id="password"
            type="password"
            placeholder="Senha"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)} // <-- AQUI ESTAVA O ERRO
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-button">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;