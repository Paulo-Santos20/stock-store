import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// As suas credenciais do Firebase que você forneceu
const firebaseConfig = {
  apiKey: "AIzaSyCDeDRCNjrEf-tSQRR9lAkxMvvne4IUZ98",
  authDomain: "fina-estampa-gestao.firebaseapp.com",
  projectId: "fina-estampa-gestao",
  storageBucket: "fina-estampa-gestao.firebasestorage.app",
  messagingSenderId: "757558406383",
  appId: "1:757558406383:web:4711167ad63e35a2953f1a",
  measurementId: "G-LM2FZTD7JR",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços do Firebase que vamos usar na aplicação
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);