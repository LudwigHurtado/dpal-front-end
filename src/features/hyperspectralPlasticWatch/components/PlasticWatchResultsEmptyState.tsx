import React from 'react';

type Props = {
  onGoToOverview?: () => void;
  onRunScan?: () => void;
  isRunning?: boolean;
};

export function PlasticWatchResultsEmptyState({
  onGoToOverview,
  onRunScan,
  isRunning = false,
}: Props): React.ReactElement {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-center">
      <p className="text-sm font-semibold text-slate-900">No scan results yet</p>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-600">
        Set your area in the <strong>left panel</strong> (search or click the map), then run{' '}
        <strong>Watch DPAL Work</strong> for the full step-by-step flow, or <strong>Run scan</strong> for a quicker
        metadata pull. Results, PACE granule details, and the evidence packet appear here after a successful run.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {onRunScan ? (
          <button
            type="button"
            disabled={isRunning}
            onClick={onRunScan}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
          >
            Run scan
          </button>
        ) : null}
        {onGoToOverview ? (
          <button
            type="button"
            onClick={onGoToOverview}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            Read project overview
          </button>
        ) : null}
      </div>
    </div>
  );
}
