import { useState } from 'react'
import { ScanBarcode, Camera, ArrowRight, User, Clock } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import './FacilityArrival.css'

interface RecentCapture {
  refCode: string
  name: string
  time: string
}

export default function FacilityArrival() {
  const queryClient = useQueryClient()
  const [referralCode, setReferralCode] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const { data: recentCaptures = [] } = useQuery({
    queryKey: ['captures'],
    queryFn: async () => {
      const res = await apiClient.get('/capture');
      return res.data.data.map((c: any) => {
        const d = new Date(c.ts);
        return {
          refCode: c.id.substring(0, 8),
          name: c.patient_name || 'Captured Patient',
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      });
    },
  });

  const handleScan = (source: string) => {
    setReferralCode((current) => current || 'REF-2024-891A')
    console.log('Scan initiated from', source)
  }

  const handleCapture = async () => {
    if (!referralCode.trim()) {
      console.warn('Referral code is required before capture')
      return
    }

    try {
      const promiseId = referralCode.trim()
      await apiClient.post(`/promises/${promiseId}/evidence`, {
        kind: 'arrival',
        source: 'manual_code',
        confidence: 'verified',
        metadata: {
          facilityId: 'fac-1',
          referralCode: promiseId,
        },
      })

      setReferralCode('')
      queryClient.invalidateQueries({ queryKey: ['captures'] })
    } catch (error: any) {
      console.error('Capture arrival failed', error.response?.data || error.message)
    }
  }

  return (
    <div className="arrival-page animate-fadeInUp">
      <div className="arrival-header">
        <h1>Capture Arrival</h1>
        <p className="arrival-subtitle">
          Enter the referral code or scan the patient's ID to log their arrival at
          the facility. This updates the active promise and notifies the referring ASHA.
        </p>
      </div>

      <div className="arrival-card floating-card-lg">
        {/* Progress bar */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: referralCode ? '60%' : '0%' }} />
        </div>

        <div className="arrival-form">
          <label className="form-label">REFERRAL CODE / PATIENT ID</label>
          <div className={`input-wrap ${isFocused ? 'focused' : ''}`}>
            <ScanBarcode size={20} className="input-icon" />
            <input
              type="text"
              placeholder="E.G. REF-2023-891A"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="arrival-input"
            />
            <span className="input-hint">Press Enter ↵</span>
          </div>

          <div className="form-actions">
            <div className="scan-buttons">
              <button className="scan-btn" aria-label="Scan barcode" onClick={() => handleScan('barcode')}>
                <ScanBarcode size={18} />
              </button>
              <button className="scan-btn" aria-label="Scan with camera" onClick={() => handleScan('camera')}>
                <Camera size={18} />
              </button>
            </div>
            <button className="btn btn-primary capture-btn" onClick={handleCapture}>
              <span>Verify & Capture</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Recently captured */}
      <div className="recent-section animate-fadeInUp" style={{ animationDelay: '200ms' }}>
        <h3 className="section-label">RECENTLY CAPTURED</h3>
        <div className="recent-list stagger">
          {recentCaptures.map((capture: RecentCapture) => (
            <div key={capture.refCode} className="recent-item animate-fadeInUp">
              <div className="recent-icon">
                <User size={16} />
              </div>
              <div className="recent-info">
                <span className="recent-ref">{capture.refCode}</span>
                <span className="recent-name">{capture.name}</span>
              </div>
              <span className="recent-time">
                <Clock size={12} />
                {capture.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
