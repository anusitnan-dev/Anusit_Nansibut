import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAdF9ZAs8IdCqgU5maKstrrV-WXtzpDvnw",
  authDomain: "alertprojact.firebaseapp.com",
  projectId: "alertprojact",
  storageBucket: "alertprojact.firebasestorage.app",
  messagingSenderId: "519581262322",
  appId: "1:519581262322:web:58966eea21dfb024540b6b",
  measurementId: "G-N3LZQNBWCM"
};

// ป้องกันการ Initialize ซ้ำตอน Reload โค้ด
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ตั้งค่าให้จำ Session ล็อกอินค้างไว้ใน AsyncStorage บนเครื่อง Android
export const auth = getApps().length === 1
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    })
  : getAuth(app);