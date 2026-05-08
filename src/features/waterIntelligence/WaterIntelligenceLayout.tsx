import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import PilotDemonstrationBanner from './components/PilotDemonstrationBanner';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-[11px] font-semibold px-2 py-1 rounded-lg border transition ${
    isActive ? 'border-cyan-400/50 text-cyan-200 bg-cyan-500/10' : 'dpal-border-subtle dpal-text-secondary hover:opacity-90'
  }`;

export default function WaterIntelligenceLayout(): React.ReactElement {
  return (
    <div className="min-h-screen" style={{ background: 'var(--dpal-background)' }}>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-4">
        <PilotDemonstrationBanner />
        <nav
          className="flex flex-wrap gap-2 items-center py-2 border-b dpal-border-subtle"
          aria-label="Water Intelligence sections"
        >
          <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted w-full sm:w-auto">
            Water Intelligence
          </span>
          <NavLink to="/water-intelligence" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/water-intelligence/colorado-river" className={navLinkClass}>
            Colorado pilot
          </NavLink>
          <NavLink to="/water-intelligence/basin-map" className={navLinkClass}>
            Basin map
          </NavLink>
          <NavLink to="/water-intelligence/calculator" className={navLinkClass}>
            Calculator
          </NavLink>
          <NavLink to="/water-intelligence/registry" className={navLinkClass}>
            VWCU registry
          </NavLink>
          <NavLink to="/water-intelligence/exchange" className={navLinkClass}>
            Exchange
          </NavLink>
          <NavLink to="/water-intelligence/club20" className={navLinkClass}>
            Club 20
          </NavLink>
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
