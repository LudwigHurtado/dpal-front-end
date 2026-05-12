import React from 'react';
import type { ForestWatchStep } from '../types';

type Props = {
  open: boolean;
  steps: ForestWatchStep[];
  isRunning: boolean;
  onClose: () => void;
  onStop: () => void;
  onRestart: () => void;
};

function statusStyles(status: ForestWatchStep['status']): string {
  if (status === 'complete') return 'border-emerald-600/50 bg-emerald-950/25 text-emerald-100';
  if (status === 'running') return 'border-cyan-500/50 bg-cyan-950/30 text-cyan-100 animate-pulse';
  if (status === 'warning') return 'border-amber-500/50 bg-amber-950/25 text-amber-100';
  if (status === 'failed') return 'border-rose-600/50 bg-rose-950/30 text-rose-100';
  if (status === 'skipped') return 'border-slate-600/40 bg-slate-900/40 text-slate-500';
  return 'border-slate-700/80 bg-black/25 text-slate-400';
}

const ForestWatchAutomationPanel: React.FC<Props> = ({ open, steps, isRunning, onClose, onStop, onRestart }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/55 p-3 sm:p-4">
      <div
        className="w-full max-w-lg max-h-full overflow-y-auto rounded-2xl border border-emerald-800/60 bg-slate-950 shadow-2xl flex flex-col"
        role="dialog"
        aria-labelledby="forest-watch-title"
      >
        <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-emerald-900/50 bg-slate-950/95 px-4 py-3">
          <div>
            <p id="forest-watch-title" className="text-sm font-black text-white tracking-tight">
              Watch DPAL Work
            </p>
            <p className="text-[10px] text-slate-500">Live provider-backed steps — no hidden automation.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-900"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-3 flex-1">
          {steps.map((step, idx) => (
            <div key={step.id} className={`rounded-xl border px-3 py-2.5 ${statusStyles(step.status)}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold text-white">
                  {idx + 1}. {step.title}
                </p>
                <span className="text-[9px] uppercase font-mono shrink-0 opacity-80">{step.status}</span>
              </div>
              {step.provider ? <p className="text-[10px] text-slate-400 mt-0.5">Provider: {step.provider}</p> : null}
              <p className="text-[11px] text-slate-300/95 mt-1 leading-snug">{step.explanation}</p>
              {step.detail ? (
                <p className="text-[10px] font-mono text-slate-500 mt-1 whitespace-pre-wrap break-words">{step.detail}</p>
              ) : null}
              {step.at ? <p className="text-[9px] text-slate-500 mt-1">Timestamp: {step.at}</p> : null}
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-emerald-900/50 bg-slate-950/95 p-3">
          <button
            type="button"
            disabled={!isRunning}
            onClick={onStop}
            className="rounded-lg border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-100 disabled:opacity-40"
          >
            Stop scan
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={onRestart}
            className="rounded-lg border border-emerald-600/60 bg-emerald-950/35 px-3 py-2 text-xs font-semibold text-emerald-100 disabled:opacity-40"
          >
            Restart scan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForestWatchAutomationPanel;
