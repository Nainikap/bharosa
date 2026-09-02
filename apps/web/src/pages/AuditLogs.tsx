import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    axios.get('http://localhost:3000/api/events').then((res) => {
      setLogs(res.data);
    }).catch(() => {
      setLogs([
        { id: 1, timestamp: '2026-09-02T10:00:00Z', action: 'PROMISE_CREATED', actor: 'ASHA-22', target: 'PRM-001' },
        { id: 2, timestamp: '2026-09-02T10:05:00Z', action: 'SYNC_COMPLETED', actor: 'SYSTEM', target: 'DEVICE-102' }
      ]);
    });
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p style={{ color: 'var(--mut)' }}>System-wide events and state transitions.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={{ color: 'var(--mut)' }}>{new Date(log.timestamp).toLocaleString()}</td>
                <td style={{ fontWeight: 600 }}>{log.action}</td>
                <td>{log.actor}</td>
                <td>{log.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
