import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null); // Estado para dados do Firestore (incluindo role)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFirestore = () => {}; // Função para parar o listener do Firestore

    // Listener principal para o estado de autenticação do Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      // Limpa qualquer listener anterior para evitar leaks de memória
      unsubscribeFirestore(); 
      setCurrentUserData(null); // Limpa os dados do utilizador anterior ao deslogar

      if (user) {
        // Se o utilizador está logado, busca os seus dados detalhados do Firestore
        const userDocRef = doc(db, 'users', user.uid);
        
        // Usa onSnapshot para "ouvir" alterações no documento do utilizador em tempo real.
        // Se a role do utilizador for alterada por um admin, a interface refletirá isso.
        unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setCurrentUserData({ id: docSnap.id, ...docSnap.data() });
          } else {
            console.warn("Documento do utilizador não encontrado no Firestore para o UID:", user.uid);
          }
          // Marca o carregamento como completo apenas após tentar buscar os dados do Firestore
          if (loading) setLoading(false); 
        }, (error) => {
           console.error("Erro ao buscar dados do utilizador:", error);
           if (loading) setLoading(false); 
        });

      } else {
        // Se não há utilizador logado, finaliza o carregamento
        if (loading) setLoading(false);
      }
    });

    // Função de limpeza que é chamada quando o componente é desmontado
    return () => {
        unsubscribeAuth();
        unsubscribeFirestore();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // O array de dependências vazio garante que este efeito execute apenas uma vez

  const logout = () => {
    return signOut(auth);
  };

  // Valor a ser partilhado com todos os componentes da aplicação
  const value = {
    currentUser,      // O objeto de autenticação do Firebase (com uid, email, etc.)
    currentUserData,  // O objeto do Firestore (com name, role, etc.)
    isAuthenticated: !!currentUser, // Um booleano para verificações rápidas
    loading,          // Estado de carregamento inicial
    logout,
  };

  // Não renderiza a aplicação (children) até que a verificação inicial de autenticação termine
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook customizado para facilitar o uso do contexto
export const useAuth = () => {
  return useContext(AuthContext);
};