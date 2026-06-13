// Firebase JS SDK init — works in Expo web/managed with zero native config.
// Replace firebaseConfig values with the web-app snippet from:
// Firebase console → Project settings → Your apps → Web app → SDK setup.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB6L53KeveAElwOc5HWmdsY2-HY-_ajX3Q',
  authDomain: 'fanfest-app.firebaseapp.com',
  projectId: 'fanfest-app',
  storageBucket: 'fanfest-app.firebasestorage.app',
  messagingSenderId: '227306006974',
  appId: '1:227306006974:web:4c9f7eb79f68524c3b71ef',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
