import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCQyOiCgzol1rq6kIdHI8tYyFygIA_15bo",
  authDomain: "shishi-shitufi.firebaseapp.com",
  databaseURL: "https://shishi-shitufi-default-rtdb.firebaseio.com",
  projectId: "shishi-shitufi",
  storageBucket: "shishi-shitufi.firebasestorage.app",
  messagingSenderId: "342498860740",
  appId: "1:342498860740:web:9d16f1cc6f732e9003b391",
  measurementId: "G-LGCND1FDTR"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);