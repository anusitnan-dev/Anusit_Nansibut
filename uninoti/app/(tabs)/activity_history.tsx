import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
// อัปเดต API_BASE_URL ให้ชี้ไปที่ Render Server
//const API_BASE_URL = 'you render'; 
//เวอร์ชัน Local IP (เปิดไว้สำหรับการนำเสนอสดผ่าน Expo)
const API_BASE_URL = '*********';

const REMINDER_OPTIONS = [
  { label: 'ไม่แจ้งเตือน', value: null },
  { label: 'เมื่อถึงเวลากิจกรรม', value: 0 },
  { label: 'ล่วงหน้า 15 นาที', value: 15 },
  { label: 'ล่วงหน้า 30 นาที', value: 30 },
  { label: 'ล่วงหน้า 1 ชั่วโมง', value: 60 },
  { label: 'ล่วงหน้า 1 วัน', value: 1440 },
];

export default function ActivityHistoryScreen() {
  const insets = useSafeAreaInsets();
  
  const searchParams = useLocalSearchParams();
  const rawEmail = searchParams.email;
  const parsedEmail = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
  const userEmail = parsedEmail || 'User';

  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [isEditDatePickerVisible, setEditDatePickerVisibility] = useState(false);
  const [isEditTimePickerVisible, setEditTimePickerVisibility] = useState(false);
  const [isEditDropdownOpen, setIsEditDropdownOpen] = useState(false);
  const [isEditReminderDropdownOpen, setIsEditReminderDropdownOpen] = useState(false);

  const fetchActivityTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/activity_types`);
      if (response.ok) {
        const data = await response.json();
        setActivityTypes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.log('❌ ดึงประเภทกิจกรรมล้มเหลว:', error);
      setActivityTypes([]);
    }
  };

  const fetchHistory = async () => {
    if (!userEmail || userEmail === 'User') return;
    try {
      const response = await fetch(`${API_BASE_URL}/activities?email=${encodeURIComponent(userEmail)}`);
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      
      const formattedData = (Array.isArray(data) ? data : [])
        .filter((item: any) => item.status === 'archived')
        .map((item: any) => {
          let rawDate = item.date || '';
          if (rawDate.includes('T')) {
            rawDate = rawDate.split('T')[0];
          }

          return {
            id: item.activity_id ? item.activity_id.toString() : Math.random().toString(),
            title: item.title || 'ไม่มีชื่อกิจกรรม',
            time: item.start_time ? item.start_time.substring(0, 5) : '--:--',
            location: item.location || 'ไม่ได้ระบุ',
            date: rawDate,
            status: item.status || 'archived',
            type_id: item.type_id,
            type_name: item.type_name || 'ไม่ได้ระบุประเภท',
            reminder_minutes: item.reminder_minutes ?? null,
          };
        });

      setHistoryList(formattedData);
    } catch (error) {
      console.log('⚠️ ดึงประวัติกิจกรรมไม่ได้:', error);
      setHistoryList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchActivityTypes();
  }, [userEmail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleOpenRestoreModal = (item: any) => {
    setEditForm({ ...item });
    setShowRestoreModal(true);
  };

  const handleConfirmRestoreAndUpdate = async () => {
    if (!editForm.title) {
      if (Platform.OS === 'web') alert('กรุณากรอกหัวข้อกิจกรรม');
      else Alert.alert('คำเตือน', 'กรุณากรอกหัวข้อกิจกรรม');
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
          reminder_minutes: editForm.reminder_minutes ?? null,
          status: 'pending'
        }),
      });

      if (response.ok) {
        setHistoryList((prev) => prev.filter((item) => item.id !== editForm.id));
        setShowRestoreModal(false);

        if (Platform.OS === 'web') alert(`นำกิจกรรม "${editForm.title}" กลับไปยังหน้าหลักเรียบร้อยแล้ว ✨`);
        else Alert.alert('สำเร็จ', `นำกิจกรรม "${editForm.title}" กลับไปยังหน้าหลักเรียบร้อยแล้ว ✨`);
      } else {
        throw new Error('Restore failed');
      }
    } catch (error) {
      console.error('Restore Error:', error);
      if (Platform.OS === 'web') alert('ไม่สามารถนำกิจกรรมกลับมาได้');
      else Alert.alert('ข้อผิดพลาด', 'ไม่สามารถนำกิจกรรมกลับมาได้');
    }
  };

  const handleDeletePermanent = (id: string, title: string) => {
    const executeDelete = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/activities/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setHistoryList((prev) => prev.filter((item) => item.id !== id));
          if (Platform.OS === 'web') alert(`ลบกิจกรรม "${title}" ถาวรเรียบร้อยแล้ว`);
          else Alert.alert('สำเร็จ', `ลบกิจกรรม "${title}" ถาวรเรียบร้อยแล้ว`);
        } else {
          if (Platform.OS === 'web') alert('ไม่สามารถลบกิจกรรมได้');
          else Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบกิจกรรมได้');
        }
      } catch (error) {
        console.error('Delete Error:', error);
        if (Platform.OS === 'web') alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        else Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`คุณต้องการลบกิจกรรม "${title}" ออกจากระบบถาวรใช่หรือไม่?`)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'ยืนยันการลบถาวร',
        `คุณต้องการลบกิจกรรม "${title}" ออกจากระบบถาวรใช่หรือไม่? (ไม่สามารถกู้คืนได้)`,
        [
          { text: 'ยกเลิก', style: 'cancel' },
          { text: 'ลบถาวร', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const reminderLabel = REMINDER_OPTIONS.find(r => r.value === item.reminder_minutes)?.label || 'ไม่แจ้งเตือน';

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.typeName}>[{item.type_name}]</Text>
          <View style={styles.infoRow}>
            <FontAwesome name="calendar" size={14} color="#777" style={styles.infoIcon} />
            <Text style={styles.infoText}>{item.date}</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome name="clock-o" size={14} color="#777" style={styles.infoIcon} />
            <Text style={styles.infoText}>{item.time}</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome name="map-marker" size={16} color="#777" style={styles.infoIcon} />
            <Text style={styles.infoText}>{item.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome name="bell" size={14} color="#777" style={styles.infoIcon} />
            <Text style={styles.infoText}>{reminderLabel}</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.restoreButton} onPress={() => handleOpenRestoreModal(item)}>
            <FontAwesome name="undo" size={14} color="#FFF" />
            <Text style={styles.actionText}>นำกลับ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePermanent(item.id, item.title)}>
            <FontAwesome name="trash" size={14} color="#FFF" />
            <Text style={styles.actionText}>ลบถาวร</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={18} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ประวัติกิจกรรมที่จัดเก็บ</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0F9B58" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={historyList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F9B58']} />}
          ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีประวัติกิจกรรมที่จัดเก็บ</Text>}
        />
      )}

      <Modal visible={showRestoreModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>แก้ไขและนำกลับมาหน้าหลัก</Text>
              <TouchableOpacity onPress={() => setShowRestoreModal(false)}>
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
                <TouchableOpacity 
                  style={[styles.pickerBox, { justifyContent: 'space-between' }]} 
                  onPress={() => {
                    setIsEditDropdownOpen(!isEditDropdownOpen);
                    setIsEditReminderDropdownOpen(false);
                  }}
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
                  onPress={() => {
                    setIsEditReminderDropdownOpen(!isEditReminderDropdownOpen);
                    setIsEditDropdownOpen(false);
                  }}
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
                  onChangeText={(text) => setEditForm({ ...editForm, location: text })}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleConfirmRestoreAndUpdate}>
                <Text style={styles.saveButtonText}>นำกลับไปยังกิจกรรมหลัก</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
  card: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 15, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  typeName: { fontSize: 13, color: '#0F9B58', fontWeight: 'bold', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  infoIcon: { width: 20, marginRight: 8 },
  infoText: { fontSize: 13, color: '#555' },
  actionContainer: { flexDirection: 'column', gap: 8, marginLeft: 10 },
  restoreButton: { backgroundColor: '#FF9800', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  deleteButton: { backgroundColor: '#E53935', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  detailModal: { width: '90%', maxHeight: '85%', backgroundColor: '#FFF', borderRadius: 25, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  infoGroup: { marginBottom: 15 },
  detailLabel: { fontSize: 14, color: '#777', marginBottom: 8, fontWeight: '600' },
  textInput: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 16, color: '#333' },
  pickerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  dropdownListContainer: { backgroundColor: '#FAFAFA', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden' },
  dropdownListItem: { paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  saveButton: { backgroundColor: '#0F9B58', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
