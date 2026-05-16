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
}: WorkspaceCardProps): React.ReactElement {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className="group flex w-full max-w-full flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-md shadow-slate-900/[0.04] transition hover:border-emerald-200/80 hover:shadow-lg hover:shadow-slate-900/[0.07] md:flex-row md:items-stretch"
    >
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-slate-100 md:h-auto md:w-[min(280px,32%)] md:min-h-[200px]">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-900/25 via-transparent to-transparent" aria-hidden />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-6 sm:p-8">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</h3>
            <StatusChip tone={statusTone} label={statusLabel} />
          </div>
          <p className="max-w-prose text-sm leading-relaxed text-slate-600">{description}</p>
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

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-6">
            {[metrics[0], metrics[1]].map((m) => (
              <div key={m.label}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{m.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{m.value}</p>
              </div>
            ))}
          </div>
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
    </button>
  );
}
