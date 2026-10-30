import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:1234567890",
  measurementId: "G-XXXXXXXXXX"
};

// ป้องกันการ Initialize ซ้ำตอน Reload โค้ด
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ตั้งค่าให้จำ Session ล็อกอินค้างไว้ใน AsyncStorage บนเครื่อง Android
export const auth = getApps().length === 1
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    })
  : getAuth(app);
