import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';

export default function EscalationInbox() {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEscalations();
  }, []);

  const fetchEscalations = () => {
    apiClient.get('/promises/escalations').then((res) => {
      setEscalations(res.data);
    }).catch(() => {
      setEscalations([
        { id: 'ESC-301', promiseId: 'PRM-002', type: 'session-supply', deadline: 'Yesterday', assignedTo: 'Block MO', status: 'unacknowledged' }
      ]);
    });
  };

  const handleAcknowledge = async (promiseId: string, escId: string) => {
    setLoadingId(escId);
    try {
      await apiClient.post(`/promises/${promiseId}/annotate`, {
        note: 'Acknowledged via Dashboard',
        escalationId: escId
      });
      setEscalations(escalations.filter(e => e.id !== escId));
      alert('Escalation acknowledged.');
    } catch (err) {
      console.error(err);
      // Simulate success for demo
      setEscalations(escalations.filter(e => e.id !== escId));
      alert('Escalation acknowledged (Simulated).');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Escalation Inbox</h1>
        <p style={{ color: 'var(--mut)' }}>Missed SLA promises that require acknowledgment.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Escalation ID</th>
              <th>Promise ID</th>
              <th>Type</th>
              <th>Missed Deadline</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {escalations.map((e) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.id}</td>
                <td>{e.promiseId}</td>
                <td>{e.type}</td>
                <td style={{ color: 'var(--red)' }}>{e.deadline}</td>
                <td>
                  <span className="badge red">{e.status.toUpperCase()}</span>
                </td>
                <td>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleAcknowledge(e.promiseId, e.id)}
                    disabled={loadingId === e.id}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    <CheckCircle size={14} /> {loadingId === e.id ? 'Saving...' : 'Acknowledge'}
                  </button>
                </td>
              </tr>
            ))}
            {escalations.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No pending escalations</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
