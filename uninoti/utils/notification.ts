import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 🌐 เปลี่ยนเป็น URL ของ Render 
//const API_BASE_URL = 'you render';
//เวอร์ชัน Local IP (เปิดไว้สำหรับการนำเสนอสดผ่าน Expo)
const API_BASE_URL = '*********';

// ตั้งค่าให้แสดง แจ้งเตือน/มีเสียง แม้ผู้ใช้เปิดแอปอยู่
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(userEmail: string) {
  if (!Device.isDevice) {
    console.log('⚠️ Push Notification ต้องทดสอบบนเครื่องจริงเท่านั้น (Emulator ไม่รองรับ)');
    return;
  }

  // ขออนุญาตส่งแจ้งเตือน
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('❌ ผู้ใช้ปฏิเสธการรับแจ้งเตือน');
    return;
  }

  // 🟢 ตั้งค่า Notification Channel สำหรับ Android (จำเป็นมากเพื่อให้มีเสียงและป๊อปอัป)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    // ดึง Expo Push Token
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;

    // 🟢 เปลี่ยนจาก Hardcode IP เป็นตัวแปร API_BASE_URL
    await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, push_token: pushToken }),
    });

    console.log('✅ บันทึก Push Token สำเร็จ:', pushToken);
  } catch (error) {
    console.error('❌ ดึงหรือบันทึก Push Token ล้มเหลว:', error);
  }
}
