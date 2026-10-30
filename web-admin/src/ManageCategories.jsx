import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './APIconfig';

function ManageCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [typeName, setTypeName] = useState('');
  const [colorCode, setColorCode] = useState('#10b981');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/activity_types`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('❌ ดึงข้อมูลล้มเหลว:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!typeName) {
      alert('กรุณากรอกชื่อประเภทกิจกรรมด้วยครับ');
      return;
    }

    if (isEditing) {
      try {
        const response = await fetch(`${API_BASE_URL}/activity_types/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type_name: typeName, color_code: colorCode })
        });

        if (response.ok) {
          alert('อัปเดตข้อมูลสำเร็จ!');
          resetForm();
          fetchCategories();
        }
      } catch (error) {
        console.error('อัปเดตล้มเหลว:', error);
      }
    } else {
      try {
        const response = await fetch(`${API_BASE_URL}/activity_types`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type_name: typeName, color_code: colorCode })
        });

        if (response.ok) {
          alert('เพิ่มประเภทกิจกรรมสำเร็จ!');
          resetForm();
          fetchCategories();
        }
      } catch (error) {
        console.error('เพิ่มข้อมูลล้มเหลว:', error);
      }
    }
  };

  const handleEditClick = (item) => {
    setIsEditing(true);
    setEditId(item.type_id);
    setTypeName(item.type_name);
    setColorCode(item.color_code);
  };

  const handleDeleteClick = async (id, name) => {
    if (window.confirm(`คุณแน่ใจใช่ไหมว่าจะลบประเภท "${name}"?`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/activity_types/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          alert('ลบข้อมูลเรียบร้อยแล้ว');
          fetchCategories();
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
    setTypeName('');
    setColorCode('#10b981');
  };

  const menuStyle = {
    padding: '12px 16px', marginBottom: '8px', backgroundColor: 'transparent',
    color: 'white', border: 'none', borderRadius: '8px', textAlign: 'left',
    fontSize: '16px', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', margin: '-8px' }}>
      <div style={{ width: '260px', backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#38bdf8' }}>⚙️ Admin Panel</h2>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <button onClick={() => navigate('/dashboard')} style={menuStyle}>🏠 หน้าหลัก</button>
          <button onClick={() => navigate('/subjects')} style={menuStyle}>📚 จัดการรายวิชา</button>
          <button style={{ ...menuStyle, backgroundColor: '#334155' }}>🏷️ จัดการประเภทกิจกรรม</button> 
        </div>
        <button onClick={() => navigate('/')} style={{ ...menuStyle, backgroundColor: '#ef4444', justifyContent: 'center' }}>🚪 ออกจากระบบ</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ backgroundColor: 'white', padding: '20px 30px', borderBottom: '1px solid #e2e8f0' }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>🏷️ จัดการประเภทกิจกรรม</h1>
        </div>

        <div style={{ padding: '30px', overflowY: 'auto', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          
          <div style={{ width: '360px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: isEditing ? '#0284c7' : '#1e293b' }}>
              {isEditing ? '📝 แก้ไขประเภทกิจกรรม' : '+ เพิ่มประเภทกิจกรรมใหม่'}
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>ชื่อประเภทกิจกรรม:</label>
                <input 
                  type="text" placeholder="เช่น กิจกรรมบังคับ, จิตอาสา..." value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>เลือกสีแท็กประเภทกิจกรรม:</label>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                  <input 
                    type="color" value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    style={{ width: '50px', height: '38px', padding: '2px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>เลือกสีจากจานสี หรือคลิกแม่สีแนะนำด้านล่าง</span>
                </div>

                {/* 🌟 จานแม่สีแนะนำระบุประเภทชัดเจน */}
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>
                    💡 แม่สีมาตรฐานแบ่งตามประเภท:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button 
                      type="button" 
                      onClick={() => setColorCode('#10b981')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #a7f3d0', background: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                      <span style={{ fontSize: '13px', color: '#065f46', fontWeight: 'bold' }}>🟢 สีเขียว: จิตอาสา / บำเพ็ญประโยชน์</span>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setColorCode('#3b82f6')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block' }}></span>
                      <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: 'bold' }}>🔵 สีน้ำเงิน: การเรียน / วิชาการ / สอบ</span>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setColorCode('#f97316')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fed7aa', background: '#fff7ed', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f97316', display: 'inline-block' }}></span>
                      <span style={{ fontSize: '13px', color: '#9a3412', fontWeight: 'bold' }}>🟠 สีส้ม: กิจกรรมคณะ / มหาวิทยาลัย</span>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setColorCode('#a855f7')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e9d5ff', background: '#faf5ff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#a855f7', display: 'inline-block' }}></span>
                      <span style={{ fontSize: '13px', color: '#6b21a8', fontWeight: 'bold' }}>🟣 สีม่วง: นัดหมายส่วนตัว / ไลฟ์สไตล์</span>
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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

          <div style={{ flex: 1, backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>📋 รายการประเภทกิจกรรมที่มีในระบบ</h3>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', width: '90px' }}>รหัส (ID)</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>การ์ดแสดงผลกิจกรรม (UI Preview)</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', width: '160px', textAlign: 'center' }}>จัดการข้อมูล</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((item) => (
                  <tr key={item.type_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', color: '#64748b' }}>#{item.type_id}</td>
                    
                    <td style={{ padding: '12px' }}>
                      <div style={{ 
                        backgroundColor: item.color_code, 
                        color: 'white', 
                        padding: '8px 20px', 
                        borderRadius: '8px', 
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.3)', 
                        minWidth: '150px',
                        justifyContent: 'center'
                      }}>
                        🏷️ {item.type_name}
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => handleEditClick(item)} style={{ padding: '6px 12px', backgroundColor: '#eab308', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ✏️ แก้ไข
                        </button>

                        <button onClick={() => handleDeleteClick(item.type_id, item.type_name)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🗑️ ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {categories.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>ยังไม่มีข้อมูลในระบบ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ManageCategories;