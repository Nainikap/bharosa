import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Users,
  CheckSquare,
  Clock,
  Shield,
  ChevronDown,
} from 'lucide-react'
import './EscalationInbox.css'

type FilterTab = 'lapsed' | 'at-risk' | 'my-ward'

interface Escalation {
  name: string
  initials: string
  initialsColor: string
  id: string
  tags: { label: string; color: string }[]
  reason: string
  reasonDesc: string
  lapsedTime: string
  lapsedLevel: 'overdue' | 'warning'
  auditVerified: boolean
  auditLog: string
}

const escalations: Escalation[] = []

export default function EscalationInbox() {
  const [activeTab, setActiveTab] = useState<FilterTab>('lapsed')

  return (
    <div className="escalation-page animate-fadeInUp">
      {/* Header */}
      <div className="escalation-header">
        <div className="escalation-header-text">
          <div className="escalation-title-row">
            <span className="escalation-accent-bar" />
            <h1>Escalation Inbox</h1>
          </div>
          <p className="escalation-subtitle">
            Critical interventions required for lapsed health promises. Ensure DPDP
            compliance while reviewing patient audit trails.
          </p>
        </div>
        <div className="escalation-stats">
          <div className="escalation-stat critical-stat">
            <span className="stat-label">CRITICAL</span>
            <span className="stat-value critical">12</span>
          </div>
          <div className="escalation-stat warning-stat">
            <span className="stat-label">WARNING</span>
            <span className="stat-value warning">34</span>
          </div>
        </div>
      </div>

      {/* Filter tabs + sort */}
      <div className="escalation-toolbar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === 'lapsed' ? 'active critical-tab' : ''}`}
            onClick={() => setActiveTab('lapsed')}
          >
            <AlertCircle size={14} />
            Lapsed (Critical)
          </button>
          <button
            className={`filter-tab ${activeTab === 'at-risk' ? 'active' : ''}`}
            onClick={() => setActiveTab('at-risk')}
          >
            <AlertTriangle size={14} />
            At Risk
          </button>
          <button
            className={`filter-tab ${activeTab === 'my-ward' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-ward')}
          >
            <Users size={14} />
            My Ward
          </button>
        </div>
        <div className="sort-control">
          <span className="sort-label">SORT BY</span>
          <button className="sort-btn">
            Time Exceeded (Desc)
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="escalation-table-wrap">
        <table className="escalation-table">
          <thead>
            <tr>
              <th>PATIENT DETAILS</th>
              <th>PROMISE / ESCALATION REASON</th>
              <th>LAPSED TIME</th>
              <th>AUDIT TRAIL (DPDP)</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody className="stagger">
            {escalations.map((esc, idx) => (
              <tr key={idx} className="escalation-row animate-fadeInUp">
                <td>
                  <div className="patient-cell">
                    <span className="patient-avatar" style={{ background: `${esc.initialsColor}20`, color: esc.initialsColor }}>
                      {esc.initials}
                    </span>
                    <div className="patient-info">
                      <span className="patient-name">{esc.name}</span>
                      <span className="patient-id">ID: {esc.id}</span>
                      <div className="patient-tags">
                        {esc.tags.map((tag, ti) => (
                          <span key={ti} className="esc-tag" style={{ background: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` }}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="reason-title">{esc.reason}</span>
                  <span className="reason-desc">{esc.reasonDesc}</span>
                </td>
                <td>
                  <div className={`lapsed-cell ${esc.lapsedLevel}`}>
                    <span className="lapsed-time">{esc.lapsedTime}</span>
                    <span className="lapsed-label">{esc.lapsedLevel === 'overdue' ? 'OVERDUE' : 'WARNING'}</span>
                  </div>
                </td>
                <td>
                  <div className="audit-cell">
                    {esc.auditVerified ? (
                      <span className="audit-status verified">
                        <Shield size={13} /> Consent Verified
                      </span>
                    ) : (
                      <span className="audit-status pending">
                        <Clock size={13} /> Pending Sync
                      </span>
                    )}
                    <span className="audit-log">Log: {esc.auditLog}</span>
                  </div>
                </td>
                <td>
                  <button className="acknowledge-btn">
                    <CheckSquare size={14} />
                    Acknowledge
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
