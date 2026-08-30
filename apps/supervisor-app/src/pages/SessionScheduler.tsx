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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import './SessionScheduler.css'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_DAYS = [
  [29, 30, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
  [27, 28, 29, 30, 31, 0, 0],
]

const mapPromiseToSession = (p: any): ScheduledSession => {
  const d = new Date(p.deadline || p.createdAt);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(d.getTime() + 4 * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const ashaName = p.committedBy?.workerId || 'Worker';

  return {
    id: p.id,
    dateDay: d.getDate(),
    time,
    endTime,
    location: p.description?.villageName || 'Village Center',
    village: p.description?.villageName || 'Unknown Village',
    ashaName,
    ashaInitials: ashaName.substring(0, 2).toUpperCase(),
    ashaColor: '#8e24aa',
    stockStatus: p.status === 'open' ? 'pending' : 'committed',
  };
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
  id: string
  dateDay: number
}

export default function SessionScheduler() {
  const queryClient = useQueryClient()
  const [selectedDay, setSelectedDay] = useState(10)
  const [villageFilter, setVillageFilter] = useState('all')
  const [workerFilter, setWorkerFilter] = useState('all')

  const { data: promises = [] } = useQuery({
    queryKey: ['promises', 'vaccine_supply'],
    queryFn: async () => {
      const res = await apiClient.get('/promises?type=vaccine_supply');
      return res.data.data;
    },
  });

  const allSessions = promises.map(mapPromiseToSession);
  const sessions = allSessions.filter((s: any) => s.dateDay === selectedDay);

  const dotDays: Record<number, string> = {};
  allSessions.forEach((s: any) => {
    dotDays[s.dateDay] = s.stockStatus === 'committed' ? 'completed' : 'planned';
  });

  const handleExportSchedule = () => {
    const blob = new Blob([JSON.stringify({ selectedDay, villageFilter, workerFilter, sessions }, null, 2)], {
      type: 'application/json;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'bharosa-session-schedule.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCreateSession = async () => {
    const sessionDate = `2024-10-${String(selectedDay).padStart(2, '0')}`

    try {
      await apiClient.post('/sessions/plan', {
        sessions: [{
          sessionDate,
          sessionType: 'ri',
          vaccines: [{ name: 'OPV', quantity: 120 }, { name: 'DPT', quantity: 90 }],
          villageName: 'Rampur Village',
          facilityId: 'fac-1',
        }],
      })
      queryClient.invalidateQueries({ queryKey: ['promises', 'vaccine_supply'] })
      console.log('Session plan created for', sessionDate)
    } catch (error: any) {
      console.error('Create session failed', error.response?.data || error.message)
    }
  }

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
          <button className="btn btn-outline" onClick={handleExportSchedule}>
            <Download size={16} />
            <span>Export Schedule</span>
          </button>
          <button className="btn btn-primary" onClick={handleCreateSession}>
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
                <button className="cal-nav-btn" onClick={() => setSelectedDay((current) => Math.max(1, current - 1))}><ChevronLeft size={16} /></button>
                <button className="cal-nav-btn" onClick={() => setSelectedDay((current) => Math.min(31, current + 1))}><ChevronRight size={16} /></button>
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
                  {sessions.map((session: ScheduledSession, idx: number) => (
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
                        <button className="btn btn-sm btn-outline" onClick={() => console.log('View session', session)}>
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
