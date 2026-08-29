import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Users,
} from 'lucide-react'
import './SessionScheduler.css'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_DAYS = [
  [29, 30, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
  [27, 28, 29, 30, 31, 0, 0],
]

const dotDays: Record<number, string> = {
  2: 'planned', 10: 'planned', 14: 'completed', 15: 'completed',
  22: 'stock-alert', 25: 'planned', 28: 'planned',
}

interface ScheduledSession {
  time: string
  endTime: string
  location: string
  village: string
  ashaName: string
  ashaInitials: string
  ashaColor: string
  stockStatus: 'committed' | 'pending'
}

const sessions: ScheduledSession[] = []

export default function SessionScheduler() {
  const [selectedDay, setSelectedDay] = useState(10)
  const [villageFilter, setVillageFilter] = useState('all')
  const [workerFilter, setWorkerFilter] = useState('all')

  return (
    <div className="scheduler-page animate-fadeInUp">
      <div className="scheduler-header">
        <div className="scheduler-header-text">
          <h1>Session Scheduler</h1>
          <p className="scheduler-subtitle">
            Plan and manage Routine Immunization (RI) sessions across
            catchment villages. Commit vaccine stock requirements upfront to
            ensure availability.
          </p>
        </div>
        <div className="scheduler-header-actions">
          <button className="btn btn-outline">
            <Download size={16} />
            <span>Export Schedule</span>
          </button>
          <button className="btn btn-primary">
            <Plus size={16} />
            <span>New Session</span>
          </button>
        </div>
      </div>

      <div className="scheduler-body">
        {/* Left: Calendar + Filters */}
        <div className="scheduler-left animate-slideInLeft">
          <div className="calendar-card floating-card-lg">
            <div className="calendar-header">
              <h3>October 2024</h3>
              <div className="calendar-nav">
                <button className="cal-nav-btn"><ChevronLeft size={16} /></button>
                <button className="cal-nav-btn"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="calendar-grid">
              <div className="calendar-days-header">
                {DAYS.map((d) => (
                  <span key={d} className="day-label">{d}</span>
                ))}
              </div>
              {MONTH_DAYS.map((week, wi) => (
                <div key={wi} className="calendar-week">
                  {week.map((day, di) => {
                    if (day === 0) return <span key={di} className="day-cell empty" />
                    const dot = dotDays[day]
                    const isSelected = day === selectedDay
                    const isPrev = day > 27 && wi === 0
                    return (
                      <button
                        key={di}
                        className={`day-cell ${isPrev ? 'prev-month' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => !isPrev && setSelectedDay(day)}
                      >
                        {day}
                        {dot && <span className={`day-dot ${dot}`} />}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="calendar-legend">
              <span className="legend-item"><span className="legend-dot planned" /> Planned RI Session</span>
              <span className="legend-item"><span className="legend-dot completed" /> Completed</span>
              <span className="legend-item"><span className="legend-dot stock-alert" /> Stock Alert</span>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <h3 className="filters-title">Filters</h3>
            <div className="filter-group">
              <label className="filter-label">VILLAGE</label>
              <select
                className="filter-select"
                value={villageFilter}
                onChange={(e) => setVillageFilter(e.target.value)}
              >
                <option value="all">All Villages</option>
                <option value="rampur">Rampur Village</option>
                <option value="kalyanpur">Kalyanpur Village</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">ASHA WORKER</label>
              <select
                className="filter-select"
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
              >
                <option value="all">All Workers</option>
                <option value="sunita">Sunita Devi</option>
                <option value="meena">Meena Kumari</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Selected date info */}
        <div className="scheduler-right animate-slideInRight">
          {/* Date summary card */}
          <div className="date-summary-card">
            <div className="date-summary-left">
              <span className="date-label-tag">SELECTED DATE</span>
              <h2 className="date-display">Thursday, Oct {selectedDay}, 2024</h2>
              <p className="date-meta">{sessions.length} sessions scheduled across 2 villages.</p>
            </div>
            <div className="date-summary-stats">
              <div className="stat-box">
                <span className="stat-number">120</span>
                <span className="stat-desc">Expected Beneficiaries</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">3</span>
                <span className="stat-desc">Active ASHAs</span>
              </div>
            </div>
          </div>

          {/* Sessions table */}
          <div className="sessions-section">
            <h2>Scheduled Sessions</h2>
            <div className="sessions-table-wrap">
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>LOCATION / VILLAGE</th>
                    <th>ASHA LEAD</th>
                    <th>STOCK STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="stagger">
                  {sessions.map((session, idx) => (
                    <tr key={idx} className="session-row animate-fadeInUp">
                      <td className="time-cell">
                        <span className="time-start">{session.time}</span>
                        <span className="time-sep">to</span>
                        <span className="time-end">{session.endTime}</span>
                      </td>
                      <td>
                        <span className="loc-name">{session.location}</span>
                        <span className="loc-village">{session.village}</span>
                      </td>
                      <td>
                        <div className="asha-cell">
                          <span className="asha-avatar" style={{ background: session.ashaColor }}>
                            {session.ashaInitials}
                          </span>
                          <span className="asha-name">{session.ashaName}</span>
                        </div>
                      </td>
                      <td>
                        {session.stockStatus === 'committed' ? (
                          <span className="stock-badge committed">
                            <CheckCircle2 size={14} /> Committed
                          </span>
                        ) : (
                          <span className="stock-badge pending-stock">
                            <AlertTriangle size={14} /> Pending Stock
                          </span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline">
                          <Users size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
