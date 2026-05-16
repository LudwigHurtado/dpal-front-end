import React from 'react';

export type LiveSignalItem = {
  id: string;
  title: string;
  location: string;
  level: 'High' | 'Medium' | 'Low';
  timeLabel: string;
  sourceLabel: string;
};

const levelCls: Record<LiveSignalItem['level'], string> = {
  High: 'bg-rose-500/90 text-white',
  Medium: 'bg-amber-500/95 text-slate-950',
  Low: 'bg-sky-500/90 text-white',
};

export interface LiveSignalsRailProps {
  signals: LiveSignalItem[];
  onViewSignal?: (id: string) => void;
  className?: string;
}

export function LiveSignalsRail({ signals, onViewSignal, className = '' }: LiveSignalsRailProps): React.ReactElement {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-white/15 bg-slate-950/75 p-4 text-white shadow-xl ring-1 ring-white/10 backdrop-blur-md ${className}`}
      aria-label="Live signals preview"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-200">Live Signals</p>
        <span className="text-[10px] font-medium text-slate-400">Operational preview</span>
      </div>
      <ul className="max-h-[min(60vh,420px)] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {signals.map((s) => (
          <li key={s.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${levelCls[s.level]}`}>
                {s.level}
              </span>
              <span className="text-[10px] font-medium text-slate-400">{s.timeLabel}</span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug text-white">{s.title}</p>
            <p className="mt-1 text-xs text-slate-400">{s.location}</p>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">{s.sourceLabel}</p>
            {onViewSignal ? (
              <button
                type="button"
                onClick={() => onViewSignal(s.id)}
                className="mt-3 w-full rounded-lg border border-white/20 bg-white/5 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
              >
                View Signal
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
