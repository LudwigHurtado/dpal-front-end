import React from 'react';
import { Home, Megaphone, List, User, Database } from './icons';
import type { View } from '../App';

interface BottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
  className?: string;
}

const ITEMS: { view: View; label: string; icon: React.ElementType }[] = [
  { view: 'mainMenu', label: 'Home', icon: Home },
  { view: 'categorySelection', label: 'Report', icon: Megaphone },
  { view: 'hub', label: 'Feed', icon: List },
  { view: 'transparencyDatabase', label: 'Ledger', icon: Database },
  { view: 'heroHub', label: 'Hero', icon: User },
];

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, className = '' }) => {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-[90] dpal-bottom-nav safe-area-pb ${className}`}
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentView === item.view ||
            (item.view === 'heroHub' && currentView === 'heroHub') ||
            (item.view === 'hub' && currentView === 'hub');
          const active = currentView === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 py-2 gap-1 transition-colors ${
                active ? 'text-indigo-600' : 'text-[var(--dpal-text-muted)] hover:text-[var(--dpal-text-secondary)]'
              }`}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
            >
              <Icon className={`w-6 h-6 flex-shrink-0 ${active ? 'drop-shadow-[0_0_8px_rgba(79,70,229,0.35)]' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-wider truncate w-full text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
