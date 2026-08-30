import { useState } from 'react'
import {
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Shield,
  FileText,
} from 'lucide-react'
import './AuditLogs.css'

interface AuditEntry {
  id: string
  timestamp: string
  actor: string
  actorRole: string
  action: string
  actionType: 'create' | 'update' | 'escalation' | 'arrival'
  entity: string
  entityId: string
  details: string
  status: 'success' | 'warning'
}

const auditLogs: AuditEntry[] = []

function getActionIcon(type: string) {
  switch (type) {
    case 'create': return <CheckCircle2 size={14} />
    case 'update': return <RefreshCw size={14} />
    case 'escalation': return <AlertCircle size={14} />
    case 'arrival': return <ArrowRight size={14} />
    default: return <FileText size={14} />
  }
}

function getActionColor(type: string) {
  switch (type) {
    case 'create': return 'var(--cl-green)'
    case 'update': return 'var(--cl-blue)'
    case 'escalation': return 'var(--cl-red)'
    case 'arrival': return 'var(--cl-navy)'
    default: return 'var(--cl-text-muted)'
  }
}

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleExportCsv = () => {
    const csv = ['timestamp,actor,actorRole,action,entity,entityId,status', ...auditLogs.map((log) => [
      log.timestamp,
      log.actor,
      log.actorRole,
      log.action,
      log.entity,
      log.entityId,
      log.status,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'bharosa-audit-logs.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="audit-page animate-fadeInUp">
      <div className="audit-header">
        <div className="audit-header-text">
          <h1>
            <Shield size={28} className="audit-title-icon" />
            Audit Logs
          </h1>
          <p className="audit-subtitle">
            Complete audit trail for all system actions, promise state changes,
            escalation acknowledgements, and DPDP compliance events.
          </p>
        </div>
        <div className="audit-header-actions">
          <button className="btn btn-outline" onClick={handleExportCsv}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="audit-toolbar">
        <div className="audit-search">
          <Search size={16} className="audit-search-icon" />
          <input
            type="text"
            placeholder="Search logs by actor, action, or entity ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="audit-search-input"
          />
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => console.log('Audit filter opened')}>
          <Filter size={14} />
          Filters
        </button>
      </div>

      {/* Timeline */}
      <div className="audit-timeline stagger">
        {auditLogs.map((log) => (
          <div key={log.id} className="audit-entry animate-fadeInUp">
            <div className="timeline-connector">
              <div
                className="timeline-dot"
                style={{ background: getActionColor(log.actionType) }}
              >
                {getActionIcon(log.actionType)}
              </div>
              <div className="timeline-line" />
            </div>
            <div className="entry-card floating-entry">
              <div className="entry-header">
                <div className="entry-action-group">
                  <span
                    className="entry-action-badge"
                    style={{
                      background: `${getActionColor(log.actionType)}10`,
                      color: getActionColor(log.actionType),
                      borderColor: `${getActionColor(log.actionType)}25`,
                    }}
                  >
                    {log.action}
                  </span>
                  <span className="entry-entity">
                    {log.entity} <code className="entry-entity-id">{log.entityId}</code>
                  </span>
                </div>
                <div className="entry-meta">
                  <Clock size={12} />
                  <span>{log.timestamp}</span>
                </div>
              </div>
              <p className="entry-details">{log.details}</p>
              <div className="entry-footer">
                <span className="entry-actor">
                  <strong>{log.actor}</strong> · {log.actorRole}
                </span>
                <span className={`entry-status ${log.status}`}>
                  {log.status === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {log.status === 'success' ? 'Logged' : 'Alert'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
