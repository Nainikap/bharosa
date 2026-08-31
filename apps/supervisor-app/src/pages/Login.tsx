import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock, Activity, UserCircle } from 'lucide-react'
import axios from 'axios'
import './Login.css'

export default function Login() {
  const [deviceId, setDeviceId] = useState('dev-supervisor-123')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://bharosa-api.onrender.com/api'

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      navigate('/')
    }
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await axios.post(`${API_BASE}/auth/device/login`, {
        deviceId,
        pin,
      })
      localStorage.setItem('accessToken', data.accessToken)
      navigate('/')
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/device/register`, {
            deviceId,
            role: 'supervisor',
            workerId: 'worker-sup-1',
            facilityId: 'fac-1',
            pin,
          })
          localStorage.setItem('accessToken', data.accessToken)
          navigate('/')
        } catch (regErr: any) {
          setError('Failed to register device. Invalid PIN or Device ID.')
        }
      } else {
        setError('Login failed. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="brand-logo">
          <Activity size={32} />
        </div>
        <h1 className="brand-title">Bharosa Supervisor</h1>
        <p className="brand-subtitle">Health Management System</p>
      </div>

      <div className="login-card floating-card">
        <div className="login-header">
          <h2>Welcome Back</h2>
          <p>Secure login with your registered device ID and PIN</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>DEVICE ID</label>
            <div className="input-with-icon">
              <UserCircle size={20} className="input-icon" />
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="e.g. dev-supervisor-123"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>PIN</label>
            <div className="input-with-icon">
              <Lock size={20} className="input-icon" />
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter your 4-digit PIN"
                maxLength={6}
                required
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              <Shield size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>

      <p className="login-footer">
        End-to-End Encrypted <br /> Ministry of Health Services
      </p>
    </div>
  )
}
