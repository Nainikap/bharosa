import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, UserCircle, LogIn } from 'lucide-react'
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
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
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
          setError('Wrong PIN — try again')
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
      <div className="login-container">
        <div className="login-header-section">
          <div className="login-logo-hex">⬡</div>
          <h1 className="login-title">Supervisor Login</h1>
          <p className="login-subtitle">Supervisor app · backend-first</p>
        </div>

        <form onSubmit={handleLogin} className="login-form-section">
          <div className="form-group-field">
            <div className="input-prefix">
              <UserCircle size={20} />
            </div>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="Supervisor ID"
              required
            />
          </div>

          <div className="form-group-field pin-field">
            <div className="input-prefix">
              <Lock size={20} />
            </div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN (4-6 digits)"
              maxLength={6}
              required
            />
          </div>

          {error && (
            <div className="error-text">
              {error}
            </div>
          )}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            <LogIn size={20} className="btn-icon" />
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <p className="login-footer-text">
          PIN is device-secure · Data encrypted with AES-256<br />
          Every promise, kept or strengthened
        </p>
      </div>
    </div>
  )
}
