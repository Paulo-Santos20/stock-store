import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // Estado para saber se a verificação inicial terminou

  useEffect(() => {
    // onAuthStateChanged é um listener que observa mudanças no estado de login
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); // Define o usuário (ou null se deslogado)
      setLoading(false); // Marca que a verificação terminou
    });

    // Função de limpeza para remover o listener quando o componente desmontar
    return unsubscribe;
  }, []);

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser, // Converte o objeto do usuário em um booleano
    logout,
  };

  // Não renderiza a aplicação até que a verificação inicial do Firebase termine
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};