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
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'
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

const mapEventToAudit = (e: any): AuditEntry => {
  const d = new Date(e.ts);
  let actionType: AuditEntry['actionType'] = 'update';
  const evtName = (e.event_name || '').toLowerCase();
  if (evtName === 'promise.created' || evtName === 'promise_created') actionType = 'create';
  if (evtName === 'promise.escalated' || evtName === 'promise.lapsed' || evtName.includes('escalated')) actionType = 'escalation';
  if (evtName === 'promise.kept' || evtName === 'promise.kept_late' || evtName === 'promise_fulfilled') actionType = 'arrival';
  
  let actorObj = {} as any;
  try {
    actorObj = typeof e.actor === 'string' ? JSON.parse(e.actor) : e.actor;
  } catch (err) {}
  
  return {
    id: e.id,
    timestamp: d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    actor: actorObj?.workerId || 'System',
    actorRole: actorObj?.role || 'System/User',
    action: e.event_name,
    actionType,
    entity: e.promise_type || 'Promise',
    entityId: e.promise_id.substring(0, 8),
    details: `${e.from_status} → ${e.to_status}`,
    status: actionType === 'escalation' ? 'warning' : 'success',
  };
};

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

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await apiClient.get('/events');
      return res.data.data;
    },
  });

  const auditLogs = events.map(mapEventToAudit);

  const handleExportCsv = () => {
    const csv = ['timestamp,actor,actorRole,action,entity,entityId,status', ...auditLogs.map((log: AuditEntry) => [
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
        {auditLogs.map((log: AuditEntry) => (
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
