import React from 'react';
import { ArrowRight, ShieldCheck, Heart, X } from './icons';

interface MissionGatewayModalProps {
  open: boolean;
  rememberChoice: boolean;
  onRememberChoiceChange: (next: boolean) => void;
  onSelectMainPanel: () => void;
  onSelectReportProtect: () => void;
  onSelectReportDashboard: () => void;
  onSelectWorkPanel: () => void;
  onSelectPlayDoGood: () => void;
  onSkip: () => void;
}

const MissionGatewayModal: React.FC<MissionGatewayModalProps> = ({
  open,
  rememberChoice,
  onRememberChoiceChange,
  onSelectMainPanel,
  onSelectReportProtect,
  onSelectReportDashboard,
  onSelectWorkPanel,
  onSelectPlayDoGood,
  onSkip,
}) => {
  if (!open) return null;

  return (
    <div className="dpal-modal-backdrop z-[400] p-4">
      <div className="w-full max-w-6xl rounded-[2rem] border border-[color:var(--dpal-border-strong)] shadow-2xl overflow-hidden bg-[var(--dpal-background-secondary)]">
        <div className="bg-gradient-to-b from-[var(--dpal-panel)] to-[var(--dpal-background-secondary)]">
        <div className="px-6 md:px-8 py-5 border-b dpal-border-subtle flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] dpal-text-secondary">Welcome to DPAL</p>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight mt-2">Choose your path today</h2>
            <p className="text-sm text-[var(--dpal-text-secondary)] mt-2 max-w-3xl">
              Protect your community, find what&apos;s lost, and complete real-world missions that create measurable impact.
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="p-2 rounded-xl border border-[color:var(--dpal-border-strong)] hover:bg-[var(--dpal-panel)]"
            aria-label="Skip and go to dashboard"
          >
            <X className="w-5 h-5 text-[var(--dpal-text-secondary)]" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 md:p-8">
          <button
            type="button"
            onClick={onSelectReportProtect}
            className="text-left rounded-[1.5rem] overflow-hidden border-2 border-cyan-500/30 bg-[var(--dpal-panel)] hover:border-cyan-400 transition-all group"
          >
            <img
              src="/gateway/report-protect-card.png"
              alt="Locator and reporting"
              className="w-full h-48 md:h-56 object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/reports/accidents-road-hazards-hero.png'; }}
              draggable={false}
            />
            <div className="p-5">
              <div className="flex items-center gap-2 text-cyan-300 text-[10px] font-black uppercase tracking-[0.25em]">
                <ShieldCheck className="w-4 h-4" />
                Locator & Reporting
              </div>
              <h3 className="text-xl font-black uppercase mt-2">Master Control Panel</h3>
              <p className="mt-2 text-sm text-[var(--dpal-text-secondary)]">
                Report hazards, locate people, pets, or property, verify events, and build public accountability.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-cyan-200 text-[10px] font-black uppercase tracking-widest">
                Enter master panel
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onSelectPlayDoGood}
            className="text-left rounded-[1.5rem] overflow-hidden border-2 border-emerald-500/30 bg-[var(--dpal-panel)] hover:border-emerald-400 transition-all group"
          >
            <img
              src="/gateway/play-need-deed-card.png"
              alt="Missions and good deeds"
              className="w-full h-48 md:h-56 object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/games/save-the-environment.png'; }}
              draggable={false}
            />
            <div className="p-5">
              <div className="flex items-center gap-2 text-emerald-300 text-[10px] font-black uppercase tracking-[0.25em]">
                <Heart className="w-4 h-4" />
                DPAL Care Missions
              </div>
              <h3 className="text-xl font-black uppercase mt-2">Play & Do Good</h3>
              <p className="mt-2 text-sm text-[var(--dpal-text-secondary)]">
                Join care missions, rescue walks, shelter support, senior visits, and community improvement challenges.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-emerald-200 text-[10px] font-black uppercase tracking-widest">
                Enter missions
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onSelectReportDashboard}
            className="text-left rounded-[1.5rem] overflow-hidden border-2 border-blue-500/30 bg-[var(--dpal-panel)] hover:border-blue-400 transition-all"
          >
            <img
              src="/gateway/report-dashboard-card.png"
              alt="DPAL report dashboard preview"
              className="w-full h-48 md:h-56 object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/report-protect/report-protect-bg-reference.png'; }}
              draggable={false}
            />
            <div className="p-5">
              <div className="flex items-center gap-2 text-blue-300 text-[10px] font-black uppercase tracking-[0.25em]">
                <ShieldCheck className="w-4 h-4" />
                Command Center
              </div>
              <h3 className="text-xl font-black uppercase mt-2">Report Dashboard</h3>
              <p className="mt-2 text-sm text-[var(--dpal-text-secondary)]">
                Live map, active alerts, verification queue, and case detail panels in one operations view.
              </p>
            </div>
          </button>
        </div>

        <div className="px-6 md:px-8 pb-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSelectMainPanel}
            className="px-4 py-2 rounded-xl border border-[color-mix(in_srgb,var(--dpal-text-secondary)_40%,transparent)] bg-[color-mix(in_srgb,var(--dpal-text-secondary)_10%,transparent)] text-[var(--dpal-text-primary)] text-xs font-black uppercase tracking-widest"
          >
            Open Main Panel
          </button>
          <button
            type="button"
            onClick={onSelectReportProtect}
            className="px-4 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 text-cyan-100 text-xs font-black uppercase tracking-widest"
          >
            Open Master Panel
          </button>
          <button
            type="button"
            onClick={onSelectWorkPanel}
            className="px-4 py-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 text-indigo-100 text-xs font-black uppercase tracking-widest"
          >
            Work for DPAL Coins
          </button>
        </div>

        <div className="px-6 md:px-8 pb-6 md:pb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => onRememberChoiceChange(e.target.checked)}
              className="w-4 h-4 rounded border-[color:var(--dpal-border-strong)] bg-[var(--dpal-panel)] text-cyan-500"
            />
            <span className="text-sm text-[var(--dpal-text-secondary)]">Remember my choice</span>
          </label>
          <button
            type="button"
            onClick={onSkip}
            className="text-[11px] font-black uppercase tracking-widest dpal-text-muted hover:text-[var(--dpal-text-primary)]"
          >
            Skip and go to main panel
          </button>
        </div>
        <div className="px-6 md:px-8 pb-6">
          <div className="rounded-xl border border-amber-300/30 bg-amber-900/15 px-4 py-3">
            <p className="text-[11px] font-bold text-amber-100">
              No money value. DPAL rewards are Cards, NFTs, and DPAL Coins only.
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default MissionGatewayModal;
