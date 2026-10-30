import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './APIconfig';

// 🟢 ตัวช่วยกำหนดลำดับวัน (จันทร์ -> อาทิตย์)
const DAY_ORDER = {
  'จันทร์': 1,
  'อังคาร': 2,
  'พุธ': 3,
  'พฤหัสบดี': 4,
  'ศุกร์': 5,
  'เสาร์': 6,
  'อาทิตย์': 7
};

function ManageSubjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  
  // State สำหรับช่องค้นหา
  const [searchTerm, setSearchTerm] = useState('');

  // State สำหรับฟอร์มรายวิชา
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [section, setSection] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('จันทร์');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [instructor, setInstructor] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // 🟢 State สำหรับจัดการปีการศึกษา และภาคการศึกษา
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2569);
  const [selectedSemester, setSelectedSemester] = useState('ภาคต้น');
  
  // Modal State
  const [showYearModal, setShowYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [semesterInput, setSemesterInput] = useState('ภาคต้น'); // 🟢 เพิ่ม State ภาคเรียนใน Modal
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  // 🟢 ค้นหา year_id ที่ตรงกับ ปีการศึกษา + ภาคการศึกษา ที่เลือกอยู่
  const activeYearObj = academicYears.find(
    y => Number(y.academic_year) === Number(selectedYear) && y.semester === selectedSemester
  );

  useEffect(() => {
    if (activeYearObj) {
      fetchSubjects(activeYearObj.year_id);
    } else {
      setSubjects([]);
    }
  }, [selectedYear, selectedSemester, academicYears]);

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/academic-years`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setAcademicYears(data);
        const currentObj = data.find(y => y.is_current);
        if (currentObj) {
          setSelectedYear(currentObj.academic_year);
          setSelectedSemester(currentObj.semester || 'ภาคต้น');
        } else if (data.length > 0) {
          setSelectedYear(data[0].academic_year);
        }
      }
    } catch (error) {
      console.error('❌ ดึงข้อมูลปีการศึกษาล้มเหลว:', error);
    }
  };

  const fetchSubjects = async (yearId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subjects?year_id=${yearId}&semester=${selectedSemester}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const sortedData = [...data].sort((a, b) => {
          const dayA = DAY_ORDER[a.day_of_week] || 99;
          const dayB = DAY_ORDER[b.day_of_week] || 99;
          if (dayA !== dayB) return dayA - dayB;
          return (a.start_time || '').localeCompare(b.start_time || '');
        });
        setSubjects(sortedData);
      }
    } catch (error) {
      console.error('❌ ดึงข้อมูลวิชาล้มเหลว:', error);
    }
  };

  // 🟢 ฟังก์ชันเพิ่ม/แก้ไข ช่วงเวลาภาคเรียน
  const handleAddYear = async () => {
    if (!newYearInput || !/^\d{4}$/.test(newYearInput)) {
      alert('⚠️ กรุณากรอกปีการศึกษาเป็นตัวเลข 4 หลัก (เช่น 2569)');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/academic-years`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          academic_year: Number(newYearInput), 
          semester: semesterInput, // 🟢 ส่งภาคเรียนที่เลือกระบุไปตรงๆ
          set_as_current: false,
          semester_start_date: startDateInput || null,
          semester_end_date: endDateInput || null
        })
      });

      if (response.ok) {
        alert(`บันทึกช่วงเวลา ปี ${newYearInput} (${semesterInput}) สำเร็จ!`);
        setNewYearInput('');
        setStartDateInput('');
        setEndDateInput('');
        setShowYearModal(false);
        fetchAcademicYears();
      } else {
        const errorData = await response.json();
        alert(`⚠️ ${errorData.error || 'บันทึกไม่สำเร็จ'}`);
      }
    } catch (error) {
      console.error('บันทึกปีการศึกษาล้มเหลว:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!activeYearObj) {
      alert('⚠️ ไม่พบช่วงเวลาของปีการศึกษาและภาคเรียนที่เลือก กรุณาตั้งค่าช่วงเวลาก่อนครับ');
      return;
    }

    if (!subjectCode || !subjectName || !startTime || !endTime) {
      alert('⚠️ กรุณากรอก รหัสวิชา, ชื่อวิชา และเวลาเรียน ให้ครบถ้วนครับ');
      return;
    }

    if (!/^\d+$/.test(subjectCode)) {
      alert('⚠ รหัสวิชาต้องเป็น "ตัวเลข" เท่านั้นครับ');
      return;
    }

    if (section && !/^\d+$/.test(section)) {
      alert('⚠️ หมู่เรียน (Sec) ต้องเป็น "ตัวเลข" เท่านั้นครับ');
      return;
    }

    if (startTime >= endTime) {
      alert('⚠️ เวลาจบเรียน ต้องอยู่หลังเวลาเริ่มเรียนครับ');
      return;
    }

    const payload = {
      subject_code: subjectCode,
      subject_name: subjectName,
      section: section,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      room: room,
      instructor_name: instructor,
      year_id: activeYearObj.year_id,
      semester: selectedSemester
    };

    if (isEditing) {
      try {
        const response = await fetch(`${API_BASE_URL}/subjects/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          alert('อัปเดตวิชาสำเร็จ!');
          resetForm();
          if (activeYearObj) fetchSubjects(activeYearObj.year_id);
        }
      } catch (error) {
        console.error('อัปเดตล้มเหลว:', error);
      }
    } else {
      try {
        const response = await fetch(`${API_BASE_URL}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          alert('เพิ่มวิชาใหม่สำเร็จ!');
          resetForm();
          if (activeYearObj) fetchSubjects(activeYearObj.year_id);
        }
      } catch (error) {
        console.error('เพิ่มข้อมูลล้มเหลว:', error);
      }
    }
  };

  const handleEditClick = (item) => {
    setIsEditing(true);
    setEditId(item.subject_id);
    setSubjectCode(item.subject_code);
    setSubjectName(item.subject_name);
    setSection(item.section || '');
    setDayOfWeek(item.day_of_week || 'จันทร์');
    setStartTime(item.start_time || '');
    setEndTime(item.end_time || '');
    setRoom(item.room || '');
    setInstructor(item.instructor_name || '');
  };

  const handleDeleteClick = async (id, code) => {
    if (window.confirm(`คุณแน่ใจใช่ไหมว่าจะลบวิชา "${code}"?`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          alert('ลบข้อมูลเรียบร้อยแล้ว');
          if (activeYearObj) fetchSubjects(activeYearObj.year_id);
          if (editId === id) resetForm();
        }
      } catch (error) {
        console.error('ลบข้อมูลล้มเหลว:', error);
      }
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setSubjectCode('');
    setSubjectName('');
    setSection('');
    setDayOfWeek('จันทร์');
    setStartTime('');
    setEndTime('');
    setRoom('');
    setInstructor('');
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5); 
  };

  // 🟢 Status Badge คำนวณตาม activeYearObj ปัจจุบัน
  const renderSemesterStatus = () => {
    if (!activeYearObj || !activeYearObj.semester_start_date || !activeYearObj.semester_end_date) {
      return <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '13px' }}>ℹ️ ไม่ได้กำหนดวันเปิด-ปิดเทอม</span>;
    }

    const today = new Date().toISOString().split('T')[0];
    const { semester_start_date: start, semester_end_date: end } = activeYearObj;

    if (today < start) {
      return <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#b45309', fontSize: '13px', fontWeight: 'bold' }}>⏳ ยังไม่ถึงวันเปิดเทอม ({start})</span>;
    } else if (today >= start && today <= end) {
      return <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#d1fae5', color: '#047857', fontSize: '13px', fontWeight: 'bold' }}>🟢 กำลังเปิดภาคเรียน (แสดงในแอป)</span>;
    } else {
      return <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#ffe4e6', color: '#be123c', fontSize: '13px', fontWeight: 'bold' }}>🔴 หมดภาคเรียน (ซ่อนในแอปแล้ว)</span>;
    }
  };

  const filteredSubjects = subjects.filter(item => 
    (item.subject_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const menuStyle = {
    padding: '12px 16px', marginBottom: '8px', backgroundColor: 'transparent',
    color: 'white', border: 'none', borderRadius: '8px', textAlign: 'left',
    fontSize: '16px', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center'
  };

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', marginTop: '10px' };

  // ดึงรายการปีที่ไม่ซ้ำกันเพื่อแสดงใน Dropdown เลือกปี
  const uniqueYears = [...new Set(academicYears.map(y => y.academic_year))];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', margin: '-8px' }}>
      
      {/* Sidebar */}
      <div style={{ width: '260px', backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#38bdf8' }}>⚙️ Admin Panel</h2>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <button onClick={() => navigate('/dashboard')} style={menuStyle}>🏠 หน้าหลัก</button>
          <button style={{ ...menuStyle, backgroundColor: '#334155' }}>📚 จัดการรายวิชา</button>
          <button onClick={() => navigate('/categories')} style={menuStyle}>🏷️ จัดการประเภทกิจกรรม</button> 
        </div>
        <button onClick={() => navigate('/')} style={{ ...menuStyle, backgroundColor: '#ef4444', justifyContent: 'center' }}>🚪 ออกจากระบบ</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ backgroundColor: 'white', padding: '20px 30px', borderBottom: '1px solid #e2e8f0' }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>📚 จัดการรายวิชา (Master Subjects)</h1>
        </div>

        {/* Bar เลือกปีการศึกษา และ ภาคการศึกษา */}
        <div style={{ backgroundColor: 'white', padding: '16px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', color: '#1e293b' }}>📅 ปีการศึกษา:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))} 
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
            >
              {uniqueYears.map((year) => (
                <option key={year} value={year}>
                  ปีการศึกษา {year}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', color: '#1e293b' }}>📘 ภาคการศึกษา:</label>
            <select 
              value={selectedSemester} 
              onChange={(e) => setSelectedSemester(e.target.value)} 
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
            >
              <option value="ภาคต้น">ภาคต้น</option>
              <option value="ภาคปลาย">ภาคปลาย</option>
              <option value="ภาคฤดูร้อน">ภาคฤดูร้อน</option>
            </select>
          </div>

          {/* แสดงสถานะการเปิด-ปิดภาคเรียน */}
          {renderSemesterStatus()}

          <button 
            onClick={() => {
              setNewYearInput(String(selectedYear));
              setSemesterInput(selectedSemester);
              setShowYearModal(true);
            }} 
            style={{ padding: '8px 14px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}
          >
            ➕ ตั้งค่าวันเปิด-ปิดเทอม
          </button>
        </div>

        {/* Main Content Area */}
        <div style={{ padding: '30px', overflowY: 'auto', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          
          {/* Form */}
          <div style={{ width: '350px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: isEditing ? '#0284c7' : '#1e293b' }}>
              {isEditing ? '📝 แก้ไขรายวิชา' : '+ เพิ่มรายวิชาใหม่'}
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>รหัสวิชา:</label>
                  <input type="text" placeholder="เช่น 01204111" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ width: '80px' }}>
                  <label style={labelStyle}>หมู่ (Sec):</label>
                  <input type="text" placeholder="เช่น 1" value={section} onChange={(e) => setSection(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <label style={labelStyle}>ชื่อวิชา:</label>
              <input type="text" placeholder="เช่น Computer Programming" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} style={inputStyle} />

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>วันเรียน:</label>
                  <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} style={inputStyle}>
                    <option value="จันทร์">จันทร์</option>
                    <option value="อังคาร">อังคาร</option>
                    <option value="พุธ">พุธ</option>
                    <option value="พฤหัสบดี">พฤหัสบดี</option>
                    <option value="ศุกร์">ศุกร์</option>
                    <option value="เสาร์">เสาร์</option>
                    <option value="อาทิตย์">อาทิตย์</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>ห้องเรียน:</label>
                  <input type="text" placeholder="เช่น SC1-100" value={room} onChange={(e) => setRoom(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>เวลาเริ่ม:</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>เวลาจบ:</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <label style={labelStyle}>ชื่ออาจารย์ผู้สอน:</label>
              <input type="text" placeholder="เช่น ดร.สมชาย ใจดี" value={instructor} onChange={(e) => setInstructor(e.target.value)} style={inputStyle} />

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: isEditing ? '#0284c7' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                  {isEditing ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}
                </button>
                {isEditing && (
                  <button type="button" onClick={resetForm} style={{ padding: '12px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Table Area */}
          <div style={{ flex: 1, backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>📋 คลังรายวิชา ({selectedYear} / {selectedSemester})</h3>
              
              <input 
                type="text" 
                placeholder="🔍 ค้นหารหัส หรือ ชื่อวิชา..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', width: '220px' }} 
              />
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>รหัส-หมู่</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>ชื่อวิชา</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>วัน/เวลา</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>ห้อง</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((item) => (
                  <tr key={item.subject_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{item.subject_code} <span style={{ color: '#64748b' }}>(Sec {item.section})</span></td>
                    <td style={{ padding: '12px' }}>{item.subject_name}</td>
                    
                    <td style={{ padding: '12px' }}>
                      {item.day_of_week} <br/>
                      <span style={{ color: '#64748b', fontSize: '12px' }}>
                        {formatTime(item.start_time)} - {formatTime(item.end_time)} น.
                      </span>
                    </td>
                    
                    <td style={{ padding: '12px' }}>{item.room}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => handleEditClick(item)} style={{ padding: '4px 8px', backgroundColor: '#eab308', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️ แก้ไข</button>
                        <button onClick={() => handleDeleteClick(item.subject_id, item.subject_code)} style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️ ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSubjects.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>ไม่พบข้อมูลรายวิชาในเทอมนี้</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Modal ตั้งค่าวันเปิด-ปิดเทอม */}
      {showYearModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '360px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>⚙️ ตั้งค่าวันเปิด-ปิดเทอม</h3>
            
            <label style={labelStyle}>ปีการศึกษา (4 หลัก):</label>
            <input 
              type="text" 
              placeholder="เช่น 2569" 
              value={newYearInput} 
              onChange={(e) => setNewYearInput(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>ภาคการศึกษา:</label>
            <select 
              value={semesterInput} 
              onChange={(e) => setSemesterInput(e.target.value)}
              style={inputStyle}
            >
              <option value="ภาคต้น">ภาคต้น</option>
              <option value="ภาคปลาย">ภาคปลาย</option>
              <option value="ภาคฤดูร้อน">ภาคฤดูร้อน</option>
            </select>

            <label style={labelStyle}>วันเปิดภาคเรียน:</label>
            <input 
              type="date" 
              value={startDateInput} 
              onChange={(e) => setStartDateInput(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>วันสิ้นสุดภาคเรียน:</label>
            <input 
              type="date" 
              value={endDateInput} 
              onChange={(e) => setEndDateInput(e.target.value)}
              style={inputStyle}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowYearModal(false)} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleAddYear} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManageSubjects;