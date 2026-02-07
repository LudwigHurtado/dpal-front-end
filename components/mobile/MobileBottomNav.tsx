import React from 'react';
import { Home, Search, PlusCircle, AlertCircle, User } from '../icons';

export type MobileTab = 'home' | 'search' | 'report' | 'alerts' | 'profile';

const DPAL_PRIMARY = '#1e5f9e';
const DPAL_TEXT_MUTED = '#94a3b8';
const DPAL_TEXT_PRIMARY = '#0f172a';
const TOUCH_MIN = 44;
const BOTTOM_NAV_HEIGHT = 56;
const SAFE_BOTTOM = 'env(safe-area-inset-bottom, 0px)';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home className="w-6 h-6" /> },
  { id: 'search', label: 'Search', icon: <Search className="w-6 h-6" /> },
  { id: 'report', label: 'Report', icon: <PlusCircle className="w-7 h-7" /> },
  { id: 'alerts', label: 'Alerts', icon: <AlertCircle className="w-6 h-6" /> },
  { id: 'profile', label: 'Profile', icon: <User className="w-6 h-6" /> },
];

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-[90] flex items-center justify-around border-t bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{
        minHeight: `${BOTTOM_NAV_HEIGHT}px`,
        paddingBottom: SAFE_BOTTOM,
      }}
    >
      {tabs.map(({ id, label, icon }) => {
        const isActive = activeTab === id;
        const isReport = id === 'report';
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className="flex flex-col items-center justify-center flex-1 min-w-0 py-2 transition-colors touch-manipulation"
            style={{
              minHeight: `${TOUCH_MIN}px`,
              color: isActive ? DPAL_PRIMARY : DPAL_TEXT_MUTED,
            }}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span
              className={`flex items-center justify-center rounded-full transition-colors ${
                isReport ? 'bg-[#1e5f9e] text-white w-12 h-12 -mt-5' : ''
              }`}
              style={isReport && isActive ? { backgroundColor: DPAL_PRIMARY, color: '#fff' } : {}}
            >
              {icon}
            </span>
            <span
              className="text-[10px] font-semibold mt-1 truncate max-w-full px-0.5"
              style={{ color: isActive ? DPAL_PRIMARY : DPAL_TEXT_MUTED }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
