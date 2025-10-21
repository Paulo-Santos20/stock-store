import React, { createContext, useState, useContext, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const SettingsContext = createContext();

// Configurações padrão para evitar erros caso o Firestore ainda não tenha dados
const defaultSettings = {
  companyName: 'Estampa Fina',
  primaryColor: '#1a1a1a',   // Cor de fundo do Sidebar
  secondaryColor: '#800000', // Cor do título do Sidebar
  tertiaryColor: '#a0a0a0',   // Cor da fonte do Sidebar
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Listener em tempo real que "ouve" as mudanças no documento de configurações do Firestore
  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'main');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        // Se o documento existe, atualiza o estado com os novos dados
        setSettings(prev => ({ ...prev, ...docSnap.data() }));
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar configurações em tempo real:", error);
      setLoading(false);
    });

    // Função de limpeza: para o listener quando o componente não está mais em uso
    return () => unsubscribe();
  }, []);

  // Função para salvar as novas configurações no Firestore
  const updateSettings = async (newSettings) => {
    const settingsDocRef = doc(db, 'settings', 'main');
    // A opção { merge: true } garante que apenas os campos alterados sejam salvos,
    // sem apagar os outros.
    await setDoc(settingsDocRef, newSettings, { merge: true });
  };

  const value = { settings, updateSettings, loading };

  return (
    <SettingsContext.Provider value={value}>
      {!loading && children}
    </SettingsContext.Provider>
  );
};

// Hook customizado para facilitar o uso do contexto em outros componentes
export const useSettings = () => {
  return useContext(SettingsContext);
};

