import React from 'react';
import { StatusChip } from './StatusChip';

export interface WorkspaceMetric {
  label: string;
  value: string;
}

export interface WorkspaceCardProps {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
  capabilities: string[];
  statusLabel: string;
  statusTone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  metrics: [WorkspaceMetric, WorkspaceMetric];
  onClick?: () => void;
  id?: string;
  /** Optional data provenance line under metrics */
  dataSourceLabel?: string;
}

export function WorkspaceCard({
  imageSrc,
  imageAlt,
  title,
  description,
  capabilities,
  statusLabel,
  statusTone = 'success',
  metrics,
  onClick,
  id,
  dataSourceLabel = 'Representative module metrics — not a live certification readout.',
}: WorkspaceCardProps): React.ReactElement {
  return (
    <article
      id={id}
      className="group flex w-full max-w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-sm shadow-slate-900/[0.04] transition hover:border-emerald-200/90 hover:shadow-md md:h-[min(100%,190px)] md:min-h-[168px] md:flex-row md:items-stretch"
    >
      <div className="relative h-[150px] w-full shrink-0 overflow-hidden bg-slate-100 md:h-full md:w-[240px] md:min-h-[150px]">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-900/30 via-transparent to-transparent" aria-hidden />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5 sm:p-6 md:flex-row md:items-center md:gap-6 md:px-8 md:py-6">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</h3>
            <StatusChip tone={statusTone} label={statusLabel} />
          </div>
          <p className="max-w-prose text-sm font-medium leading-relaxed text-slate-600">{description}</p>
          <div className="flex flex-wrap gap-2">
            {capabilities.map((c) => (
              <span
                key={c}
                className="inline-flex rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-slate-700"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-4 border-t border-slate-100 pt-4 md:w-[220px] md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-1 md:gap-3">
            {[metrics[0], metrics[1]].map((m) => (
              <div key={m.label}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{m.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{m.value}</p>
              </div>
            ))}
          </div>
          {dataSourceLabel ? <p className="text-[10px] font-medium leading-snug text-slate-400">{dataSourceLabel}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center gap-3 border-t border-slate-100 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <button
            type="button"
            onClick={onClick}
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 md:px-5"
          >
            Open Workspace
          </button>
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-900"
            aria-hidden
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </article>
  );
}
