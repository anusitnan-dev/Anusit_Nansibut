import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, Image, Modal, Alert, ActivityIndicator, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { auth } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// เวอร์ชัน Local IP (เปิดไว้สำหรับการนำเสนอสดผ่าน Expo)
const API_BASE_URL = 'http://10.75.248.236:3000';

LocaleConfig.locales['th'] = {
  monthNames: ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'],
  monthNamesShort: ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
  dayNames: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'],
  dayNamesShort: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'],
  today: 'วันนี้'
};
LocaleConfig.defaultLocale = 'th';

const DAY_COLORS: { [key: string]: { border: string; bg: string; text: string } } = {
  'จันทร์': { border: '#FBC02D', bg: '#FFFDE7', text: '#F57F17' },
  'อังคาร': { border: '#EC407A', bg: '#FCE4EC', text: '#C2185B' },
  'พุธ': { border: '#4CAF50', bg: '#E8F5E9', text: '#2E7D32' },
  'พฤหัสบดี': { border: '#FB8C00', bg: '#FFF3E0', text: '#E65100' },
  'ศุกร์': { border: '#1E88E5', bg: '#E3F2FD', text: '#1565C0' },
  'เสาร์': { border: '#AB47BC', bg: '#F3E5F5', text: '#7B1FA2' },
  'อาทิตย์': { border: '#E53935', bg: '#FFEBEE', text: '#C62828' }
};

const DAYS_LIST = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

const REMINDER_OPTIONS = [
  { label: 'ไม่แจ้งเตือน', value: null },
  { label: 'เมื่อถึงเวลากิจกรรม', value: 0 },
  { label: 'ล่วงหน้า 15 นาที', value: 15 },
  { label: 'ล่วงหน้า 30 นาที', value: 30 },
  { label: 'ล่วงหน้า 1 ชั่วโมง', value: 60 },
  { label: 'ล่วงหน้า 1 วัน', value: 1440 },
];

const parseCourseTimeRange = (timeStr: string) => {
  if (!timeStr || !timeStr.includes('-')) return { start: 0, end: 0 };
  const [startStr, endStr] = timeStr.split('-').map(s => s.trim());

  const toMinutes = (str: string) => {
    const [h, m] = str.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  return {
    start: toMinutes(startStr),
    end: toMinutes(endStr)
  };
};

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  
  const searchParams = useLocalSearchParams();
  const rawEmail = searchParams.email;
  const parsedEmail = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
  const [userEmail, setUserEmail] = useState(parsedEmail || 'User');

  const [activeTab, setActiveTab] = useState('calendar'); 
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const [activities, setActivities] = useState<any[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);

  const [selectedDay, setSelectedDay] = useState('จันทร์');
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [masterCourses, setMasterCourses] = useState<any[]>([]);

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearNum, setSelectedYearNum] = useState<number | string | null>(null); // ✅ เลขปีการศึกษาที่ไม่ซ้ำ
  const [selectedYearId, setSelectedYearId] = useState<number | string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('ภาคต้น');
  
  // State สำหรับแก้ไขวิชา
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);

  // State สำหรับ DatePicker เลือกเวลาวิชาเรียน
  const [isStartTimePickerVisible, setStartTimePickerVisibility] = useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);

  const initialLetter = userEmail ? String(userEmail).charAt(0).toUpperCase() : '?';

  const parseTimeToDate = (timeStr?: string) => {
    const d = new Date();
    if (!timeStr) return d;
    const [h, m] = timeStr.trim().split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      d.setHours(h, m, 0, 0);
    }
    return d;
  };

  const handleConfirmStartTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const newStart = `${hours}:${minutes}`;
    const currentEnd = editingCourse?.time ? editingCourse.time.split(' - ')[1] || '00:00' : '00:00';
    
    setEditingCourse((prev: any) => ({
      ...prev,
      time: `${newStart} - ${currentEnd}`
    }));
    setStartTimePickerVisibility(false);
  };

  const handleConfirmEndTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const newEnd = `${hours}:${minutes}`;
    const currentStart = editingCourse?.time ? editingCourse.time.split(' - ')[0] || '00:00' : '00:00';
    
    setEditingCourse((prev: any) => ({
      ...prev,
      time: `${currentStart} - ${newEnd}`
    }));
    setEndTimePickerVisibility(false);
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/academic-years`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setAcademicYears(data);
        
        // คำนวณปีปัจจุบันหรือหาปีตั้งต้น
        const currentYearObj = data.find((y: any) => y.is_current == 1 || y.is_current === true) || data[0];
        if (currentYearObj) {
          setSelectedYearId(currentYearObj.year_id);
          setSelectedYearNum(Number(currentYearObj.academic_year));
        }
      }
    } catch (error) {
      console.log('⚠️ ดึงข้อมูลปีการศึกษาไม่ได้:', error);
    }
  };

  const fetchActivities = async () => {
    if (!userEmail || userEmail === 'User') return;
    try {
      const response = await fetch(`${API_BASE_URL}/activities?email=${encodeURIComponent(userEmail)}`);
      if (!response.ok) return;
      const data = await response.json();
      
      const formattedData = (Array.isArray(data) ? data : [])
        .filter((item: any) => item.status !== 'archived')
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
            status: item.status || 'pending',
            type_name: item.type_name || 'ไม่ได้ระบุประเภท',
            reminder_minutes: item.reminder_minutes
          };
        });

      setActivities(formattedData);
    } catch (error) {
      console.log('⚠️ ดึงกิจกรรมไม่ได้:', error);
      setActivities([]);
    }
  };

  const fetchProfileImage = async () => {
    if (!userEmail || userEmail === 'User') return;
    try {
      const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userEmail)}`);
      if (!response.ok) return;
      const data = await response.json();
      
      const imageFileName = data.fileName || data.profile_image || data.image_url;
      if (imageFileName) {
        if (imageFileName.startsWith('http')) {
          setProfileImage(`${imageFileName}?t=${Date.now()}`);
        } else {
          setProfileImage(`${API_BASE_URL}/uploads/${imageFileName}?t=${Date.now()}`); 
        }
      }
    } catch (error) {
      console.log('❌ ดึงรูปโปรไฟล์จาก Server ล้มเหลว:', error);
    }
  };

  const fetchMasterCourses = async (yearId?: number | string | null, semester?: string) => {
    const targetYearId = yearId ?? selectedYearId;
    const targetSemester = semester ?? selectedSemester;
    if (!targetYearId) return;

    try {
      let url = `${API_BASE_URL}/subjects?year_id=${targetYearId}&semester=${encodeURIComponent(targetSemester)}`;
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();

      const formattedCourses = (Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.subject_id?.toString() || Math.random().toString(),
        code: item.subject_code || '',
        name: item.subject_name || '',
        section: item.section || '1',
        day: item.day_of_week || 'จันทร์',
        time: `${item.start_time ? item.start_time.substring(0, 5) : '00:00'} - ${item.end_time ? item.end_time.substring(0, 5) : '00:00'}`,
        room: item.room || 'ไม่ระบุ',
        lecturer: item.instructor_name || 'ไม่ระบุ'
      }));

      setMasterCourses(formattedCourses);
    } catch (error) {
      setMasterCourses([]);
    }
  };

  const fetchMyCourses = async () => {
    if (!userEmail || userEmail === 'User') return;
    try {
      const url = `${API_BASE_URL}/user-subjects?email=${encodeURIComponent(userEmail)}`;
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();
      
      const formattedMyCourses = (Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.enroll_id?.toString() || Math.random().toString(),
        subject_id: item.subject_id,
        code: item.subject_code || '',
        name: item.subject_name || '',
        section: item.section || '1',
        day: item.day_of_week || 'จันทร์',
        time: `${item.start_time ? item.start_time.substring(0, 5) : '00:00'} - ${item.end_time ? item.end_time.substring(0, 5) : '00:00'}`,
        room: item.room || 'ไม่ระบุ',
        lecturer: item.instructor_name || 'ไม่ระบุ'
      }));

      setMyCourses(formattedMyCourses);
    } catch (error) {
      console.error('❌ Error ดึงรายวิชาของฉัน:', error);
      setMyCourses([]);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('แจ้งเตือน', 'ต้องขออนุญาตเข้าถึงรูปภาพเพื่อเปลี่ยนรูปโปรไฟล์ครับ');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [1, 1],      
      quality: 0.8,        
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri); 
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
        const uploadedName = data.fileName || data.profile_image || filename;
        setProfileImage(`${API_BASE_URL}/uploads/${uploadedName}?t=${Date.now()}`); 
        Alert.alert('สำเร็จ', 'เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว ✨');
      } else {
        Alert.alert('เกิดข้อผิดพลาด', data.error || 'อัปโหลดรูปไม่สำเร็จ');
      }
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ!');
    } finally {
      setIsLoading(false);
    }
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

  useFocusEffect(
    useCallback(() => {
      if (userEmail && userEmail !== 'User') {
        fetchActivities();
        fetchProfileImage();
        fetchAcademicYears();
        fetchMyCourses();
      }
    }, [userEmail])
  );

  // ✅ เมื่อสลับปี (เลขปี) หรือภาคเรียน ให้ค้นหา year_id ที่ตรงกันแล้วดึงวิชาใหม่
  useEffect(() => {
    if (selectedYearNum && selectedSemester && academicYears.length > 0) {
      const matched = academicYears.find(
        (y: any) => Number(y.academic_year) === Number(selectedYearNum) && y.semester === selectedSemester
      );

      if (matched) {
        setSelectedYearId(matched.year_id);
        fetchMasterCourses(matched.year_id, selectedSemester);
      } else {
        setSelectedYearId(null);
        setMasterCourses([]);
      }
    }
  }, [selectedYearNum, selectedSemester, academicYears]);

  const handleAddCourse = async (course: any) => {
    // 1. เช็กวิชาซ้ำ (รหัสวิชาเดียวกัน)
    const isAlreadyAdded = myCourses.some(item => item.code === course.code);
    if (isAlreadyAdded) {
      Alert.alert('แจ้งเตือน', 'คุณได้เพิ่มรายวิชานี้เข้าตารางแล้วครับ');
      return;
    }

    // 2. เช็กเวลาเรียนซ้ำซ้อนในวันเดียวกัน
    const newCourseTime = parseCourseTimeRange(course.time);

    const conflictingCourse = myCourses.find(item => {
      if (item.day !== course.day) return false;
      const existingTime = parseCourseTimeRange(item.time);
      return newCourseTime.start < existingTime.end && newCourseTime.end > existingTime.start;
    });

    if (conflictingCourse) {
      Alert.alert(
        'เวลาเรียนซ้ำซ้อน!',
        `วัน${course.day} ช่วงเวลา ${course.time} น. ชนกับวิชา ${conflictingCourse.code} (${conflictingCourse.name}) ที่มีในตารางอยู่แล้ว`
      );
      return;
    }

    // 3. ถ้าไม่ซ้ำและเวลาไม่ชน บันทึกไปที่เซิร์ฟเวอร์
    try {
      const response = await fetch(`${API_BASE_URL}/user-subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, subject_id: parseInt(course.id) || course.id })
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert('สำเร็จ', `เพิ่มวิชา ${course.name} เรียบร้อยแล้ว ✨`);
        setShowAddSubjectModal(false);
        fetchMyCourses(); 
      } else {
        Alert.alert('เกิดข้อผิดพลาด', result.error || 'ไม่สามารถเพิ่มวิชาได้');
      }
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleRemoveCourse = (courseId: string) => {
    Alert.alert('ยืนยันการลบ', 'ต้องการลบวิชานี้ออกจากตารางเรียนใช่ไหมครับ?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ลบวิชา', 
        style: 'destructive', 
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/user-subjects/${courseId}`, {
              method: 'DELETE',
            });
            
            if (response.ok) {
              setMyCourses(myCourses.filter(c => c.id !== courseId));
              Alert.alert('สำเร็จ', 'ลบรายวิชาออกจากตารางเรียบร้อยแล้ว');
            } else {
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบรายวิชาได้');
            }
          } catch (error) {
            Alert.alert('ข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
          }
        }
      }
    ]);
  };

  const handleSaveCourseEdit = async () => {
    if (!editingCourse) return;

    try {
      const [startTime, endTime] = editingCourse.time.split(' - ');

      const payload = {
        room: editingCourse.room,
        start_time: startTime ? `${startTime.trim()}:00` : null,
        end_time: endTime ? `${endTime.trim()}:00` : null,
      };

      const response = await fetch(`${API_BASE_URL}/user-subjects/${editingCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMyCourses(prev => prev.map(c => c.id === editingCourse.id ? editingCourse : c));
        Alert.alert('สำเร็จ', 'อัปเดตข้อมูลตารางเรียนส่วนตัวเรียบร้อยแล้ว');
        setShowEditCourseModal(false);
      } else {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถแก้ไขข้อมูลได้');
      }
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    }
  };

  const renderRightActions = (id: string) => (
    <View style={styles.swipeActionsContainer}>
      <TouchableOpacity 
        style={styles.deleteSwipeBtn} 
        onPress={() => handleRemoveCourse(id)}
      >
        <FontAwesome name="trash" size={22} color="#FFF" />
        <Text style={styles.swipeText}>ลบวิชา</Text>
      </TouchableOpacity>
    </View>
  );

  const getActivityStyle = (item: any) => {
    if (item.status === 'done') return { borderLeftColor: '#4CAF50', backgroundColor: '#E8F5E9' }; 
    if (!item.date || !item.time || item.time === '--:--') {
      return { borderLeftColor: '#FBC02D', backgroundColor: '#FFFDE7' }; 
    }

    const now = new Date();
    const [year, month, day] = item.date.split('-');
    const [hour, minute] = item.time.split(':');
    const activityDateTime = new Date(Number(year), Number(month) - 1, Number(day), Number(hour || 0), Number(minute || 0));

    const diffMs = activityDateTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 0) return { borderLeftColor: '#F44336', backgroundColor: '#FFEBEE' }; 
    if (diffMins <= 60) return { borderLeftColor: '#FF9800', backgroundColor: '#FFF3E0' }; 
    return { borderLeftColor: '#FBC02D', backgroundColor: '#FFFDE7' }; 
  };

  const getThaiDayFromDate = (dateString: string) => {
    if (!dateString) return 'จันทร์';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    return days[date.getDay()]; 
  };

  const markedDates = activities.reduce((acc: any, curr: any) => {
    if (curr.date) {
      acc[curr.date] = { marked: true, dotColor: '#0F9B58' };
    }
    return acc;
  }, {});

  const courseDays = [...new Set(myCourses.map((c) => c.day))];
  const today = new Date();
  for (let i = -30; i <= 90; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (courseDays.includes(getThaiDayFromDate(dateStr))) {
      markedDates[dateStr] = { marked: true, dotColor: '#0F9B58' };
    }
  }

  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: '#007BFF'
  };

  const getStartMinutes = (timeStr: string) => {
    if (!timeStr || timeStr === '--:--') return 9999;
    const startTime = timeStr.split('-')[0].trim();
    const [hours, minutes] = startTime.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const filteredMyCourses = myCourses
    .filter(course => course.day === selectedDay)
    .sort((a, b) => getStartMinutes(a.time) - getStartMinutes(b.time));

  const searchedMasterCourses = masterCourses.filter(course => 
    course.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    course.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const getCombinedScheduleForDate = () => {
    const dayActivities = activities
      .filter((a) => a.date === selectedDate)
      .map((a) => ({ ...a, itemType: 'activity' })); 

    const thaiDay = getThaiDayFromDate(selectedDate);
    const dayCourses = myCourses
      .filter((c) => c.day === thaiDay)
      .map((c) => ({ ...c, itemType: 'course' })); 

    return [...dayCourses, ...dayActivities].sort(
      (a, b) => getStartMinutes(a.time) - getStartMinutes(b.time)
    );
  };

  // ✅ ดึงเลขปีที่ไม่ซ้ำกันเพื่อเอาไปแสดงในชิปปีการศึกษา
  const uniqueYearNumbers = [...new Set(academicYears.map((item: any) => Number(item.academic_year)))].sort((a, b) => b - a);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ตารางของฉัน</Text>
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

        {/* สลับแท็บ */}
        <View style={styles.tabWrapper}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'calendar' && styles.activeTab]} onPress={() => setActiveTab('calendar')}>
            <Text style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>ปฏิทินกิจกรรม</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.tabButton, activeTab === 'schedule' && styles.activeTab]} onPress={() => setActiveTab('schedule')}>
            <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>ตารางเรียน</Text>
          </TouchableOpacity>
        </View>

        {/* เนื้อหา */}
        <View style={styles.contentContainer}>
          {activeTab === 'calendar' ? (
            <View style={{ flex: 1 }}>
              <Calendar
                onDayPress={(day: any) => setSelectedDate(day.dateString)}
                markedDates={markedDates}
                theme={{ todayTextColor: '#0F9B58', arrowColor: '#0F9B58', selectedDayBackgroundColor: '#007BFF' }}
              />

              <View style={styles.listContainer}>
                <Text style={styles.listHeader}>ตารางของวันที่ {selectedDate}</Text>
                
                <FlatList
                  data={getCombinedScheduleForDate()}
                  keyExtractor={(item, index) => `${item.itemType}-${item.id}-${index}`}
                  renderItem={({ item }) => {
                    if (item.itemType === 'course') {
                      const dayStyle = DAY_COLORS[item.day] || DAY_COLORS['จันทร์'];
                      return (
                        <View style={[styles.card, { borderLeftColor: dayStyle.border, backgroundColor: dayStyle.bg }]}>
                          <View style={styles.cardContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.courseCode}>{item.code} (เรียน)</Text>
                              <Text style={[styles.secBadge, { backgroundColor: dayStyle.border }]}>Sec {item.section}</Text>
                            </View>
                            <Text style={styles.newCardTitle}>{item.name}</Text>
                            <View style={styles.newInfoRow}>
                              <FontAwesome name="clock-o" size={14} color="#555" style={styles.newInfoIcon} />
                              <Text style={styles.newInfoText}>{item.time} น.</Text>
                            </View>
                            <View style={styles.newInfoRow}>
                              <FontAwesome name="map-marker" size={16} color="#555" style={styles.newInfoIcon} />
                              <Text style={styles.newInfoText}>ห้อง {item.room}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    }

                    const reminderLabel = REMINDER_OPTIONS.find(r => r.value === item.reminder_minutes)?.label || 'ไม่แจ้งเตือน';

                    return (
                      <TouchableOpacity style={[styles.card, getActivityStyle(item)]} activeOpacity={0.8}>
                        <View style={styles.cardContent}>
                          <Text style={styles.newCardTitle}>{item.title}</Text>
                          <Text style={{ fontSize: 13, color: '#0F9B58', fontWeight: 'bold', marginBottom: 5 }}>
                            [{item.type_name}]
                          </Text>
                          <View style={styles.newInfoRow}>
                            <FontAwesome name="clock-o" size={14} color="#777" style={styles.newInfoIcon} />
                            <Text style={styles.newInfoText}>{item.time} น.</Text>
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
                    );
                  }}
                  ListEmptyComponent={<Text style={styles.emptyText}>ว่าง! ไม่มีเรียนและไม่มีกิจกรรม</Text>}
                />
              </View>

              <TouchableOpacity 
                style={styles.historyFabButton}
                onPress={() => router.push({ pathname: '/activity_history', params: { email: userEmail } })}
              >
                <FontAwesome name="history" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.dayFilterContainer}>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={DAYS_LIST}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => {
                    const isSelected = selectedDay === item;
                    const dayStyle = DAY_COLORS[item];
                    return (
                      <TouchableOpacity
                        style={[
                          styles.dayFilterChip,
                          isSelected && { backgroundColor: dayStyle.border }
                        ]}
                        onPress={() => setSelectedDay(item)}
                      >
                        <Text style={[styles.dayFilterText, isSelected && { color: '#FFF' }]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              <View style={styles.listContainer}>
                <View style={styles.listHeaderRow}>
                  <Text style={styles.listHeader}>วิชาเรียนวัน{selectedDay}</Text>
                  <Text style={styles.swipeHintText}>👈 ปัดซ้ายเพื่อจัดการ</Text>
                </View>

                <FlatList
                  data={filteredMyCourses}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const dayStyle = DAY_COLORS[item.day] || DAY_COLORS['จันทร์'];
                    return (
                      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                        <TouchableOpacity 
                          style={[styles.card, { borderLeftColor: dayStyle.border, backgroundColor: dayStyle.bg }]}
                          activeOpacity={0.8}
                          onPress={() => {
                            setEditingCourse({ ...item });
                            setShowEditCourseModal(true);
                          }}
                        >
                          <View style={styles.cardContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.courseCode}>{item.code}</Text>
                              <Text style={[styles.secBadge, { backgroundColor: dayStyle.border }]}>Sec {item.section}</Text>
                            </View>
                            
                            <Text style={styles.newCardTitle}>{item.name}</Text>
                            
                            <View style={styles.newInfoRow}>
                              <FontAwesome name="clock-o" size={14} color="#555" style={styles.newInfoIcon} />
                              <Text style={styles.newInfoText}>{item.time} น.</Text>
                            </View>
                            <View style={styles.newInfoRow}>
                              <FontAwesome name="map-marker" size={16} color="#555" style={styles.newInfoIcon} />
                              <Text style={styles.newInfoText}>ห้อง {item.room}</Text>
                            </View>
                            <View style={styles.newInfoRow}>
                              <FontAwesome name="user" size={14} color="#555" style={styles.newInfoIcon} />
                              <Text style={styles.newInfoText}>{item.lecturer}</Text>
                            </View>
                          </View>

                          <FontAwesome name="angle-right" size={24} color="#999" style={{ alignSelf: 'center', marginLeft: 8 }} />
                        </TouchableOpacity>
                      </Swipeable>
                    );
                  }}
                  ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีวิชาเรียนในวัน{selectedDay}</Text>}
                />
              </View>

              <TouchableOpacity 
                style={styles.fabButton}
                onPress={() => {
                  setSearchKeyword('');
                  setShowAddSubjectModal(true);
                }}
              >
                <FontAwesome name="plus" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Modal เพิ่มวิชา */}
        <Modal visible={showAddSubjectModal} transparent={true} animationType="slide" onRequestClose={() => setShowAddSubjectModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.addCourseModal}>
              <Text style={styles.modalHeaderTitle}>เพิ่มรายวิชาเข้าตารางเรียน</Text>
              
              {/* ✅ แสดงปุ่มเลือกปีการศึกษาเฉพาะตัวเลขปีที่ไม่ซ้ำกัน */}
              {uniqueYearNumbers.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, width: '100%', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#555', marginRight: 8 }}>ปีการศึกษา:</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={uniqueYearNumbers}
                    keyExtractor={(item) => item.toString()}
                    renderItem={({ item }) => {
                      const isSelected = Number(selectedYearNum) === Number(item);
                      return (
                        <TouchableOpacity
                          style={[
                            styles.yearChip,
                            isSelected && styles.selectedYearChip,
                            { paddingVertical: 4, paddingHorizontal: 10 }
                          ]}
                          onPress={() => setSelectedYearNum(item)}
                        >
                          <Text style={[styles.yearChipText, isSelected && styles.selectedYearChipText, { fontSize: 11 }]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#555', marginRight: 8 }}>ภาคเรียน:</Text>
                {['ภาคต้น', 'ภาคปลาย', 'ภาคฤดูร้อน'].map((sem) => {
                  const isSelected = selectedSemester === sem;
                  return (
                    <TouchableOpacity
                      key={sem}
                      style={[
                        styles.yearChip,
                        isSelected && styles.selectedYearChip,
                        { paddingVertical: 4, paddingHorizontal: 10, marginRight: 6 }
                      ]}
                      onPress={() => setSelectedSemester(sem)}
                    >
                      <Text style={[styles.yearChipText, isSelected && styles.selectedYearChipText, { fontSize: 11 }]}>
                        {sem}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.searchBox}>
                <FontAwesome name="search" size={16} color="#999" style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 15 }}
                  placeholder="ค้นหารหัสวิชา หรือ ชื่อวิชา..."
                  value={searchKeyword}
                  onChangeText={setSearchKeyword}
                />
              </View>

              <FlatList
                data={searchedMasterCourses}
                keyExtractor={(item) => item.id}
                style={{ width: '100%', maxHeight: 350 }}
                renderItem={({ item }) => (
                  <View style={styles.masterCourseCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0F9B58' }}>{item.code} (Sec {item.section})</Text>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#333' }}>{item.name}</Text>
                      <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>วัน{item.day} | {item.time} | ห้อง {item.room}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.addCourseBtn}
                      onPress={() => handleAddCourse(item)}
                    >
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>+ เพิ่ม</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={<Text style={[styles.emptyText, { marginVertical: 20 }]}>ไม่พบวิชาที่ค้นหาในภาคเรียนนี้</Text>}
              />

              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowAddSubjectModal(false)}>
                <Text style={{ color: '#555', fontWeight: 'bold' }}>ปิดหน้าต่าง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal แก้ไขวิชาเรียน */}
        <Modal visible={showEditCourseModal} transparent={true} animationType="slide" onRequestClose={() => setShowEditCourseModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.addCourseModal}>
              <Text style={styles.modalHeaderTitle}>แก้ไขตารางเรียนส่วนตัว</Text>
              
              {editingCourse && (
                <View style={{ width: '100%' }}>
                  <View style={{ backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, marginBottom: 15 }}>
                    <Text style={{ fontSize: 12, color: '#888', fontWeight: 'bold' }}>วิชาส่วนกลาง (แก้ไขไม่ได้):</Text>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0F9B58', marginTop: 2 }}>
                      {editingCourse.code} - {editingCourse.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                      Sec: {editingCourse.section} | ผู้สอน: {editingCourse.lecturer}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 13, color: '#333', marginBottom: 4, fontWeight: 'bold' }}>ห้องเรียน (ส่วนตัว):</Text>
                  <TextInput
                    style={styles.searchBox}
                    value={editingCourse.room}
                    onChangeText={(text) => setEditingCourse({ ...editingCourse, room: text })}
                    placeholder="ระบุห้องเรียน"
                  />

                  <Text style={{ fontSize: 13, color: '#333', marginBottom: 6, fontWeight: 'bold' }}>เวลาเรียน (กดเลือกเวลา):</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <TouchableOpacity 
                      style={[styles.searchBox, { flex: 1, marginBottom: 0, justifyContent: 'center' }]}
                      onPress={() => setStartTimePickerVisibility(true)}
                    >
                      <FontAwesome name="clock-o" size={16} color="#555" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, color: '#333' }}>
                        {editingCourse.time ? editingCourse.time.split(' - ')[0] || '00:00' : '00:00'} น.
                      </Text>
                    </TouchableOpacity>

                    <Text style={{ marginHorizontal: 8, fontSize: 16, color: '#666', fontWeight: 'bold' }}>-</Text>

                    <TouchableOpacity 
                      style={[styles.searchBox, { flex: 1, marginBottom: 0, justifyContent: 'center' }]}
                      onPress={() => setEndTimePickerVisibility(true)}
                    >
                      <FontAwesome name="clock-o" size={16} color="#555" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, color: '#333' }}>
                        {editingCourse.time ? editingCourse.time.split(' - ')[1] || '00:00' : '00:00'} น.
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <DateTimePickerModal
                    isVisible={isStartTimePickerVisible}
                    mode="time"
                    locale="th_TH"
                    date={parseTimeToDate(editingCourse.time ? editingCourse.time.split(' - ')[0] : '00:00')}
                    onConfirm={handleConfirmStartTime}
                    onCancel={() => setStartTimePickerVisibility(false)}
                    confirmTextIOS="ตกลง"
                    cancelTextIOS="ยกเลิก"
                  />

                  <DateTimePickerModal
                    isVisible={isEndTimePickerVisible}
                    mode="time"
                    locale="th_TH"
                    date={parseTimeToDate(editingCourse.time ? editingCourse.time.split(' - ')[1] : '00:00')}
                    onConfirm={handleConfirmEndTime}
                    onCancel={() => setEndTimePickerVisibility(false)}
                    confirmTextIOS="ตกลง"
                    cancelTextIOS="ยกเลิก"
                  />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, width: '100%' }}>
                    <TouchableOpacity 
                      style={{
                        flex: 1,
                        backgroundColor: '#EEEEEE',
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8
                      }} 
                      onPress={() => setShowEditCourseModal(false)}
                    >
                      <Text style={{ color: '#555', fontWeight: 'bold', fontSize: 15 }}>ยกเลิก</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={{
                        flex: 1,
                        backgroundColor: '#0F9B58',
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 8
                      }} 
                      onPress={handleSaveCourseEdit}
                    >
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>บันทึก</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal Profile */}
        <Modal visible={showProfile} transparent={true} animationType="fade" onRequestClose={() => setShowProfile(false)}>
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

        {/* Bottom Nav */}
        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12), paddingTop: 8 }]}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.replace({ pathname: '/Home', params: { email: userEmail } })}>
            <FontAwesome name="home" size={24} color="#999" />
            <Text style={styles.navText}>หน้าหลัก</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.replace({ pathname: '/activity', params: { email: userEmail } })}>
            <FontAwesome name="list-alt" size={24} color="#999" />
            <Text style={styles.navText}>กิจกรรม</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem}>
            <FontAwesome name="calendar" size={24} color="#0F9B58" />
            <Text style={[styles.navText, { color: '#0F9B58', fontWeight: 'bold' }]}>ตารางเรียน</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', elevation: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  profileIcon: { position: 'absolute', right: 15, zIndex: 10, elevation: 5, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  
  yearChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#E0E0E0', marginRight: 6 },
  selectedYearChip: { backgroundColor: '#0F9B58' },
  yearChipText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
  selectedYearChipText: { color: '#FFFFFF' },

  tabWrapper: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 30, marginHorizontal: 20, marginTop: 10, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 30, alignItems: 'center' },
  activeTab: { backgroundColor: '#0F9B58' },
  tabText: { fontSize: 16, color: '#888' },
  activeTabText: { color: '#FFFFFF', fontWeight: 'bold' },
  
  contentContainer: { flex: 1 },
  listContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15  },
  listHeader: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  swipeHintText: { fontSize: 12, color: '#888' },
  
  card: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 15, borderLeftWidth: 6, elevation: 2 },
  cardContent: { flex: 1 },
  courseCode: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  secBadge: { color: '#FFF', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  newCardTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginVertical: 4 },
  newInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  newInfoIcon: { width: 20, marginRight: 8 },
  newInfoText: { fontSize: 13, color: '#555' },
  
  swipeActionsContainer: { marginBottom: 15, marginLeft: 2 },
  deleteSwipeBtn: { width: 80, height: '100%', backgroundColor: '#F44336', justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  swipeText: { color: '#FFF', fontSize: 12, marginTop: 4, fontWeight: 'bold' },

  emptyText: { textAlign: 'center', color: '#999', fontSize: 15, marginTop: 30 },

  dayFilterContainer: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 5 },
  dayFilterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 8 },
  dayFilterText: { fontSize: 14, fontWeight: 'bold', color: '#666' },

  fabButton: { position: 'absolute', bottom: 25, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0F9B58', justifyContent: 'center', alignItems: 'center', elevation: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  addCourseModal: { width: '90%', backgroundColor: '#FFF', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: '100%', marginBottom: 15 },
  masterCourseCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  addCourseBtn: { backgroundColor: '#0F9B58', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  closeModalBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#EEE', borderRadius: 15, marginTop: 10 },

  bottomNav: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderTopWidth: 2, borderTopColor: '#D0D0D0', justifyContent: 'space-around', alignItems: 'center', elevation: 15 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navText: { fontSize: 12, marginTop: 4, color: '#777', fontWeight: 'bold' },

  profileModal: { width: '80%', backgroundColor: '#FFF', borderRadius: 30, padding: 30, alignItems: 'center' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 25 },
  logoutButton: { backgroundColor: '#F44336', paddingVertical: 12, width: '100%', borderRadius: 25, alignItems: 'center', marginBottom: 20 },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  closeButton: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#EEEEEE', borderRadius: 20, marginTop: 5 },
  closeButtonText: { color: '#555', fontSize: 16, fontWeight: 'bold' },
  historyFabButton: { position: 'absolute', bottom: 25, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#FF9800', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 }
});