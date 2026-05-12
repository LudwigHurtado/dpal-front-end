import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Clock,
  Loader,
  X,
} from '../../../../components/icons';
import type { ForestWatchStep } from '../types';

type Props = {
  open: boolean;
  steps: ForestWatchStep[];
  logLines: string[];
  isRunning: boolean;
  onClose: () => void;
  onStop: () => void;
  onRestart: () => void;
};

function statusLabel(status: ForestWatchStep['status']): string {
  if (status === 'pending') return 'Pending';
  if (status === 'running') return 'In Progress';
  if (status === 'complete') return 'Completed';
  if (status === 'warning') return 'Warning';
  if (status === 'failed') return 'Failed';
  if (status === 'skipped') return 'Stopped';
  return status;
}

function StepIcon({ status }: { status: ForestWatchStep['status'] }) {
  const wrap = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-slate-600';
  if (status === 'complete') {
    return (
      <div className={`${wrap} border-emerald-200 bg-emerald-50 text-emerald-800`}>
        <Check className="h-4 w-4" />
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className={`${wrap} border-cyan-200 bg-cyan-50 text-cyan-800`}>
        <Loader className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (status === 'warning') {
    return (
      <div className={`${wrap} border-amber-200 bg-amber-50 text-amber-800`}>
        <AlertTriangle className="h-4 w-4" />
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className={`${wrap} border-rose-200 bg-rose-50 text-rose-800`}>
        <AlertCircle className="h-4 w-4" />
      </div>
    );
  }
  if (status === 'skipped') {
    return (
      <div className={`${wrap} border-slate-200 bg-slate-100 text-slate-500`}>
        <X className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className={`${wrap} border-slate-200 bg-white text-slate-400`}>
      <Clock className="h-4 w-4" />
    </div>
  );
}

const ForestWatchAutomationPanel: React.FC<Props> = ({ open, steps, logLines, isRunning, onClose, onStop, onRestart }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="forest-watch-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p id="forest-watch-title" className="text-sm font-semibold text-slate-900 tracking-tight">
              Watch DPAL Work
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Step-by-step provider calls for this AOI.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {steps.map((step, idx) => (
            <div key={step.id} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <div className="flex gap-3">
                <StepIcon status={step.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900">
                      {idx + 1}. {step.title}
                    </p>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      {statusLabel(step.status)}
                    </span>
                  </div>
                  {step.provider ? <p className="text-[10px] text-slate-500 mt-0.5">{step.provider}</p> : null}
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">{step.explanation}</p>
                  {step.detail ? (
                    <p className="text-[10px] font-mono text-slate-500 mt-1 whitespace-pre-wrap break-words">{step.detail}</p>
                  ) : null}
                  {step.at ? <p className="text-[10px] text-slate-400 mt-1 tabular-nums">{step.at}</p> : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Live log</p>
          <div className="max-h-36 overflow-y-auto rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[10px] leading-relaxed text-slate-700 space-y-0.5">
            {logLines.length === 0 ? <p className="text-slate-400">No log lines yet.</p> : null}
            {logLines.map((line, i) => (
              <p key={i} className="break-words">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-3 py-3">
          <button
            type="button"
            disabled={!isRunning}
            onClick={onStop}
            className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Stop Scan
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={onRestart}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Restart Scan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForestWatchAutomationPanel;
