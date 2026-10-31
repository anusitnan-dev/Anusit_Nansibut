import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, FlatList, ScrollView, Platform, StatusBar, TextInput, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native'; 
import { auth } from '../../firebaseConfig'; 
import { signOut } from 'firebase/auth';
import * as Notifications from 'expo-notifications';
//เวอร์ชัน Render (เปิดไว้ตอนเอาไปอธิบายโครงสร้างระบบ / บิลด์ APK)
//const API_BASE_URL = 'you render';
//เวอร์ชัน Local IP (เปิดไว้สำหรับการนำเสนอสดผ่าน Expo)
const API_BASE_URL = 'http:/*********:3000';

const REMINDER_OPTIONS = [
  { label: 'ไม่แจ้งเตือน', value: null }, { label: 'เมื่อถึงเวลากิจกรรม', value: 0 }, { label: 'ล่วงหน้า 15 นาที', value: 15 },
  { label: 'ล่วงหน้า 30 นาที', value: 30 }, { label: 'ล่วงหน้า 1 ชั่วโมง', value: 60 }, { label: 'ล่วงหน้า 1 วัน', value: 1440 },
];

const ACTIVITY_TYPES = [
  { id: 1, name: 'กิจกรรมส่วนตัว' }, { id: 2, name: 'การเรียน / การสอบ' }, { id: 3, name: 'งาน / โปรเจกต์' }, { id: 4, name: 'อื่นๆ' }
];

const DAY_COLORS: { [key: string]: { border: string; bg: string; text: string } } = {
  'จันทร์': { border: '#FBC02D', bg: '#FFFDE7', text: '#F57F17' },
  'อังคาร': { border: '#EC407A', bg: '#FCE4EC', text: '#C2185B' },
  'พุธ': { border: '#4CAF50', bg: '#E8F5E9', text: '#2E7D32' },
  'พฤหัสบดี': { border: '#FB8C00', bg: '#FFF3E0', text: '#E65100' },
  'ศุกร์': { border: '#1E88E5', bg: '#E3F2FD', text: '#1565C0' },
  'เสาร์': { border: '#AB47BC', bg: '#F3E5F5', text: '#7B1FA2' },
  'อาทิตย์': { border: '#E53935', bg: '#FFEBEE', text: '#C62828' }
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets(); 
  
  const { email } = useLocalSearchParams(); 
  const parsedEmail = Array.isArray(email) ? email[0] : email;
  const [userEmail, setUserEmail] = useState(parsedEmail || 'User');

  const [activeTab, setActiveTab] = useState('activity'); 
  const [showProfile, setShowProfile] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  
  const [editForm, setEditForm] = useState<any>({}); 
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const [activities, setActivities] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]); 
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const initialLetter = userEmail ? String(userEmail).charAt(0).toUpperCase() : '?';

  const formatTime = (timeStr: any) => {
    if (!timeStr || typeof timeStr !== 'string') return '--:--';
    return timeStr.includes(':') ? timeStr.substring(0, 5) : timeStr;
  };

  const formatDateString = (dateStr: any) => {
    if (!dateStr || typeof dateStr !== 'string') return 'ไม่ระบุวันที่';
    return dateStr.split('T')[0].split(' ')[0];
  };

  const fetchProfileImage = async () => {
    if (!userEmail || userEmail === 'User') return;
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userEmail}`);
      const data = await response.json();
      if (response.ok && data.fileName) {
        setProfileImage(`${API_BASE_URL}/uploads/${data.fileName}?t=${Date.now()}`);
      }
    } catch (error) {
      console.error('❌ ดึงรูปโปรไฟล์จาก Server ล้มเหลว:', error);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('แจ้งเตือน', 'ต้องขออนุญาตเข้าถึงรูปภาพเพื่อเปลี่ยนรูปโปรไฟล์ครับ');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true, 
      aspect: [1, 1],      
      quality: 0.8,        
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      uploadImage(uri); 
    }
  };

  const uploadImage = async (uri: string) => {
    setIsLoading(true); 
    try {
      let formData = new FormData();
      let filename = uri.split('/').pop() || 'profile.jpg';
      let type = 'image/jpeg'; 

      let uploadUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;

      formData.append('profile_image', { 
        uri: uploadUri, 
        name: filename, 
        type: type 
      } as any);
      
      formData.append('email', String(userEmail)); 

      const response = await fetch(`${API_BASE_URL}/upload-profile`, {
        method: 'POST',
        body: formData, 
      });

      const data = await response.json();
      if (response.ok) {
        setProfileImage(`${API_BASE_URL}/uploads/${data.fileName}?t=${Date.now()}`); 
        Alert.alert('สำเร็จ', 'เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว');
      } else {
        Alert.alert('เกิดข้อผิดพลาด', data.error || 'อัปโหลดรูปไม่สำเร็จ');
      }
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ!');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/activities?email=${userEmail}&_t=${Date.now()}`);
      const data = await response.json();
      
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayString = `${yyyy}-${mm}-${dd}`;

      const formattedData = (Array.isArray(data) ? data : [])
        .filter((item: any) => item.status !== 'archived')
        .map((item: any) => {
          const dbDate = formatDateString(item.date);
          return {
            id: item.activity_id ? item.activity_id.toString() : Math.random().toString(),
            title: item.title || 'ไม่มีชื่อ',
            time: formatTime(item.start_time),
            location: item.location || 'ไม่ได้ระบุ',
            date: dbDate,
            type: 'activity', 
            type_id: item.type_id || 1,
            status: item.status || 'pending', 
            type_name: item.type_name || 'ไม่ได้ระบุประเภท',
            reminder_minutes: item.reminder_minutes ?? null,
          };
        })
        .filter((item: any) => item.date === todayString);

      setActivities(formattedData); 
    } catch (error) {
      setActivities([]);
    }
  };

  const fetchClassesToday = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-subjects?email=${userEmail}`);
      const data = await response.json();

      const daysThai = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const todayThaiString = daysThai[new Date().getDay()];

      const formattedClasses = (Array.isArray(data) ? data : [])
        .filter((item: any) => item.day_of_week === todayThaiString)
        .map((item: any) => ({
          id: item.enroll_id?.toString() || Math.random().toString(),
          code: item.subject_code || '',
          title: item.subject_name || '',
          section: item.section || '1',
          day: item.day_of_week || todayThaiString,
          time: `${item.start_time ? item.start_time.substring(0, 5) : '00:00'} - ${item.end_time ? item.end_time.substring(0, 5) : '00:00'} น.`,
          location: `ห้อง ${item.room || 'ไม่ระบุ'}`,
          lecturer: item.instructor_name || 'ไม่ระบุ',
          type: 'class',
          type_name: `วิชาเรียน`,
          status: 'class', 
        }));

      setClasses(formattedClasses);
    } catch (error) {
      console.error('ดึงข้อมูลวิชาเรียนไม่สำเร็จ:', error);
      setClasses([]);
    }
  };
  
  useFocusEffect(
    useCallback(() => {
      if (userEmail && userEmail !== 'User') {
        fetchActivities();
        fetchClassesToday(); 
        fetchProfileImage();
      }
    }, [userEmail, activeTab])
  );
  useEffect(() => {
    // 1. ดักจับเมื่อมีแจ้งเตือนเข้าขณะใช้งานแอปอยู่
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('มีแจ้งเตือนเข้า:', notification);
      fetchActivities(); // รีเฟรชรายการกิจกรรมทันที
    });

    // 2. ดักจับเมื่อผู้ใช้แตะที่แถบแจ้งเตือนด้านบน
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👉 ผู้ใช้แตะที่แจ้งเตือน:', response);
      fetchActivities();
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [userEmail]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowProfile(false);
      router.replace('/');
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleUpdateActivity = async () => {
    if (!editForm.title) {
      Alert.alert('คำเตือน', 'กรุณากรอกหัวข้อกิจกรรม');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/activities/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          date: editForm.date,
          start_time: editForm.time,
          location: editForm.location,
          type_id: editForm.type_id,
          reminder_minutes: editForm.reminder_minutes,
          status: editForm.status
        }),
      });

      if (response.ok) {
        Alert.alert('สำเร็จ', 'แก้ไขข้อมูลกิจกรรมเรียบร้อยแล้ว');
        setShowDetail(false);
        fetchActivities();
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถแก้ไขข้อมูลได้');
      }
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const confirmDelete = (id: string, itemType: string) => {
    Alert.alert("ยืนยันการลบ", "ต้องการลบรายการนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบเลย", style: "destructive", onPress: async () => {
          if (itemType === 'activity') {
            try {
              const response = await fetch(`${API_BASE_URL}/activities/${id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                Alert.alert('สำเร็จ', 'ลบกิจกรรมเรียบร้อยแล้ว');
                fetchActivities(); 
              } else {
                Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อมูลจากระบบได้');
              }
            } catch (error) {
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            }
          } else if (itemType === 'class') {
            try {
              const response = await fetch(`${API_BASE_URL}/user-subjects/${id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                Alert.alert('สำเร็จ', 'ลบวิชาเรียนเรียบร้อยแล้ว');
                fetchClassesToday(); 
              } else {
                Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อมูลจากระบบได้');
              }
            } catch (error) {
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            }
          }
        } 
      }
    ]);
  };

  const markAsDone = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/activities/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });
      if (response.ok) {
        fetchActivities();
      }
    } catch (error) {
      console.error('อัปเดตสถานะไม่สำเร็จ:', error);
    }
  };

  const archiveActivity = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/activities/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      });
      if (response.ok) {
        fetchActivities();
      }
    } catch (error) {
      console.error('เก็บประวัติไม่สำเร็จ:', error);
    }
  };

  const renderRightActions = (item: any) => {
    if (item.type === 'class') {
      return (
        <View style={styles.swipeActionsContainer}>
          <TouchableOpacity style={[styles.swipeButton, { backgroundColor: '#F44336' }]} onPress={() => confirmDelete(item.id, item.type)}>
            <FontAwesome name="trash" size={24} color="#FFF" />
            <Text style={styles.swipeText}>ลบทิ้ง</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const isDone = item.status === 'done';
    return (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity 
          style={[styles.swipeButton, { backgroundColor: isDone ? '#607D8B' : '#4CAF50' }]} 
          onPress={() => { 
            if (isDone) {
              archiveActivity(item.id);
            } else {
              markAsDone(item.id);
            }
          }}
        >
          <FontAwesome name={isDone ? "archive" : "check-circle"} size={24} color="#FFF" />
          <Text style={styles.swipeText}>{isDone ? "เก็บประวัติ" : "เสร็จสิ้น"}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.swipeButton, { backgroundColor: '#F44336' }]} 
          onPress={() => confirmDelete(item.id, item.type)}
        >
          <FontAwesome name="trash" size={24} color="#FFF" />
          <Text style={styles.swipeText}>ลบทิ้ง</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getActivityStyle = (item: any) => {
    if (item.status === 'done') return { borderLeftColor: '#4CAF50', backgroundColor: '#E8F5E9' }; 
    if (!item.date || !item.time || item.time === '--:--' || item.date === 'ไม่ระบุวันที่') {
      return { borderLeftColor: '#FBC02D', backgroundColor: '#FFFDE7' }; 
    }

    const now = new Date();
    const [year, month, day] = item.date.split('-');
    const [hour, minute] = item.time.split(':');
    const activityDateTime = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));

    const diffMs = activityDateTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 0) return { borderLeftColor: '#F44336', backgroundColor: '#FFEBEE' }; 
    if (diffMins <= 60) return { borderLeftColor: '#FF9800', backgroundColor: '#FFF3E0' }; 
    return { borderLeftColor: '#FBC02D', backgroundColor: '#FFFDE7' }; 
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'class') {
      const dayStyle = DAY_COLORS[item.day] || DAY_COLORS['จันทร์'];
      return (
        <Swipeable renderRightActions={() => renderRightActions(item)}>
          <View style={[styles.card, { borderLeftColor: dayStyle.border, backgroundColor: dayStyle.bg }]}>
            <View style={styles.cardContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.courseCode}>{item.code}</Text>
                <Text style={[styles.secBadge, { backgroundColor: dayStyle.border }]}>Sec {item.section}</Text>
              </View>
              
              <Text style={styles.newCardTitle}>{item.title}</Text>
              
              <View style={styles.newInfoRow}>
                <FontAwesome name="clock-o" size={14} color="#555" style={styles.newInfoIcon} />
                <Text style={styles.newInfoText}>{item.time}</Text>
              </View>
              <View style={styles.newInfoRow}>
                <FontAwesome name="map-marker" size={16} color="#555" style={styles.newInfoIcon} />
                <Text style={styles.newInfoText}>{item.location}</Text>
              </View>
              <View style={styles.newInfoRow}>
                <FontAwesome name="user" size={14} color="#555" style={styles.newInfoIcon} />
                <Text style={styles.newInfoText}>{item.lecturer}</Text>
              </View>
            </View>
            <FontAwesome name="angle-right" size={24} color="#999" style={{ alignSelf: 'center' }} />
          </View>
        </Swipeable>
      );
    }

    const reminderLabel = REMINDER_OPTIONS.find(r => r.value === item.reminder_minutes)?.label || 'ไม่แจ้งเตือน';

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity 
          style={[styles.card, getActivityStyle(item)]} 
          onPress={() => { 
            setEditForm({ ...item }); 
            setShowDetail(true); 
          }} 
          activeOpacity={0.8}
        >
          <View style={styles.cardContent}>
            <Text style={styles.newCardTitle}>{item.title}</Text>
            <Text style={{ fontSize: 13, color: '#0F9B58', fontWeight: 'bold', marginBottom: 5 }}>
              [{item.type_name}]
            </Text>
            <View style={styles.newInfoRow}>
              <FontAwesome name="calendar" size={14} color="#777" style={styles.newInfoIcon} />
              <Text style={styles.newInfoText}>{item.date}</Text>
            </View>
            <View style={styles.newInfoRow}>
              <FontAwesome name="clock-o" size={14} color="#777" style={styles.newInfoIcon} />
              <Text style={styles.newInfoText}>{item.time}</Text>
            </View>
            <View style={styles.newInfoRow}>
              <FontAwesome name="map-marker" size={16} color="#777" style={styles.newInfoIcon} />
              <Text style={styles.newInfoText}>{item.location}</Text>
            </View>
            <View style={styles.newInfoRow}>
              <FontAwesome name="bell" size={14} color="#777" style={styles.newInfoIcon} />
              <Text style={styles.newInfoText}>{reminderLabel}</Text>
            </View>
          </View>
          <FontAwesome name="angle-right" size={24} color="#999" style={{ alignSelf: 'center' }} />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const selectedTypeName = ACTIVITY_TYPES.find(t => t.id === editForm.type_id)?.name || editForm.type_name || 'กิจกรรมส่วนตัว';
  const selectedReminderLabel = REMINDER_OPTIONS.find(r => r.value === editForm.reminder_minutes)?.label || 'ไม่แจ้งเตือน';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>หน้าหลัก</Text>
          <TouchableOpacity style={styles.profileIcon} onPress={() => setShowProfile(true)}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F9B58', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>{initialLetter}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tabWrapper}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'activity' && styles.activeTab]} onPress={() => setActiveTab('activity')}>
            <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>กิจกรรมวันนี้</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'class' && styles.activeTab]} onPress={() => setActiveTab('class')}>
            <Text style={[styles.tabText, activeTab === 'class' && styles.activeTabText]}>ตารางเรียนวันนี้</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {activeTab === 'activity' ? `กิจกรรมวันนี้ (${activities.length})` : `วิชาเรียนวันนี้ (${classes.length})`}
          </Text>
            <Text style={styles.swipeHintText}>👈 ปัดซ้ายเพื่อจัดการ</Text>
        </View>

        <FlatList
          data={activeTab === 'activity' ? activities : classes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีรายการในวันนี้ 🎉</Text>}
        />

        <Modal visible={showDetail} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.detailModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>ดูและแก้ไขกิจกรรม</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)}>
                  <FontAwesome name="times-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>หัวข้อกิจกรรม</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={editForm.title} 
                    onChangeText={(text) => setEditForm({ ...editForm, title: text })}
                  />
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>ประเภทกิจกรรม</Text>
                  <TouchableOpacity style={styles.pickerBox} onPress={() => setShowTypeModal(true)}>
                    <Text style={{ flex: 1, fontSize: 16, color: '#333' }}>{selectedTypeName}</Text>
                    <FontAwesome name="chevron-down" size={14} color="#777" />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={[styles.infoGroup, { width: '48%' }]}>
                    <Text style={styles.detailLabel}>วันที่</Text>
                    <TouchableOpacity style={styles.pickerBox} onPress={() => setDatePickerVisibility(true)}>
                      <FontAwesome name="calendar" size={16} color="#0F9B58" style={{ marginRight: 10 }} />
                      <Text style={{ fontSize: 16, color: '#333' }}>{editForm.date || 'เลือกวันที่'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.infoGroup, { width: '48%' }]}>
                    <Text style={styles.detailLabel}>เวลา</Text>
                    <TouchableOpacity style={styles.pickerBox} onPress={() => setTimePickerVisibility(true)}>
                      <FontAwesome name="clock-o" size={16} color="#0F9B58" style={{ marginRight: 10 }} />
                      <Text style={{ fontSize: 16, color: '#333' }}>{editForm.time || '--:--'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>แจ้งเตือนล่วงหน้า</Text>
                  <TouchableOpacity style={styles.pickerBox} onPress={() => setShowReminderModal(true)}>
                    <Text style={{ flex: 1, fontSize: 16, color: '#333' }}>{selectedReminderLabel}</Text>
                    <FontAwesome name="chevron-down" size={14} color="#777" />
                  </TouchableOpacity>
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>สถานที่</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={editForm.location} 
                    onChangeText={(text) => setEditForm({ ...editForm, location: text })}
                  />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleUpdateActivity}>
                  <Text style={styles.saveButtonText}>💾 บันทึกการแก้ไข</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={showTypeModal} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypeModal(false)}>
            <View style={styles.selectOptionModal}>
              <Text style={styles.selectModalTitle}>เลือกประเภทกิจกรรม</Text>
              {ACTIVITY_TYPES.map((type) => (
                <TouchableOpacity 
                  key={type.id} 
                  style={styles.optionItem}
                  onPress={() => {
                    setEditForm({ ...editForm, type_id: type.id, type_name: type.name });
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={[styles.optionText, editForm.type_id === type.id && { color: '#0F9B58', fontWeight: 'bold' }]}>{type.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showReminderModal} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowReminderModal(false)}>
            <View style={styles.selectOptionModal}>
              <Text style={styles.selectModalTitle}>เลือกการแจ้งเตือน</Text>
              {REMINDER_OPTIONS.map((option, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.optionItem}
                  onPress={() => {
                    setEditForm({ ...editForm, reminder_minutes: option.value });
                    setShowReminderModal(false);
                  }}
                >
                  <Text style={[styles.optionText, editForm.reminder_minutes === option.value && { color: '#0F9B58', fontWeight: 'bold' }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={(date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            setEditForm({ ...editForm, date: `${y}-${m}-${d}` });
            setDatePickerVisibility(false);
          }}
          onCancel={() => setDatePickerVisibility(false)}
        />
        <DateTimePickerModal
          isVisible={isTimePickerVisible}
          mode="time"
          onConfirm={(time) => {
            const h = String(time.getHours()).padStart(2, '0');
            const min = String(time.getMinutes()).padStart(2, '0');
            setEditForm({ ...editForm, time: `${h}:${min}` });
            setTimePickerVisibility(false);
          }}
          onCancel={() => setTimePickerVisibility(false)}
        />

        <Modal visible={showProfile} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.profileModal}>
              <TouchableOpacity onPress={pickImage} style={{ marginBottom: 15, position: 'relative' }} disabled={isLoading}>
                {isLoading ? (
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#0F9B58" />
                  </View>
                ) : profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                ) : (
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#0F9B58', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>{initialLetter}</Text>
                  </View>
                )}
                {!isLoading && (
                  <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFF', borderRadius: 15, padding: 5, elevation: 3 }}>
                    <FontAwesome name="camera" size={14} color="#555" />
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.profileName}>{userEmail}</Text>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>ออกจากระบบ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowProfile(false)}>
                <Text style={styles.closeButtonText}>ปิดหน้าต่าง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom > 0 ? insets.bottom + 5 : 20, height: 60 + (insets.bottom > 0 ? insets.bottom : 20) }]}>
        <TouchableOpacity style={styles.navItem}>
          <FontAwesome name="home" size={24} color="#0F9B58" />
          <Text style={[styles.navText, { color: '#0F9B58', fontWeight: 'bold' }]}>หน้าหลัก</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace({ pathname: '/activity', params: { email: userEmail } })}>
          <FontAwesome name="list-alt" size={24} color="#999" />
          <Text style={styles.navText}>กิจกรรม</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push({ pathname: '/schedule', params: { email: userEmail } })}>
          <FontAwesome name="calendar" size={24} color="#999" />
          <Text style={styles.navText}>ตารางเรียน</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

// --- Compact StyleSheet ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 0 },
  header: { height: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', elevation: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  profileIcon: { position: 'absolute', right: 15, zIndex: 10, elevation: 5, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  tabWrapper: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 30, marginHorizontal: 20, marginTop: 15, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 30, alignItems: 'center' },
  activeTab: { backgroundColor: '#0F9B58' },
  tabText: { fontSize: 16, color: '#888' },
  activeTabText: { color: '#FFFFFF', fontWeight: 'bold' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 25, marginBottom: 15 },
  swipeHintText: { fontSize: 12, color: '#888' },
  listTitle: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
  card: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 15, borderLeftWidth: 6, elevation: 2 },
  cardContent: { flex: 1 },
  courseCode: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  secBadge: { color: '#FFF', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  newCardTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginVertical: 4 },
  newInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  newInfoIcon: { width: 20, marginRight: 8 },
  newInfoText: { fontSize: 14, color: '#555' },
  swipeActionsContainer: { flexDirection: 'row', marginBottom: 15, alignItems: 'stretch' },
  swipeButton: { width: 80, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 12, borderBottomRightRadius: 12, marginLeft: 2 },
  swipeText: { color: '#FFF', fontSize: 12, marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  profileModal: { width: '80%', backgroundColor: '#FFF', borderRadius: 20, padding: 30, alignItems: 'center' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 25 },
  logoutButton: { backgroundColor: '#F44336', paddingVertical: 12, width: '100%', borderRadius: 25, alignItems: 'center', marginBottom: 20 },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  closeButton: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#EEEEEE', borderRadius: 20, marginTop: 5 },
  closeButtonText: { color: '#555', fontSize: 16, fontWeight: 'bold' },
  detailModal: { width: '90%', maxHeight: '85%', backgroundColor: '#FFF', borderRadius: 25, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  infoGroup: { marginBottom: 15 },
  detailLabel: { fontSize: 14, color: '#777', marginBottom: 8, fontWeight: '600' },
  textInput: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 16, color: '#333' },
  pickerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  saveButton: { backgroundColor: '#0F9B58', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  selectOptionModal: { width: '80%', backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  selectModalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  optionItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  optionText: { fontSize: 15, color: '#333', textAlign: 'center' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderTopWidth: 2, borderTopColor: '#D0D0D0', justifyContent: 'space-around', alignItems: 'center', elevation: 15 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 5 },
  navText: { fontSize: 12, marginTop: 4, color: '#777', fontWeight: 'bold' },
});
