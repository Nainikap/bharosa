import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ClipboardList,
  Building2,
  CalendarDays,
  MailWarning,
  ScrollText,
  Plus,
  Stethoscope,
} from 'lucide-react'
import './Sidebar.css'

const navItems = [
  { to: '/', icon: ClipboardList, label: 'Active Promises' },
  { to: '/facility-arrival', icon: Building2, label: 'Facility Arrival' },
  { to: '/session-scheduler', icon: CalendarDays, label: 'Session Scheduler' },
  { to: '/escalation-inbox', icon: MailWarning, label: 'Escalation Inbox' },
  { to: '/audit-logs', icon: ScrollText, label: 'Audit Logs' },
]

export default function Sidebar() {
  const location = useLocation()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <aside className="sidebar">
      {/* Floating decorative dots */}
      <div className="sidebar-float-dot dot-1" />
      <div className="sidebar-float-dot dot-2" />
      <div className="sidebar-float-dot dot-3" />

      <div className="sidebar-logo">
        <div className="logo-icon-wrap">
          <Stethoscope size={20} strokeWidth={2.2} />
        </div>
        <span className="logo-text">Bharosa</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          const Icon = item.icon
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className={`nav-item-indicator ${isActive ? 'show' : ''}`} />
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={`nav-icon ${hoveredIdx === idx ? 'icon-hover' : ''}`}
              />
              <span className="nav-label">{item.label}</span>
              {isActive && <div className="nav-active-glow" />}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="facility-badge">
          <div className="facility-icon">
            <Plus size={14} strokeWidth={2.5} />
          </div>
          <div className="facility-info">
            <span className="facility-label">FACILITY</span>
            <span className="facility-name">PHC District Central</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
