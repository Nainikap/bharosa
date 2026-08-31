import { useState } from 'react'
import {
  Filter,
  Plus,
  MoreHorizontal,
  GripVertical,
  Calendar,
  Stethoscope,
  Baby,
  Pill,
  HeartPulse,
  AlertTriangle,
  Phone,
  Send,
  Clock,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import './ActivePromises.css'

interface PromiseCard {
  id: string
  refCode: string
  name: string
  service: string
  serviceIcon: 'anc' | 'postnatal' | 'immunization' | 'tb' | 'hypertension'
  date: string
  time?: string
  initials: string
  initialsColor: string
  urgent?: boolean
  overdueDays?: number
  missedDate?: string
}

const getInitialsColor = (id: string) => {
  const colors = ['#e53935', '#d81b60', '#8e24aa', '#3949ab', '#1e88e5', '#00acc1', '#43a047', '#ff8f00'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const mapPromiseToCard = (p: any): PromiseCard => {
  const refCode = p.id.split('-')[0].toUpperCase();
  const name = p.patientName || p.description?.patientName || p.description?.name || p.villageName || p.description?.village || p.committedTo?.facilityId || 'Unknown Patient';
  const service = p.type === 'referral' ? 'Referral' : p.type;
  const serviceIcon = 'immunization';
  
  const d = new Date(p.sessionDate || p.deadline || p.createdAt);
  const date = d.toLocaleDateString();
  const initials = name.substring(0, 2).toUpperCase();
  
  let overdueDays = 0;
  if (p.deadline) {
    const diff = Date.now() - new Date(p.deadline).getTime();
    if (diff > 0) overdueDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  return {
    id: p.id,
    refCode,
    name,
    service,
    serviceIcon: serviceIcon as any,
    date,
    initials,
    initialsColor: getInitialsColor(p.id),
    urgent: p.description?.priority === 'urgent' || p.description?.priority === 'emergency',
    overdueDays: overdueDays > 0 ? overdueDays : undefined,
  };
};

function getServiceIcon(type: string) {
  switch (type) {
    case 'anc': return <Baby size={14} />
    case 'postnatal': return <HeartPulse size={14} />
    case 'immunization': return <Stethoscope size={14} />
    case 'tb': return <Pill size={14} />
    case 'hypertension': return <HeartPulse size={14} />
    default: return <Stethoscope size={14} />
  }
}

export default function ActivePromises() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newPromise, setNewPromise] = useState({
    name: '',
    service: 'referral',
    deadline: '',
  })

  const { data: promises = [], isLoading } = useQuery({
    queryKey: ['promises'],
    queryFn: async () => {
      const res = await apiClient.get('/promises');
      return res.data.data;
    },
  });

  const handleCreatePromise = async () => {
    if (!newPromise.name.trim()) return

    const payload = {
      type: newPromise.service,
      committedTo: {
        role: 'facility',
        facilityId: 'fac-1',
        workerId: 'worker-sup-1',
      },
      description: {
        name: newPromise.name,
        priority: newPromise.service === 'referral' ? 'routine' : 'normal',
        deadline: newPromise.deadline || undefined,
      },
      independence: 'direct',
    }

    try {
      await apiClient.post('/promises', payload)
      setShowCreate(false)
      setNewPromise({ name: '', service: 'referral', deadline: '' })
      queryClient.invalidateQueries({ queryKey: ['promises'] })
    } catch (error: any) {
      console.error('Create promise failed', error.response?.data || error.message)
    }
  }

  if (isLoading) return <div>Loading...</div>;

  const filteredPromises = filter === 'all'
    ? promises
    : promises.filter((p: any) => p.type === filter)

  const scheduledCards = filteredPromises.filter((p: any) => p.status === 'open').map(mapPromiseToCard);
  const overdueCards = filteredPromises.filter((p: any) => p.status === 'escalated' || p.status === 'lapsed').map(mapPromiseToCard);
  const completedCards = filteredPromises.filter((p: any) => p.status === 'kept').map(mapPromiseToCard);

  return (
    <div className="promises-page animate-fadeInUp">
      {/* Page header */}
      <div className="promises-header">
        <div className="promises-header-text">
          <h1>Active Promise Board</h1>
          <p className="promises-subtitle">
            Monitor and manage patient referral commitments across
            scheduled, overdue, and completed states for PHC District Central.
          </p>
        </div>
        <div className="promises-header-actions">
          <button className="btn btn-outline" onClick={() => setFilter((current) => current === 'all' ? 'referral' : 'all')}>
            <Filter size={16} />
            <span>Filter Services</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            <span>New Promise</span>
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="floating-card" style={{ padding: '1rem', marginBottom: '1rem', maxWidth: 480 }}>
          <h3 style={{ marginBottom: '1rem' }}>Create Promise</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <input
              type="text"
              value={newPromise.name}
              onChange={(e) => setNewPromise((current) => ({ ...current, name: e.target.value }))}
              placeholder="Patient / promise name"
              style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #dfe3ea' }}
            />
            <select
              value={newPromise.service}
              onChange={(e) => setNewPromise((current) => ({ ...current, service: e.target.value }))}
              style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #dfe3ea' }}
            >
              <option value="referral">Referral</option>
              <option value="consult">Consult</option>
              <option value="followup">Follow-up</option>
              <option value="vaccine_supply">Vaccine Supply</option>
            </select>
            <input
              type="date"
              value={newPromise.deadline}
              onChange={(e) => setNewPromise((current) => ({ ...current, deadline: e.target.value }))}
              style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #dfe3ea' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreatePromise}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="kanban-board">
        {/* Scheduled column */}
        <div className="kanban-column">
          <div className="column-header">
            <div className="column-title-group">
              <span className="column-dot scheduled" />
              <h3>Scheduled</h3>
              <span className="column-count">{scheduledCards.length}</span>
            </div>
            <button className="column-menu" onClick={() => console.log('Scheduled menu clicked')}><MoreHorizontal size={16} /></button>
          </div>
          <div className="column-cards stagger">
            {scheduledCards.map((card: PromiseCard) => (
              <div key={card.id} className="promise-card floating-card animate-fadeInUp">
                <div className="card-top-row">
                  <span className="ref-badge">{card.refCode}</span>
                  <button className="card-grip" onClick={() => console.log('Card grip clicked', card.id)}><GripVertical size={14} /></button>
                </div>
                <h4 className="card-name">{card.name}</h4>
                <p className="card-service">
                  {getServiceIcon(card.serviceIcon)}
                  {card.service}
                </p>
                <div className="card-bottom">
                  <span className="card-date">
                    <Calendar size={12} />
                    {card.date}
                  </span>
                  <span className="card-avatar" style={{ background: card.initialsColor }}>
                    {card.initials}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue column */}
        <div className="kanban-column overdue-column">
          <div className="column-header">
            <div className="column-title-group">
              <span className="column-dot overdue" />
              <h3 className="overdue-title">Overdue</h3>
              <span className="column-count overdue-count">{overdueCards.length}</span>
            </div>
            <button className="column-menu" onClick={() => console.log('Overdue menu clicked')}><MoreHorizontal size={16} /></button>
          </div>
          <div className="column-cards stagger">
            {overdueCards.map((card: PromiseCard) => (
              <div key={card.id} className={`promise-card floating-card overdue-card animate-fadeInUp ${card.urgent ? 'urgent' : ''}`}>
                {card.urgent && (
                  <div className="urgent-ribbon">URGENT</div>
                )}
                <div className="card-top-row">
                  <span className="ref-badge overdue-ref">{card.refCode}</span>
                  <button className="card-grip" onClick={() => console.log('Overdue card grip clicked', card.id)}><GripVertical size={14} /></button>
                </div>
                <h4 className="card-name">{card.name}</h4>
                <p className="card-service">
                  {getServiceIcon(card.serviceIcon)}
                  {card.service}
                </p>
                <div className="card-bottom overdue-bottom">
                  {card.overdueDays && (
                    <span className="overdue-badge">
                      <AlertTriangle size={12} />
                      {card.overdueDays} Days Late
                    </span>
                  )}
                  {card.missedDate && (
                    <span className="missed-badge">
                      <Clock size={12} />
                      {card.missedDate}
                    </span>
                  )}
                  {card.overdueDays && (
                    <button className="action-tag call" onClick={() => console.log('Call ASHA', card.id)}>
                      <Phone size={12} />
                      Call ASHA
                    </button>
                  )}
                  {card.missedDate && (
                    <button className="action-tag escalate" onClick={() => console.log('Escalate', card.id)}>
                      <Send size={12} />
                      Escalate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed column */}
        <div className="kanban-column completed-column">
          <div className="column-header">
            <div className="column-title-group">
              <span className="column-dot completed" />
              <h3>Completed</h3>
            </div>
            <button className="column-menu" onClick={() => console.log('Completed menu clicked')}><MoreHorizontal size={16} /></button>
          </div>
          <div className="column-cards stagger">
            {completedCards.map((card: PromiseCard) => (
              <div key={card.id} className="promise-card floating-card completed-card animate-fadeInUp">
                <div className="card-top-row">
                  <span className="ref-badge">{card.refCode}</span>
                  <button className="card-grip" onClick={() => console.log('Completed card grip clicked', card.id)}><GripVertical size={14} /></button>
                </div>
                <h4 className="card-name">{card.name}</h4>
                <p className="card-service">
                  {getServiceIcon(card.serviceIcon)}
                  {card.service}
                </p>
                <div className="card-bottom">
                  <span className="card-date completed-date">
                    {card.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
