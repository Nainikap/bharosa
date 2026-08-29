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

const scheduledCards: PromiseCard[] = []

const overdueCards: PromiseCard[] = []

const completedCards: PromiseCard[] = []

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
  const [_filter, setFilter] = useState('all')

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
          <button className="btn btn-outline" onClick={() => setFilter('all')}>
            <Filter size={16} />
            <span>Filter Services</span>
          </button>
          <button className="btn btn-primary">
            <Plus size={16} />
            <span>New Promise</span>
          </button>
        </div>
      </div>

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
            <button className="column-menu"><MoreHorizontal size={16} /></button>
          </div>
          <div className="column-cards stagger">
            {scheduledCards.map((card) => (
              <div key={card.id} className="promise-card floating-card animate-fadeInUp">
                <div className="card-top-row">
                  <span className="ref-badge">{card.refCode}</span>
                  <button className="card-grip"><GripVertical size={14} /></button>
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
            <button className="column-menu"><MoreHorizontal size={16} /></button>
          </div>
          <div className="column-cards stagger">
            {overdueCards.map((card) => (
              <div key={card.id} className={`promise-card floating-card overdue-card animate-fadeInUp ${card.urgent ? 'urgent' : ''}`}>
                {card.urgent && (
                  <div className="urgent-ribbon">URGENT</div>
                )}
                <div className="card-top-row">
                  <span className="ref-badge overdue-ref">{card.refCode}</span>
                  <button className="card-grip"><GripVertical size={14} /></button>
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
                    <button className="action-tag call">
                      <Phone size={12} />
                      Call ASHA
                    </button>
                  )}
                  {card.missedDate && (
                    <button className="action-tag escalate">
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
            <button className="column-menu"><MoreHorizontal size={16} /></button>
          </div>
          <div className="column-cards stagger">
            {completedCards.map((card) => (
              <div key={card.id} className="promise-card floating-card completed-card animate-fadeInUp">
                <div className="card-top-row">
                  <span className="ref-badge">{card.refCode}</span>
                  <button className="card-grip"><GripVertical size={14} /></button>
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
