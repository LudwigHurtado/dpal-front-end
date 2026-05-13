import React from 'react';
import { ArrowRight } from '../../../../components/icons';
import type { HubServiceBadge } from './environmentalServiceStatus';

const badgeClass: Record<HubServiceBadge, string> = {
  Live: 'border-emerald-500/45 bg-emerald-500/15 text-emerald-200',
  Partial: 'border-amber-500/45 bg-amber-500/12 text-amber-100',
  Preview: 'border-sky-500/45 bg-sky-500/12 text-sky-100',
  'Not configured': 'border-slate-600 bg-slate-800/80 text-slate-300',
  'Coming soon': 'border-slate-600 bg-slate-800/60 text-slate-400',
};

type Props = {
  title: string;
  subtitle: string;
  badge: HubServiceBadge;
  providerSummary?: string;
  watchHint?: string;
  onOpenWorkspace: () => void;
  openWorkspaceLabel?: string;
  /**
   * Optional "Watch DPAL Work" CTA. When provided, renders a secondary button next to
   * "Open workspace" that should route into the module's Watch / workflow panel
   * (e.g. via the `#watch` deep-link hash). Must NOT auto-run a scan — opens or
   * focuses the workflow panel only.
   */
  onWatchDpalWork?: () => void;
  watchDpalWorkLabel?: string;
  accent?: 'emerald' | 'sky' | 'teal' | 'amber';
  children?: React.ReactNode;
  /** Environmental Intelligence library or main-screen artwork — fills the card visual band */
  heroImageSrc?: string;
  heroImageAlt?: string;
};

const accentBar: Record<NonNullable<Props['accent']>, string> = {
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  teal: 'bg-teal-500',
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
  onWatchDpalWork,
  watchDpalWorkLabel = 'Watch DPAL Work',
  accent = 'emerald',
  children,
  heroImageSrc,
  heroImageAlt,
}) => {
  const imgAlt = heroImageAlt ?? `${title} — reference imagery`;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-700/90 bg-slate-900/95 text-slate-100 shadow-lg shadow-black/30 transition hover:border-slate-500 hover:shadow-xl hover:shadow-black/40">
      <div className={`h-1 w-full shrink-0 ${accentBar[accent]}`} aria-hidden />
      <div className="flex min-h-0 flex-1 flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-semibold tracking-tight text-white">{title}</h3>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass[badge]}`}>
            {badge}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{subtitle}</p>

        {heroImageSrc ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/80 bg-black/50">
            <img
              src={encodeURI(heroImageSrc)}
              alt={imgAlt}
              className="h-40 w-full object-cover object-center sm:h-44"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : null}

        {providerSummary ? (
          <p className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2.5 py-1.5 text-[11px] text-slate-300">{providerSummary}</p>
        ) : null}
        {watchHint ? <p className="mt-2 text-[10px] text-slate-500">{watchHint}</p> : null}
        {children ? <div className="mt-3 flex flex-wrap gap-2">{children}</div> : null}
        <div className="mt-auto pt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenWorkspace}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            {openWorkspaceLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          {onWatchDpalWork ? (
            <button
              type="button"
              onClick={onWatchDpalWork}
              title="Opens the module workflow panel without running a scan."
              className="inline-flex items-center gap-2 rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 shadow-sm hover:border-slate-400 hover:bg-slate-700"
            >
              {watchDpalWorkLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default EnvironmentalServiceCard;
