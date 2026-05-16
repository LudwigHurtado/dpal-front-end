import React from 'react';
import { StatusChip } from './StatusChip';

export type OperationalEngineCardProps = {
  title: string;
  description: string;
  routeLabel: string;
  statusLabel?: string;
  onOpenLive: () => void;
  onOpenWithContext?: () => void;
  onVerifyOutput?: () => void;
};

export function OperationalEngineCard({
  title,
  description,
  routeLabel,
  statusLabel = 'Live route available',
  onOpenLive,
  onOpenWithContext,
  onVerifyOutput,
}: OperationalEngineCardProps): React.ReactElement {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
        <StatusChip tone="success" label={statusLabel} />
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{description}</p>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{routeLabel}</p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onOpenLive}
          className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          Open live engine
        </button>
        {onOpenWithContext ? (
          <button
            type="button"
            onClick={onOpenWithContext}
            className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50/60"
          >
            Open with CarbonPura context
          </button>
        ) : null}
        {onVerifyOutput ? (
          <button
            type="button"
            onClick={onVerifyOutput}
            className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Verify output
          </button>
        ) : null}
      </div>
    </div>
  );
}
