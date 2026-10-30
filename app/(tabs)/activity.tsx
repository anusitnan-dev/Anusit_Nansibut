import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Platform, StatusBar, Alert, TextInput, KeyboardAvoidingView, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { registerForPushNotificationsAsync } from '../../utils/notification';
import { auth } from '../../firebaseConfig'; 
import { signOut } from 'firebase/auth';

// อัปเดต API_BASE_URL ให้ชี้ไปที่ Render Server
//const API_BASE_URL = 'https://uninoti.onrender.com';
//เวอร์ชัน Local IP (เปิดไว้สำหรับการนำเสนอสดผ่าน Expo)
const API_BASE_URL = 'http:/10.75.248.236:3000';

const REMINDER_OPTIONS = [
  { label: 'ไม่แจ้งเตือน', value: null },
  { label: 'เมื่อถึงเวลากิจกรรม', value: 0 },
  { label: 'ล่วงหน้า 15 นาที', value: 15 },
  { label: 'ล่วงหน้า 30 นาที', value: 30 },
  { label: 'ล่วงหน้า 1 ชั่วโมง', value: 60 },
  { label: 'ล่วงหน้า 1 วัน', value: 1440 },
];

export default function ActivityScreen() {
  const insets = useSafeAreaInsets(); 

  const { email } = useLocalSearchParams();
  const parsedEmail = Array.isArray(email) ? email[0] : email;
  const [userEmail, setUserEmail] = useState(parsedEmail || 'User');
  
  const [showProfile, setShowProfile] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [searchText, setSearchText] = useState(''); 

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isEditDatePickerVisible, setEditDatePickerVisibility] = useState(false);
  const [isEditTimePickerVisible, setEditTimePickerVisibility] = useState(false);
  const [isEditDropdownOpen, setIsEditDropdownOpen] = useState(false);
  const [isEditReminderDropdownOpen, setIsEditReminderDropdownOpen] = useState(false);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const initialLetter = userEmail ? String(userEmail).charAt(0).toUpperCase() : '?';

  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [newReminder, setNewReminder] = useState<number | null>(15);
  const [isReminderDropdownOpen, setIsReminderDropdownOpen] = useState(false);

  const formatTime = (timeStr: any) => {
    if (!timeStr || typeof timeStr !== 'string') return '--:--';
    return timeStr.includes(':') ? timeStr.substring(0, 5) : timeStr;
  };

  const formatDateString = (dateStr: any) => {
    if (!dateStr || typeof dateStr !== 'string') return 'ไม่ระบุวันที่';
    
    if (dateStr.length === 10 && !dateStr.includes('T')) {
      return dateStr;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.split('T')[0];

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    if (parsedEmail) {
      setUserEmail(parsedEmail);
      registerForPushNotificationsAsync(parsedEmail);
    }
  }, [parsedEmail]);

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
      console.error('Upload Error:', error);
      Alert.alert('ข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ!');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/activities?email=${userEmail}&search=${searchText}&_t=${Date.now()}`);
      const data = await response.json();

      const formattedData = (Array.isArray(data) ? data : [])
        .filter((item: any) => item.status !== 'archived')
        .map((item: any) => ({
          id: item.activity_id ? item.activity_id.toString() : Math.random().toString(), 
          title: item.title || 'ไม่มีชื่อ',
          time: formatTime(item.start_time), 
          location: item.location || 'ไม่ได้ระบุ',
          date: formatDateString(item.date), 
          status: item.status || 'pending', 
          type_id: item.type_id,
          type_name: item.type_name || 'ไม่ได้ระบุประเภท',
          reminder_minutes: item.reminder_minutes ?? null
        }));

      setActivities(formattedData);
    } catch (error) {
      console.error('❌ ดึงข้อมูลไม่สำเร็จ:', error);
    }
  };

  const fetchActivityTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/activity_types`);
      const data = await response.json();
      if (response.ok) {
        setActivityTypes(data);
      }
    } catch (error) {
      console.error('❌ ดึงประเภทกิจกรรมล้มเหลว:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActivities();
      if (userEmail && userEmail !== 'User') {
        fetchProfileImage();
      }
      fetchActivityTypes();
    }, [userEmail, searchText])
  );

  const handleConfirmDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setNewDate(`${year}-${month}-${day}`);
    setDatePickerVisibility(false);
  };

  const handleConfirmTime = (time: Date) => {
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    setNewTime(`${hours}:${minutes}`);
    setTimePickerVisibility(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowProfile(false);
      router.replace('/');
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert("ยืนยันการลบ", "ต้องการลบกิจกรรมนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบเลย", style: "destructive", onPress: async () => {
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
            console.error('ลบไม่สำเร็จ:', error);
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
          }
        } 
      }
    ]);
  };

  const saveActivity = async () => {
    if (!newTitle) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อกิจกรรมด้วยครับ');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          date: newDate || null,
          start_time: newTime || null,
          location: newLocation,
          user_email: userEmail,
          type_id: selectedTypeId,
          reminder_minutes: newReminder
        }),
      });

      if (response.ok) {
        Alert.alert('สำเร็จ', 'เพิ่มกิจกรรมเรียบร้อยแล้ว!');
        setShowAddModal(false);
        setNewTitle(''); setNewDate(''); setNewTime(''); setNewLocation('');
        fetchActivities(); 
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (error) {
      console.error('❌ บันทึกข้อมูลไม่สำเร็จ:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
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
          type_id: editForm.type_id || null,
          reminder_minutes: editForm.reminder_minutes ?? null
        }),
      });

      if (response.ok) {
        Alert.alert('สำเร็จ', 'แก้ไขข้อมูลกิจกรรมเรียบร้อยแล้ว ✨');
        setShowDetail(false);
        fetchActivities(); 
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถแก้ไขข้อมูลได้');
      }
    } catch (error) {
      console.error('แก้ไขไม่สำเร็จ:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
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
        
        <TouchableOpacity style={[styles.swipeButton, { backgroundColor: '#F44336' }]} onPress={() => confirmDelete(item.id)}>
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
    const [year, month, day] = item.date.split('-').map(Number);
    const [hour, minute] = item.time.split(':').map(Number);
    
    const activityDateTime = new Date(year, month - 1, day, hour, minute, 0);
    const diffMs = activityDateTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 0) return { borderLeftColor: '#F44336', backgroundColor: '#FFEBEE' };
    if (diffMins <= 60) return { borderLeftColor: '#FF9800', backgroundColor: '#FFF3E0' };
    return { borderLeftColor: '#FBC02D', backgroundColor: '#FFFDE7' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const reminderLabel = REMINDER_OPTIONS.find(r => r.value === item.reminder_minutes)?.label || 'ไม่แจ้งเตือน';

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity 
          style={[styles.card, getActivityStyle(item)]} 
          onPress={() => { setEditForm({ ...item }); setShowDetail(true); }}
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>กิจกรรมทั้งหมด</Text>
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

        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={16} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหากิจกรรมทั้งหมด..."
            value={searchText}
            onChangeText={(text) => setSearchText(text)}
            placeholderTextColor="#888"
          />
        </View>

        {/* 🌟 จุดที่เพิ่มไอคอน ℹ️ สำหรับแสดง Pop-up คำอธิบายสีสถานะ */}
        <View style={styles.listHeader}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Text style={styles.listTitle}>กิจกรรมทั้งหมด ({activities.length})</Text>
    
    {/* 🌟 เปลี่ยนเป็นปุ่ม Chip สีเขียวอ่อน ดูออกทันทีว่ากดได้ */}
    <TouchableOpacity 
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: '#C8E6C9'
      }}
      onPress={() => Alert.alert(
        '💡 ความหมายสีแถบสถานะ',
        '🟢 แถบสีเขียว: กิจกรรมทำเสร็จแล้ว\n🔴 แถบสีแดง: เลยกำหนดเวลาแล้ว\n🟠 แถบสีส้ม: ใกล้ถึงเวลา (ภายใน 1 ชม.)\n🟡 แถบสีเหลือง: รอดำเนินการ'
      )}
      activeOpacity={0.7}
    >
      <FontAwesome name="info-circle" size={13} color="#0F9B58" />
      <Text style={{ fontSize: 11, color: '#0F9B58', fontWeight: 'bold' }}>คำอธิบายสี</Text>
    </TouchableOpacity>
  </View>
          <Text style={styles.swipeHintText}>👈 ปัดซ้ายเพื่อจัดการ</Text>
        </View>

        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }} 
          ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีกิจกรรมในระบบ 📭</Text>}
        />

        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <FontAwesome name="plus" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Modal ดูและแก้ไขกิจกรรม */}
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
                    placeholderTextColor="#888"
                    onChangeText={(text) => setEditForm({ ...editForm, title: text })}
                  />
                </View>
                
                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>ประเภทกิจกรรม</Text>
                  <TouchableOpacity 
                    style={[styles.pickerBox, { justifyContent: 'space-between' }]} 
                    onPress={() => setIsEditDropdownOpen(!isEditDropdownOpen)}
                  >
                    <Text style={{ fontSize: 16, color: '#333' }}>
                      {activityTypes.find(t => t.type_id === editForm.type_id)?.type_name || 'ไม่ได้ระบุประเภท'}
                    </Text>
                    <FontAwesome name={isEditDropdownOpen ? "chevron-up" : "chevron-down"} size={14} color="#777" />
                  </TouchableOpacity>

                  {isEditDropdownOpen && (
                    <View style={[styles.dropdownListContainer, { marginTop: 5 }]}>
                      <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                        <TouchableOpacity
                          style={styles.dropdownListItem}
                          onPress={() => { setEditForm({ ...editForm, type_id: null }); setIsEditDropdownOpen(false); }}
                        >
                          <Text style={{ fontSize: 15, color: editForm.type_id === null ? '#0F9B58' : '#555' }}>
                            ไม่ได้ระบุประเภท
                          </Text>
                        </TouchableOpacity>
                        
                        {activityTypes.map((type) => (
                          <TouchableOpacity
                            key={type.type_id}
                            style={styles.dropdownListItem}
                            onPress={() => { setEditForm({ ...editForm, type_id: type.type_id }); setIsEditDropdownOpen(false); }}
                          >
                            <Text style={{ fontSize: 15, color: editForm.type_id === type.type_id ? '#0F9B58' : '#333' }}>
                              {type.type_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={[styles.infoGroup, { width: '48%' }]}>
                    <Text style={styles.detailLabel}>วันที่</Text>
                    <TouchableOpacity style={styles.pickerBox} onPress={() => setEditDatePickerVisibility(true)}>
                      <FontAwesome name="calendar" size={16} color="#0F9B58" style={{ marginRight: 10 }} />
                      <Text style={{ fontSize: 16, color: '#333' }}>{editForm.date || 'เลือกวันที่'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.infoGroup, { width: '48%' }]}>
                    <Text style={styles.detailLabel}>เวลา</Text>
                    <TouchableOpacity style={styles.pickerBox} onPress={() => setEditTimePickerVisibility(true)}>
                      <FontAwesome name="clock-o" size={16} color="#0F9B58" style={{ marginRight: 10 }} />
                      <Text style={{ fontSize: 16, color: '#333' }}>{editForm.time || '--:--'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>แจ้งเตือนล่วงหน้า</Text>
                  <TouchableOpacity 
                    style={[styles.pickerBox, { justifyContent: 'space-between' }]} 
                    onPress={() => setIsEditReminderDropdownOpen(!isEditReminderDropdownOpen)}
                  >
                    <Text style={{ fontSize: 16, color: '#333' }}>
                      {REMINDER_OPTIONS.find(r => r.value === editForm.reminder_minutes)?.label || 'ไม่แจ้งเตือน'}
                    </Text>
                    <FontAwesome name={isEditReminderDropdownOpen ? "chevron-up" : "chevron-down"} size={14} color="#777" />
                  </TouchableOpacity>

                  {isEditReminderDropdownOpen && (
                    <View style={[styles.dropdownListContainer, { marginTop: 5 }]}>
                      <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                        {REMINDER_OPTIONS.map((item) => (
                          <TouchableOpacity
                            key={String(item.value)}
                            style={styles.dropdownListItem}
                            onPress={() => {
                              setEditForm({ ...editForm, reminder_minutes: item.value });
                              setIsEditReminderDropdownOpen(false);
                            }}
                          >
                            <Text style={{ fontSize: 15, color: editForm.reminder_minutes === item.value ? '#0F9B58' : '#333' }}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>สถานที่</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={editForm.location} 
                    placeholderTextColor="#888"
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

        <DateTimePickerModal
          isVisible={isEditDatePickerVisible}
          mode="date"
          onConfirm={(date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            setEditForm({ ...editForm, date: `${y}-${m}-${d}` });
            setEditDatePickerVisibility(false);
          }}
          onCancel={() => setEditDatePickerVisibility(false)}
        />
        <DateTimePickerModal
          isVisible={isEditTimePickerVisible}
          mode="time"
          onConfirm={(time) => {
            const h = String(time.getHours()).padStart(2, '0');
            const min = String(time.getMinutes()).padStart(2, '0');
            setEditForm({ ...editForm, time: `${h}:${min}` });
            setEditTimePickerVisibility(false);
          }}
          onCancel={() => setEditTimePickerVisibility(false)}
        />

        {/* Modal เพิ่มกิจกรรมใหม่ (ปรับให้เหมือนกับแบบฟอร์มแก้ไข) */}
        <Modal visible={showAddModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formModal}>
              <Text style={styles.formTitle}>เพิ่มกิจกรรมใหม่</Text>
              
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>หัวข้อกิจกรรม <Text style={{color: 'red'}}>*</Text></Text>
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="เช่น เรียนคณิตศาสตร์" 
                    placeholderTextColor="#888"
                    value={newTitle} 
                    onChangeText={setNewTitle} 
                  />
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>ประเภทกิจกรรม</Text>
                  <TouchableOpacity 
                    style={[styles.pickerBox, { justifyContent: 'space-between' }]} 
                    onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 16, color: selectedTypeId ? '#333' : '#666' }}>
                      {activityTypes.find(t => t.type_id === selectedTypeId)?.type_name || 'ไม่ได้ระบุประเภท'}
                    </Text>
                    <FontAwesome name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={14} color="#777" />
                  </TouchableOpacity>

                  {isDropdownOpen && (
                    <View style={[styles.dropdownListContainer, { marginTop: 5 }]}>
                      <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                        <TouchableOpacity
                          style={styles.dropdownListItem}
                          onPress={() => {
                            setSelectedTypeId(null);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <Text style={{ 
                            fontSize: 15, 
                            color: selectedTypeId === null ? '#0F9B58' : '#555', 
                            fontWeight: selectedTypeId === null ? 'bold' : 'normal' 
                          }}>
                            ไม่ได้ระบุประเภท
                          </Text>
                        </TouchableOpacity>

                        {activityTypes.map((type) => {
                          const isSelected = selectedTypeId === type.type_id;
                          return (
                            <TouchableOpacity
                              key={type.type_id}
                              style={styles.dropdownListItem}
                              onPress={() => {
                                setSelectedTypeId(type.type_id);
                                setIsDropdownOpen(false);
                              }}
                            >
                              <Text style={{ 
                                fontSize: 15, 
                                color: isSelected ? '#0F9B58' : '#333', 
                                fontWeight: isSelected ? 'bold' : 'normal' 
                              }}>
                                {type.type_name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={[styles.infoGroup, { width: '48%' }]}>
                    <Text style={styles.detailLabel}>วันที่</Text>
                    <TouchableOpacity style={styles.pickerBox} onPress={() => setDatePickerVisibility(true)}>
                      <FontAwesome name="calendar" size={16} color="#0F9B58" style={{ marginRight: 10 }} />
                      <Text style={{ fontSize: 16, color: newDate ? '#333' : '#666' }}>
                        {newDate ? newDate : 'เลือกวันที่'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.infoGroup, { width: '48%' }]}>
                    <Text style={styles.detailLabel}>เวลา</Text>
                    <TouchableOpacity style={styles.pickerBox} onPress={() => setTimePickerVisibility(true)}>
                      <FontAwesome name="clock-o" size={16} color="#0F9B58" style={{ marginRight: 10 }} />
                      <Text style={{ fontSize: 16, color: newTime ? '#333' : '#666' }}>
                        {newTime ? newTime : '--:--'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>แจ้งเตือนล่วงหน้า</Text>
                  <TouchableOpacity 
                    style={[styles.pickerBox, { justifyContent: 'space-between' }]} 
                    onPress={() => setIsReminderDropdownOpen(!isReminderDropdownOpen)}
                  >
                    <Text style={{ fontSize: 16, color: '#333' }}>
                      {REMINDER_OPTIONS.find(r => r.value === newReminder)?.label || 'ไม่แจ้งเตือน'}
                    </Text>
                    <FontAwesome name={isReminderDropdownOpen ? "chevron-up" : "chevron-down"} size={14} color="#777" />
                  </TouchableOpacity>

                  {isReminderDropdownOpen && (
                    <View style={[styles.dropdownListContainer, { marginTop: 5 }]}>
                      <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                        {REMINDER_OPTIONS.map((item) => (
                          <TouchableOpacity
                            key={String(item.value)}
                            style={styles.dropdownListItem}
                            onPress={() => {
                              setNewReminder(item.value);
                              setIsReminderDropdownOpen(false);
                            }}
                          >
                            <Text style={{ fontSize: 15, color: newReminder === item.value ? '#0F9B58' : '#333', fontWeight: newReminder === item.value ? 'bold' : 'normal' }}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.detailLabel}>สถานที่</Text>
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="เช่น ตึก 3 ห้อง 301" 
                    placeholderTextColor="#888"
                    value={newLocation} 
                    onChangeText={setNewLocation} 
                  />
                </View>
              </ScrollView>

              <View style={styles.formActionRow}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#E0E0E0' }]} onPress={() => setShowAddModal(false)}>
                  <Text style={{ color: '#333', fontWeight: 'bold' }}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#0F9B58' }]} onPress={saveActivity}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>บันทึก</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

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
                    <Text style={{ color: '#FFF', fontSize: 36, fontWeight: 'bold' }}>{initialLetter}</Text>
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
        
        <DateTimePickerModal isVisible={isDatePickerVisible} mode="date" onConfirm={handleConfirmDate} onCancel={() => setDatePickerVisibility(false)} />
        <DateTimePickerModal isVisible={isTimePickerVisible} mode="time" onConfirm={handleConfirmTime} onCancel={() => setTimePickerVisibility(false)} />
      </View>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom > 0 ? insets.bottom + 5 : 20, height: 60 + (insets.bottom > 0 ? insets.bottom : 20) }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace({ pathname: '/Home', params: { email: userEmail } })}>
          <FontAwesome name="home" size={24} color="#999" />
          <Text style={styles.navText}>หน้าหลัก</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <FontAwesome name="list-alt" size={24} color="#0F9B58" />
          <Text style={[styles.navText, { color: '#0F9B58', fontWeight: 'bold' }]}>กิจกรรม</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push({ pathname: '/schedule', params: { email: userEmail } })}>
          <FontAwesome name="calendar" size={24} color="#999" />
          <Text style={styles.navText}>ตารางเรียน</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 0 },
  header: { height: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', elevation: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  profileIcon: { position: 'absolute', right: 15, zIndex: 10, elevation: 5, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
  card: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 15, borderLeftWidth: 6, elevation: 2 },
  cardContent: { flex: 1 },
  newCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  newInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  newInfoIcon: { width: 20, marginRight: 8 },
  newInfoText: { fontSize: 14, color: '#555' },
  swipeActionsContainer: { flexDirection: 'row', marginBottom: 15 },
  swipeButton: { width: 80, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 12, borderBottomRightRadius: 12, marginLeft: 2 },
  swipeText: { color: '#FFF', fontSize: 12, marginTop: 5, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 100, right: 20, width: 60, height: 60, backgroundColor: '#0F9B58', borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  profileModal: { width: '80%', backgroundColor: '#FFF', borderRadius: 20, padding: 30, alignItems: 'center' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 25 },
  logoutButton: { backgroundColor: '#F44336', paddingVertical: 12, width: '100%', borderRadius: 25, alignItems: 'center', marginBottom: 20 },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  closeButton: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#EEEEEE', borderRadius: 20, marginTop: 5 },
  closeButtonText: { color: '#555', fontSize: 16, fontWeight: 'bold' },
  formModal: { width: '90%', maxHeight: '80%', backgroundColor: '#FFF', borderRadius: 20, padding: 25 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  inputLabel: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: 'bold' },
  textInput: { backgroundColor: '#F9F9F9', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#E0E0E0' },
  datePickerButton: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 15, marginBottom: 15 },
  formActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  detailModal: { width: '90%', maxHeight: '85%', backgroundColor: '#FFF', borderRadius: 25, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  infoGroup: { marginBottom: 15 },
  detailLabel: { fontSize: 14, color: '#777', marginBottom: 8, fontWeight: '600' },
  pickerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  saveButton: { backgroundColor: '#0F9B58', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderTopWidth: 2, borderTopColor: '#D0D0D0', justifyContent: 'space-around', alignItems: 'center', elevation: 15 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 5 },
  navText: { fontSize: 12, marginTop: 4, color: '#777', fontWeight: 'bold' },
  searchContainer: {flexDirection: 'row',alignItems: 'center',backgroundColor: '#F5F5F5',borderRadius: 12,marginHorizontal: 20,marginTop: 15,paddingHorizontal: 15,height: 45,},
  searchIcon: {marginRight: 10,},
  searchInput: {flex: 1,fontSize: 16,color: '#333',},
  dropdownButton: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',backgroundColor: '#F5F5F5',borderRadius: 10,paddingHorizontal: 15,paddingVertical: 12,marginBottom: 15,},
  dropdownListContainer: {backgroundColor: '#FAFAFA',borderRadius: 10,borderWidth: 1,borderColor: '#E0E0E0',marginBottom: 15,overflow: 'hidden',},
  dropdownListItem: {paddingHorizontal: 15,paddingVertical: 12,borderBottomWidth: 1,borderBottomColor: '#EEE',},
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 5 },
  listTitle: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  swipeHintText: { fontSize: 12, color: '#888' },
});