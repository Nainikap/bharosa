import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, AlertCircle, ShieldAlert, LogOut } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { name: 'Active Promises', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Facility Arrival', path: '/dashboard/facility-arrival', icon: Users },
    { name: 'Session Scheduler', path: '/dashboard/session-scheduler', icon: Calendar },
    { name: 'Escalation Inbox', path: '/dashboard/escalation-inbox', icon: AlertCircle },
    { name: 'Audit Logs', path: '/dashboard/audit-logs', icon: ShieldAlert },
  ];

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <div className="sidebar">
        <Link to="/" className="sidebar-brand">
          <div className="mark">⬡</div>
          <div>
            <div>Bharosa</div>
            <div style={{ fontSize: '11px', color: 'var(--mut)' }}>Closing the Care Loop</div>
          </div>
        </Link>
        <div className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto', padding: '0 10px' }}>
          <Link to="/login" className="sidebar-link">
            <LogOut size={18} />
            Logout
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="topbar">
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
            System Administrator
          </div>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
