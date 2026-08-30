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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
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

const getInitialsColor = (id: string) => {
  const colors = ['#e53935', '#d81b60', '#8e24aa', '#3949ab', '#1e88e5', '#00acc1', '#43a047', '#ff8f00'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const mapPromiseToEscalation = (p: any): Escalation => {
  const name = p.committedTo?.facilityId || 'Unknown Patient';
  
  let lapsedTime = 'Unknown';
  let lapsedLevel: 'overdue' | 'warning' = 'warning';
  if (p.deadline) {
    const diff = Date.now() - new Date(p.deadline).getTime();
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      lapsedTime = `${days} Days`;
      lapsedLevel = 'overdue';
    }
  }

  return {
    id: p.id,
    name,
    initials: name.substring(0, 2).toUpperCase(),
    initialsColor: getInitialsColor(p.id),
    tags: [{ label: p.type.toUpperCase(), color: '#1e88e5' }],
    reason: p.type === 'referral' ? 'Missed Referral' : 'Lapsed Promise',
    reasonDesc: 'Patient did not arrive at destination facility.',
    lapsedTime,
    lapsedLevel,
    auditVerified: true,
    auditLog: 'System generated escalation',
  };
};

export default function EscalationInbox() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<FilterTab>('lapsed')
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')

  const { data: promises = [], isLoading } = useQuery({
    queryKey: ['promises'],
    queryFn: async () => {
      const res = await apiClient.get('/promises');
      return res.data.data;
    },
  });

  const handleSortToggle = () => {
    setSortDirection((current) => current === 'desc' ? 'asc' : 'desc')
  }

  const handleAcknowledge = async (id: string) => {
    try {
      await apiClient.post(`/promises/${id}/annotate`, {
        annotation: {
          acknowledged: true,
          notes: 'Supervisor acknowledged escalation',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['promises'] })
      console.log('Acknowledged escalation', id)
    } catch (error: any) {
      console.error('Acknowledge escalation failed', error.response?.data || error.message)
    }
  }

  if (isLoading) return <div>Loading...</div>;

  const escalatedPromises = promises.filter((p: any) => p.status === 'escalated' || p.status === 'lapsed');
  const criticalCount = promises.filter((p: any) => p.status === 'lapsed').length;
  const warningCount = promises.filter((p: any) => p.status === 'escalated').length;

  const escalations = escalatedPromises.map(mapPromiseToEscalation);

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
            <span className="stat-value critical">{criticalCount}</span>
          </div>
          <div className="escalation-stat warning-stat">
            <span className="stat-label">WARNING</span>
            <span className="stat-value warning">{warningCount}</span>
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
          <button className="sort-btn" onClick={handleSortToggle}>
            {sortDirection === 'desc' ? 'Time Exceeded (Desc)' : 'Time Exceeded (Asc)'}
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
            {escalations.map((esc: Escalation, idx: number) => (
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
                        {esc.tags.map((tag: any, ti: number) => (
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
                  <button className="acknowledge-btn" onClick={() => handleAcknowledge(esc.id)}>
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
