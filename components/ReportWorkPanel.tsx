import React from 'react';
import { Briefcase, Home, ShieldCheck } from './icons';

interface ReportWorkPanelProps {
  onOpenMasterPanel: () => void;
}

const ReportWorkPanel: React.FC<ReportWorkPanelProps> = ({ onOpenMasterPanel }) => {
  return (
    <div className="font-sans text-white max-w-[1700px] mx-auto px-4 pb-16 animate-fade-in">
      <header className="sticky top-2 z-30 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl px-5 md:px-8 py-5 md:py-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-indigo-200" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Work Panel</h1>
          </div>
          <button
            type="button"
            onClick={onOpenMasterPanel}
            className="px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-sm font-semibold inline-flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Open Master Control Panel
          </button>
        </div>
      </header>

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
        <span className="inline-flex items-center gap-2"><Home className="w-4 h-4" />Home</span>
        <span className="mx-2.5 text-slate-500">/</span>
        <span>Work Panel</span>
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/85 to-slate-950/85 p-8 min-h-[600px]">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="rounded-2xl border border-indigo-300/20 bg-slate-900/70 p-4">
            <img
              src="/report-protect/work-mode-reference.png"
              alt="Work mode reference"
              className="w-full h-auto rounded-xl border border-white/10"
              draggable={false}
            />
          </div>

          <aside className="rounded-2xl border border-cyan-400/30 bg-cyan-900/10 p-5">
            <h2 className="text-xl font-bold text-cyan-100">Work for DPAL Coins</h2>
            <p className="text-sm text-slate-300 mt-2">
              Join work operations, missions, and case coordination to earn DPAL ecosystem rewards.
            </p>
            <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-900/15 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-amber-200">Reward Policy</p>
              <p className="text-sm text-slate-200 mt-2">
                No money value. DPAL rewards are paid only as Cards, NFTs, and DPAL Coins.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ReportWorkPanel;
