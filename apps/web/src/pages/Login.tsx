import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaCode] = useState(Math.floor(100000 + Math.random() * 900000).toString());

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Bypass validation for testing
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      {/* Gov Header */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)' }} />
      <header style={{ background: '#ffffff', padding: '16px 40px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem of India" style={{ height: '60px' }} />
          <div>
            <h1 style={{ fontSize: '20px', color: '#111', margin: 0, fontWeight: 700 }}>Ministry of Health and Family Welfare</h1>
            <p style={{ color: '#555', fontSize: '14px', margin: 0 }}>Government of India</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '22px', color: '#003366', margin: 0, fontWeight: 700 }}>Bharosa Portal</h2>
          <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Centralized Promise Tracking System</p>
        </div>
      </header>

      {/* Login Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '4px', width: '420px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#003366', color: '#fff', padding: '12px 20px', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', borderBottom: '3px solid #FF9933' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Nodal Officer Login</h3>
          </div>
          
          <div style={{ padding: '24px' }}>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#333' }}>User ID</label>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #bbb', borderRadius: '2px', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#333' }}>Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #bbb', borderRadius: '2px', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#333' }}>Security Code</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', fontSize: '20px', letterSpacing: '4px', fontWeight: 'bold', color: '#003366', fontStyle: 'italic', textDecoration: 'line-through' }}>
                    {captchaCode}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter code"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    style={{ flex: 1, padding: '10px', border: '1px solid #bbb', borderRadius: '2px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <button type="submit" style={{ width: '100%', background: '#003366', color: '#fff', border: 'none', padding: '12px', fontSize: '15px', fontWeight: 600, borderRadius: '2px', cursor: 'pointer' }}>
                Sign In
              </button>
              
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <a href="#" style={{ color: '#003366', fontSize: '13px', textDecoration: 'underline' }}>Forgot Password?</a>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <footer style={{ background: '#333', color: '#ddd', padding: '12px', textAlign: 'center', fontSize: '12px' }}>
        Content owned, updated and maintained by the Ministry of Health and Family Welfare, Government of India.
      </footer>
    </div>
  );
}
