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
        <p className="text-xl font-semibold">Work operations workspace ready.</p>
        <p className="text-slate-300 mt-2 max-w-3xl">
          This screen is now separated from the dashboard and master control panel. Add your final Work Panel image and layout here in the next step.
        </p>
      </div>
    </div>
  );
};

export default ReportWorkPanel;
