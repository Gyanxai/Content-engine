import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAC4VVL9DMZe9sypJ5sNxAb5VH6RiaEe0U",
  authDomain: "gx-app-backend.firebaseapp.com",
  projectId: "gx-app-backend",
  storageBucket: "gx-app-backend.firebasestorage.app",
  messagingSenderId: "158755638226",
  appId: "1:158755638226:web:1911d3d0cd9a40190cd60b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
