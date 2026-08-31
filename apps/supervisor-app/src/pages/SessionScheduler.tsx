import { useState, useMemo } from 'react'
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

const getCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const grid = [];
  let dayCounter = 1 - firstDay;
  for (let w = 0; w < 6; w++) { // 6 weeks to be safe
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (dayCounter <= 0) {
        week.push({ day: daysInPrevMonth + dayCounter, isPrev: true, isEmpty: false });
      } else if (dayCounter > daysInMonth) {
        week.push({ day: 0, isPrev: false, isEmpty: true });
      } else {
        week.push({ day: dayCounter, isPrev: false, isEmpty: false });
      }
      dayCounter++;
    }
    grid.push(week);
    if (dayCounter > daysInMonth) break;
  }
  return grid;
}

const mapPromiseToSession = (p: any): ScheduledSession => {
  const d = new Date(p.sessionDate || p.deadline || p.createdAt);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(d.getTime() + 4 * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const ashaName = p.committedBy?.workerId || 'Worker';
  
  const vaccines = p.description?.vaccines || [];
  const expectedBeneficiaries = vaccines.reduce((acc: number, v: any) => acc + (Number(v.quantity) || 0), 0);

  return {
    id: p.id,
    dateDay: d.getDate(),
    dateMonth: d.getMonth(),
    dateYear: d.getFullYear(),
    time,
    endTime,
    location: p.villageName || p.description?.villageName || 'Village Center',
    village: p.villageName || p.description?.villageName || 'Unknown Village',
    ashaName,
    ashaInitials: ashaName.substring(0, 2).toUpperCase(),
    ashaColor: '#8e24aa',
    stockStatus: p.status === 'open' ? 'pending' : 'committed',
    expectedBeneficiaries,
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
  dateMonth: number
  dateYear: number
  expectedBeneficiaries: number
}

export default function SessionScheduler() {
  const queryClient = useQueryClient()
  const today = new Date();
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  
  const [villageFilter, setVillageFilter] = useState('all')
  const [workerFilter, setWorkerFilter] = useState('all')

  const monthDaysGrid = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth])
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })

  const { data: promises = [] } = useQuery({
    queryKey: ['promises', 'vaccine_supply'],
    queryFn: async () => {
      const res = await apiClient.get('/promises?type=vaccine_supply');
      return res.data.data;
    },
  });

  const allSessions = promises.map(mapPromiseToSession);
  const sessions = allSessions.filter((s: any) => 
    s.dateDay === selectedDay && 
    s.dateMonth === currentMonth && 
    s.dateYear === currentYear &&
    (villageFilter === 'all' || s.village.toLowerCase().includes(villageFilter.toLowerCase())) &&
    (workerFilter === 'all' || s.ashaName.toLowerCase().includes(workerFilter.toLowerCase()))
  );

  const dotDays: Record<number, string> = {};
  allSessions.forEach((s: any) => {
    if (s.dateMonth === currentMonth && s.dateYear === currentYear) {
      dotDays[s.dateDay] = s.stockStatus === 'committed' ? 'completed' : 'planned';
    }
  });

  const activeAshasCount = new Set(sessions.map((s: any) => s.ashaName)).size;
  const totalBeneficiaries = sessions.reduce((acc: number, s: any) => acc + s.expectedBeneficiaries, 0);
  const displayDateStr = new Date(currentYear, currentMonth, selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const handleExportSchedule = () => {
    const blob = new Blob([JSON.stringify({ selectedDay, currentMonth, currentYear, villageFilter, workerFilter, sessions }, null, 2)], {
      type: 'application/json;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bharosa-session-schedule-${currentYear}-${currentMonth+1}-${selectedDay}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCreateSession = async () => {
    const sessionDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`

    try {
      await apiClient.post('/promises', {
        type: 'vaccine_supply',
        committedBy: { role: 'supervisor', workerId: 'dev-supervisor-123' },
        committedTo: { facilityId: 'fac-1' },
        description: {
          villageName: villageFilter !== 'all' ? villageFilter : 'Central Village',
          vaccines: [{ name: 'OPV', quantity: 120 }, { name: 'DPT', quantity: 90 }]
        },
        deadline: new Date(sessionDate + 'T09:00:00Z').toISOString(),
      })
      queryClient.invalidateQueries({ queryKey: ['promises', 'vaccine_supply'] })
      alert('Session plan created for ' + sessionDate)
    } catch (error: any) {
      console.error('Create session failed', error.response?.data || error.message)
      alert('Failed to create session plan.')
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
              <h3>{monthName} {currentYear}</h3>
              <div className="calendar-nav">
                <button className="cal-nav-btn" onClick={() => {
                  if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                  else setCurrentMonth(m => m - 1);
                }}><ChevronLeft size={16} /></button>
                <button className="cal-nav-btn" onClick={() => {
                  if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                  else setCurrentMonth(m => m + 1);
                }}><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="calendar-grid">
              <div className="calendar-days-header">
                {DAYS.map((d) => (
                  <span key={d} className="day-label">{d}</span>
                ))}
              </div>
              {monthDaysGrid.map((week, wi) => (
                <div key={wi} className="calendar-week">
                  {week.map((cell, di) => {
                    if (cell.isEmpty) return <span key={di} className="day-cell empty" />
                    const dot = dotDays[cell.day]
                    const isSelected = cell.day === selectedDay && !cell.isPrev
                    return (
                      <button
                        key={di}
                        className={`day-cell ${cell.isPrev ? 'prev-month' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => !cell.isPrev && setSelectedDay(cell.day)}
                      >
                        {cell.day}
                        {dot && !cell.isPrev && <span className={`day-dot ${dot}`} />}
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
                <option value="Rampur">Rampur Village</option>
                <option value="Kalyanpur">Kalyanpur Village</option>
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
                <option value="Sunita">Sunita Devi</option>
                <option value="Meena">Meena Kumari</option>
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
              <h2 className="date-display">{displayDateStr}</h2>
              <p className="date-meta">{sessions.length} sessions scheduled.</p>
            </div>
            <div className="date-summary-stats">
              <div className="stat-box">
                <span className="stat-number">{totalBeneficiaries}</span>
                <span className="stat-desc">Expected Beneficiaries</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{activeAshasCount}</span>
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
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--cl-text-muted)' }}>
                        No sessions scheduled for this date.
                      </td>
                    </tr>
                  )}
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
