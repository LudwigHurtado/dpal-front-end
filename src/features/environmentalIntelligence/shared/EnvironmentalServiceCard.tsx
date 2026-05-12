import React from 'react';
import { ArrowRight } from '../../../../components/icons';
import type { HubServiceBadge } from './environmentalServiceStatus';

const badgeClass: Record<HubServiceBadge, string> = {
  Live: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  Partial: 'border-amber-300 bg-amber-50 text-amber-900',
  Preview: 'border-sky-300 bg-sky-50 text-sky-900',
  'Not configured': 'border-slate-300 bg-slate-100 text-slate-700',
  'Coming soon': 'border-slate-300 bg-white text-slate-600',
};

type Props = {
  title: string;
  subtitle: string;
  badge: HubServiceBadge;
  providerSummary?: string;
  watchHint?: string;
  onOpenWorkspace: () => void;
  openWorkspaceLabel?: string;
  accent?: 'emerald' | 'sky' | 'teal' | 'amber';
  children?: React.ReactNode;
};

const accentBar: Record<NonNullable<Props['accent']>, string> = {
  emerald: 'bg-emerald-600',
  sky: 'bg-sky-600',
  teal: 'bg-teal-600',
  amber: 'bg-amber-500',
};

const EnvironmentalServiceCard: React.FC<Props> = ({
  title,
  subtitle,
  badge,
  providerSummary,
  watchHint,
  onOpenWorkspace,
  openWorkspaceLabel = 'Open workspace',
  accent = 'emerald',
  children,
}) => {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className={`h-1 w-full ${accentBar[accent]}`} aria-hidden />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass[badge]}`}>
            {badge}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">{subtitle}</p>
        {providerSummary ? (
          <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700">{providerSummary}</p>
        ) : null}
        {watchHint ? <p className="mt-2 text-[10px] text-slate-500">{watchHint}</p> : null}
        {children ? <div className="mt-3 flex flex-wrap gap-2">{children}</div> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenWorkspace}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-900"
          >
            {openWorkspaceLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default EnvironmentalServiceCard;
