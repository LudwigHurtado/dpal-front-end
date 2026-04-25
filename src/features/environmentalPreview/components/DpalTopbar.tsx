import React from 'react';

interface DpalTopbarProps {
  title: string;
  subtitle?: string;
}

const DpalTopbar: React.FC<DpalTopbarProps> = ({ title, subtitle }) => {
  return (
    <header className="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-4 md:px-6 md:py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">DPAL Environmental Intelligence</p>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600 mt-1 max-w-3xl">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          placeholder="Search facilities, packets, alerts..."
          className="w-full sm:w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white hover:bg-slate-50">
          Notifications
        </button>
        <div className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-2 text-sm text-slate-700">Analyst: DPAL Ops</div>
      </div>
    </header>
  );
};

export default DpalTopbar;
