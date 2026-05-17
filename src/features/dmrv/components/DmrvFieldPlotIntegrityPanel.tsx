import React from 'react';
import type { FieldPlotIntegrityBreakdown } from '../services/dmrvFieldPlotConfigService';

export type DmrvFieldPlotIntegrityPanelProps = {
  breakdown: FieldPlotIntegrityBreakdown;
  disabled?: boolean;
  onImproveScore: () => void;
  onAskAiFix: () => void;
};

export function DmrvFieldPlotIntegrityPanel({
  breakdown,
  disabled = false,
  onImproveScore,
  onAskAiFix,
}: DmrvFieldPlotIntegrityPanelProps): React.ReactElement {
  return (
    <div className="mb-4 rounded-xl border border-[#1e3a5f]/20 bg-[#e8f0f7] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1e3a5f]">
            Configuration Integrity Score: {breakdown.score}%
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Tracks project context, field plot coordinates, land cover, provenance, and evidence readiness.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onImproveScore}
            className="rounded-lg border border-[#1e3a5f]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#1e3a5f] hover:bg-slate-50 disabled:opacity-50"
          >
            Improve score
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onAskAiFix}
            className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-white disabled:opacity-50"
          >
            Ask AI how to fix this
          </button>
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
        <div
          className="h-full rounded-full bg-[#1e3a5f] transition-all"
          style={{ width: `${breakdown.score}%` }}
        />
      </div>

      {breakdown.missing.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Missing</p>
          <ul className="mt-1 list-inside list-disc text-xs text-slate-700">
            {breakdown.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {breakdown.checklist.map((item) => (
          <li
            key={item.label}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
              item.done
                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <span aria-hidden>{item.done ? '✓' : '○'}</span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
