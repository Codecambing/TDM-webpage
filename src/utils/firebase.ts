import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Exportar funciones de Firestore para usar en el cliente
export { doc, setDoc, getDoc, onSnapshot, collection, addDoc, deleteDoc, query, getDocs } from 'firebase/firestore';