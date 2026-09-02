import { useState, useEffect } from 'react';
import axios from 'axios';
import { Filter } from 'lucide-react';

export default function ActivePromises() {
  const [promises, setPromises] = useState<any[]>([]);

  useEffect(() => {
    // In a real app, use React Query here. Using Axios directly for rapid proto.
    axios.get('http://localhost:3000/api/promises').then((res) => {
      setPromises(res.data);
    }).catch((err) => {
      console.error(err);
      // Mock data if backend isn't running yet
      setPromises([
        { id: 'PRM-001', type: 'referral', status: 'pending', patient: 'Rahul K.', from: 'ASHA-22', to: 'PHC-N', deadline: 'Today 14:00' },
        { id: 'PRM-002', type: 'session-supply', status: 'escalated', patient: 'N/A', from: 'CHC-W', to: 'ANM-4', deadline: 'Yesterday' }
      ]);
    });
  }, []);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Active Promises</h1>
          <p style={{ color: 'var(--mut)' }}>Monitor all cross-tier commitments currently in flight.</p>
        </div>
        <button className="btn btn-secondary">
          <Filter size={16} /> Filter
        </button>
      </div>

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
            {promises.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.id}</td>
                <td>{p.type}</td>
                <td>{p.patient}</td>
                <td>{p.from} → {p.to}</td>
                <td>{p.deadline}</td>
                <td>
                  <span className={`badge ${p.status === 'escalated' ? 'red' : 'amber'}`}>
                    {p.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
