import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { auth } from '../../firebaseConfig'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut, onAuthStateChanged } from 'firebase/auth';
import { router } from 'expo-router';

//  ดึงฟังก์ชันแจ้งเตือนกลางมาใช้งาน
import { registerForPushNotificationsAsync } from '../../utils/notification';

export default function Index() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  //  1. ระบบ Auto-Login: เช็กว่ามี Session ล็อกอินค้างไว้หรือไม่
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        const cleanEmail = user.email?.toLowerCase() || '';
        await registerForPushNotificationsAsync(cleanEmail);
        router.replace({
          pathname: '/Home',
          params: { email: user.email?.toLowerCase() }
        });
      } else {
        setIsCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วนครับ');
      return;
    }

    if (!cleanEmail.endsWith('@ku.th') && !cleanEmail.endsWith('@csc.ku.ac.th')) {
      Alert.alert('แจ้งเตือน', 'กรุณาใช้อีเมล ku.th ด้วย!');
      return;
    }

    setIsLoading(true);

    try {
      // 1. พยายามเข้าสู่ระบบก่อน
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      
      if (userCredential.user.emailVerified) {
        // ล็อกอินสำเร็จและยืนยันเมลแล้ว
        await registerForPushNotificationsAsync(cleanEmail);
        router.replace({ pathname: '/Home', params: { email: cleanEmail } });
      } else {
        await signOut(auth);
        Alert.alert('แจ้งเตือน', 'กรุณายืนยันอีเมลในกล่องจดหมายก่อนเข้าใช้งานครับ');
      }
    } catch (error: any) {
      // 2. ถ้าล็อกอินไม่ผ่าน (ไม่มีบัญชี หรือ รหัสผิด)
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        try {
          // 3. ระบบพยายามสมัครสมาชิกให้ใหม่โดยอัตโนมัติ
          const newUser = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          await sendEmailVerification(newUser.user);
          await signOut(auth);
          Alert.alert('ลงทะเบียนสำเร็จ', 'ระบบได้สร้างบัญชีใหม่ให้คุณแล้ว กรุณาไปกดยืนยันตัวตนในอีเมลก่อนเข้าใช้งานครับ');
        } catch (regError: any) {
          // 4. ถ้าสมัครไม่ได้เพราะ "มีอีเมลนี้ในระบบแล้ว" แสดงว่าตอนแรกล็อกอินไม่ผ่านเพราะ "รหัสผ่านผิด"
          if (regError.code === 'auth/email-already-in-use') {
            Alert.alert('ข้อผิดพลาด', 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้งครับ');
          } else {
            Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างบัญชี: ' + regError.message);
          }
        }
      } else {
        Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const registerNewUser = async (cleanEmail: string, pass: string) => {
    try {
      const newUser = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      await sendEmailVerification(newUser.user);
      await signOut(auth);
      Alert.alert('สำเร็จ', 'ระบบได้ส่งลิงก์ยืนยันตัวตนไปที่ Gmail ของท่านแล้ว กรุณากดยืนยันก่อนเข้าสู่ระบบครับ');
    } catch (err: any) {
      Alert.alert('ข้อผิดพลาด', err.message);
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0F9B58" />
        <Text style={{ marginTop: 12, color: '#666', fontSize: 16 }}>กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/LOGO_UniNot2.png')} 
        style={styles.logo} 
      />

      <Text style={styles.title}>เข้าสู่ระบบ (นิสิต)</Text>
      
      <TextInput
        style={styles.input}
        placeholder="อีเมลมหาวิทยาลัย (@ku.th)"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="รหัสผ่าน"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={[styles.button, isLoading && { backgroundColor: '#81C784' }]} 
        onPress={handleLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ / ยืนยันตัวตน'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#ffffff' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 20, resizeMode: 'contain' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#0F9B58' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', padding: 15, marginBottom: 20, borderRadius: 12, backgroundColor: '#f9f9f9', fontSize: 16, color: '#333' },
  button: { backgroundColor: '#0F9B58', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#0F9B58', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});