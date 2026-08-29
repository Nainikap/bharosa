import { Bell, Search, User } from 'lucide-react'
import './Header.css'

export default function Header() {
  return (
    <header className="header">
      <div className="header-title">
        <span className="header-brand">Bharosa</span>
      </div>

      <div className="header-actions">
        <div className="header-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search patient ID..."
            className="search-input"
          />
        </div>

        <button className="header-icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        <button className="header-avatar" aria-label="User profile">
          <User size={18} />
        </button>
      </div>
    </header>
  )
}
