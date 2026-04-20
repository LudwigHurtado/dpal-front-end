import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { IM_PATHS } from '../routes/paths';
import '../styles/globals.css';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: IM_PATHS.hub,          icon: '🏠', label: 'Hub' },
  { path: IM_PATHS.projects,     icon: '🌍', label: 'Projects' },
  { path: IM_PATHS.evidence,     icon: '📷', label: 'Evidence' },
  { path: IM_PATHS.monitoring,   icon: '📡', label: 'Monitoring' },
  { path: IM_PATHS.verification, icon: '✅', label: 'Verification' },
  { path: IM_PATHS.claims,       icon: '🏷️', label: 'Claims' },
  { path: IM_PATHS.ledger,       icon: '📜', label: 'Ledger' },
];

const ImpactLayout: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path: string) =>
    path === IM_PATHS.hub ? pathname === '/' : pathname.startsWith(path);

  return (
    <div className="im-root im-shell">
      {/* Sidebar */}
      <nav className="im-sidebar">
        <div className="im-sidebar-logo">
          <div className="im-sidebar-logo-name">Impact Registry</div>
          <div className="im-sidebar-logo-tag">Environmental outcomes</div>
        </div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            className={`im-nav-link${isActive(item.path) ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="im-nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <div className="im-main">
        <Outlet />
      </div>

      {/* Mobile bottom nav */}
      <nav className="im-bottom-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            className={`im-bottom-nav-item${isActive(item.path) ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default ImpactLayout;
