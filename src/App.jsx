import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import ManageCategories from './ManageCategories';
import ManageSubjects from './ManageSubjects';
import logo from './assets/LOGO_UniNot2.png';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); 
  
  const handleLogin = (e) => {
    e.preventDefault();
    
    if (username === 'admin' && password === '1234') {
      navigate('/dashboard');
    } else {
      alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5', margin: '-8px' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '320px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#333' }}>ระบบจัดการหลังบ้าน</h2>
        <img 
          src={logo} 
          alt="UniNoti Logo" 
          style={{ width: '130px', height: 'auto', margin: '0 auto 16px auto', display: 'block' }} 
        />
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" placeholder="ชื่อผู้ใช้" value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <input 
            type="password" placeholder="รหัสผ่าน" value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <button 
            type="submit" 
            style={{ padding: '12px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/categories" element={<ManageCategories />} />
        <Route path="/subjects" element={<ManageSubjects />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;