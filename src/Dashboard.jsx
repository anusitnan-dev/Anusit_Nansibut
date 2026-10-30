import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './APIconfig';

function Dashboard() {
  const navigate = useNavigate();

  // State เก็บข้อมูลสถิติและการกรอง
  const [academicYears, setAcademicYears] = useState([]); // ข้อมูล raw ทั้งหมดจาก DB
  const [uniqueYearNumbers, setUniqueYearNumbers] = useState([]); // เลขปีไม่ซ้ำ เช่น [2569, 2570, 2571]
  const [selectedYearNum, setSelectedYearNum] = useState(''); // เลขปีที่เลือก เช่น 2569
  const [selectedSemester, setSelectedSemester] = useState('ภาคต้น'); // ภาคการศึกษาที่เลือก

  // State เก็บลิสต์รายการข้อมูลสำหรับแสดงในตาราง
  const [subjects, setSubjects] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);

  // 1. โหลดข้อมูลปีการศึกษาและประเภทกิจกรรมเมื่อเปิดหน้า
  useEffect(() => {
    fetchAcademicYears();
    fetchActivityTypes();
  }, []);

  // 2. เมื่อเลือกเปลี่ยน "ปีการศึกษา (เลขปี)" หรือ "ภาคการศึกษา" ให้หา year_id ที่ตรงกันแล้วดึงวิชา
  useEffect(() => {
    if (selectedYearNum && selectedSemester && academicYears.length > 0) {
      // ค้นหา year_id ที่ตรงทั้ง ปีการศึกษา และ ภาคการศึกษา
      const matchedYear = academicYears.find(
        y => Number(y.academic_year) === Number(selectedYearNum) && y.semester === selectedSemester
      );

      if (matchedYear) {
        fetchSubjects(matchedYear.year_id, selectedSemester);
      } else {
        // หากยังไม่มีข้อมูลเทอมนั้นใน DB ให้เซ็ตวิชาเป็นตารางว่าง
        setSubjects([]);
      }
    }
  }, [selectedYearNum, selectedSemester, academicYears]);

  const fetchAcademicYears = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/academic-years`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setAcademicYears(data);

        // ดึงรายการเลขปีการศึกษาแบบไม่ซ้ำกัน (เช่น [2571, 2570, 2569])
        const uniqueYears = [...new Set(data.map(y => Number(y.academic_year)))].sort((a, b) => b - a);
        setUniqueYearNumbers(uniqueYears);

        // คำนวณปีการศึกษาปัจจุบันจากวันเวลาจริงของเครื่อง
        const today = new Date();
        let realCurrentBE = today.getFullYear() + 543;
        if (today.getMonth() < 4) realCurrentBE -= 1;

        const defaultYear = uniqueYears.includes(realCurrentBE) ? realCurrentBE : uniqueYears[0];
        setSelectedYearNum(defaultYear);
      }
    } catch (err) {
      console.error('ดึงข้อมูลปีการศึกษาล้มเหลว:', err);
    }
  };

  // ดึงวิชาแบบระบุทั้ง year_id และ semester
  const fetchSubjects = async (yearId, semester) => {
    try {
      const res = await fetch(`${API_BASE_URL}/subjects?year_id=${yearId}&semester=${semester}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubjects(data);
      } else {
        setSubjects([]);
      }
    } catch (err) {
      console.error('ดึงข้อมูลวิชาล้มเหลว:', err);
    }
  };

  const fetchActivityTypes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/activity_types`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setActivityTypes(data);
      }
    } catch (err) {
      console.error('ดึงข้อมูลประเภทกิจกรรมล้มเหลว:', err);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
  };

  const menuStyle = {
    padding: '12px 16px', marginBottom: '8px', backgroundColor: 'transparent',
    color: 'white', border: 'none', borderRadius: '8px', textAlign: 'left',
    fontSize: '16px', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center'
  };

  const cardStyle = {
    flex: 1, backgroundColor: 'white', padding: '24px', borderRadius: '12px',
    border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex', flexDirection: 'column', gap: '8px'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', margin: '-8px' }}>
      
      {/* Sidebar */}
      <div style={{ width: '260px', backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#38bdf8' }}>⚙️ Admin Panel</h2>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <button style={{ ...menuStyle, backgroundColor: '#334155' }}>🏠 หน้าหลัก</button>
          <button onClick={() => navigate('/subjects')} style={menuStyle}>📚 จัดการรายวิชา</button>
          <button onClick={() => navigate('/categories')} style={menuStyle}>🏷️ จัดการประเภทกิจกรรม</button>
        </div>
        <button onClick={() => navigate('/')} style={{ ...menuStyle, backgroundColor: '#ef4444', justifyContent: 'center' }}>🚪 ออกจากระบบ</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {/* Header Bar */}
        <div style={{ backgroundColor: 'white', padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>📊 แผงควบคุมระบบ (Dashboard)</h1>
          
          {/* ตัวเลือกปีการศึกษา และ ภาคการศึกษา */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            
            {/* 1. เลือกปีการศึกษา (เลขปีไม่ซ้ำ) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontWeight: 'bold', color: '#475569' }}>📅 ปีการศึกษา:</label>
              <select 
                value={selectedYearNum} 
                onChange={(e) => setSelectedYearNum(Number(e.target.value))}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
              >
                {uniqueYearNumbers.map((yearNum) => (
                  <option key={yearNum} value={yearNum}>
                    ปีการศึกษา {yearNum}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. เลือกภาคการศึกษา */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontWeight: 'bold', color: '#475569' }}>📘 ภาคการศึกษา:</label>
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

          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 3 Cards สรุปสถิติแถวบน */}
          <div style={{ display: 'flex', gap: '20px' }}>
            
            <div style={{ ...cardStyle, borderLeft: '6px solid #0284c7' }}>
              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>📅 ปีการศึกษาที่เลือก</span>
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{selectedYearNum || '-'}</span>
              <span style={{ fontSize: '12px', color: '#0284c7' }}>ภาคเรียน: {selectedSemester}</span>
            </div>

            <div style={{ ...cardStyle, borderLeft: '6px solid #10b981' }}>
              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>📚 รายวิชาทั้งหมด ({selectedSemester})</span>
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{subjects.length} วิชา</span>
              <span style={{ fontSize: '12px', color: '#10b981' }}>เปิดสอนตามปีและเทอมที่เลือก</span>
            </div>

            <div style={{ ...cardStyle, borderLeft: '6px solid #8b5cf6' }}>
              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>🏷️ ประเภทกิจกรรม</span>
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{activityTypes.length} ประเภท</span>
              <span style={{ fontSize: '12px', color: '#8b5cf6' }}>หมวดหมู่กิจกรรมทั้งหมด</span>
            </div>

          </div>

          {/* ตารางแสดงรายการข้อมูลด้านล่าง */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            
            {/* ตารางแสดงวิชา (ซ้าย) */}
            <div style={{ flex: 1.2, backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>📋 รายการรายวิชา ({selectedSemester})</h3>
                <button 
                  onClick={() => navigate('/subjects')} 
                  style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#0284c7', fontWeight: 'bold' }}
                >
                  จัดการวิชา ➔
                </button>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0' }}>รหัส-หมู่</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0' }}>ชื่อวิชา</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0' }}>วัน/เวลา</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0' }}>ห้อง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((item) => (
                      <tr key={item.subject_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#1e293b' }}>
                          {item.subject_code} <span style={{ color: '#64748b', fontSize: '12px' }}>(Sec {item.section})</span>
                        </td>
                        <td style={{ padding: '10px' }}>{item.subject_name}</td>
                        <td style={{ padding: '10px', fontSize: '13px' }}>
                          {item.day_of_week} <br/>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>
                            {formatTime(item.start_time)} - {formatTime(item.end_time)} น.
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#475569' }}>{item.room || '-'}</td>
                      </tr>
                    ))}
                    {subjects.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                          ไม่มีรายวิชาเปิดสอนใน {selectedSemester} ปีการศึกษา {selectedYearNum}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ตารางแสดงประเภทกิจกรรม (ขวา) */}
            <div style={{ flex: 0.8, backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>🏷️ ประเภทกิจกรรมทั้งหมด</h3>
                <button 
                  onClick={() => navigate('/categories')} 
                  style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#8b5cf6', fontWeight: 'bold' }}
                >
                  จัดการประเภท ➔
                </button>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', width: '60px' }}>ลำดับ</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0' }}>ชื่อประเภทกิจกรรม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityTypes.map((type, idx) => (
                      <tr key={type.type_id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', color: '#64748b', fontWeight: 'bold' }}>{idx + 1}</td>
                        <td style={{ padding: '10px', fontWeight: '500', color: '#1e293b' }}>
                          {type.type_name || type.category_name || type.name}
                        </td>
                      </tr>
                    ))}
                    {activityTypes.length === 0 && (
                      <tr>
                        <td colSpan="2" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                          ยังไม่มีประเภทกิจกรรมในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}

export default Dashboard;