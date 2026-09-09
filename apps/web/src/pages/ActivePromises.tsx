import { useState, useEffect } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';

// Helper to safely parse JSON fields that may already be objects or JSON strings
function parseJson(val: any): any {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return {}; }
}

// Extract a human-readable label from committedBy/committedTo objects
function actorLabel(actor: any): string {
  const parsed = parseJson(actor);
  if (parsed.workerId && parsed.facilityId) return `${parsed.workerId} (${parsed.facilityId})`;
  if (parsed.workerId) return parsed.workerId;
  if (parsed.facilityId) return parsed.facilityId;
  if (parsed.role) return parsed.role;
  return '—';
}

// Format an ISO date to a short readable form
function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffH = Math.round(diffMs / 3600000);

    if (Math.abs(diffH) < 24) {
      if (diffH < 0) return `${Math.abs(diffH)}h overdue`;
      return `in ${diffH}h`;
    }
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'escalated': return 'red';
    case 'kept': case 'closed_na': return 'green';
    case 'lapsed': return 'red';
    default: return 'amber';
  }
}

export default function ActivePromises() {
  const [promises, setPromises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPromises = () => {
    setLoading(true);
    setError(null);
    apiClient.get('/promises')
      .then((res) => {
        // Backend returns { data: [...], total: N }
        const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setPromises(rows);
      })
      .catch((err) => {
        console.error('Failed to fetch promises:', err);
        setError(
          err.response?.status === 401
            ? 'Authentication failed — please log in again.'
            : 'Could not load promises from server.'
        );
        setPromises([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPromises();
  }, []);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Active Promises</h1>
          <p style={{ color: 'var(--mut)' }}>Monitor all cross-tier commitments currently in flight.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={fetchPromises} title="Refresh">
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-secondary">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#2a1a1a', border: '1px solid #993333', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#ff8b98', fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Patient / Target</th>
              <th>From → To</th>
              <th>Deadline</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--mut)' }}>Loading…</td>
              </tr>
            )}
            {!loading && promises.length === 0 && !error && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--mut)' }}>No active promises found.</td>
              </tr>
            )}
            {!loading && promises.map((p) => {
              const desc = parseJson(p.description);
              const patientName = p.patientName || desc.name || desc.patientName || '—';
              const fromLabel = actorLabel(p.committedBy);
              const toLabel = actorLabel(p.committedTo);
              const status = p.status || 'open';

              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{p.id?.substring(0, 8)}…</td>
                  <td>
                    <span className={`badge ${p.type === 'referral' ? 'blue' : ''}`} style={{ textTransform: 'capitalize' }}>
                      {p.type}
                    </span>
                  </td>
                  <td>{patientName}</td>
                  <td>{fromLabel} → {toLabel}</td>
                  <td>{shortDate(p.deadline)}</td>
                  <td>
                    <span className={`badge ${statusClass(status)}`}>
                      {status.toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
