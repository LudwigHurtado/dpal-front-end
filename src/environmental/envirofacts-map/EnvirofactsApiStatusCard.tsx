import React from 'react';
import type { EnvirofactsSearchMeta } from '../../types/envirofactsTypes';

export type ApiConnectionStatus = 'idle' | 'loading' | 'connected' | 'fallback' | 'error';

type Props = {
  status: ApiConnectionStatus;
  meta: EnvirofactsSearchMeta | null;
  lastLiveMeta: EnvirofactsSearchMeta | null;
  errorMessage: string | null;
};

function formatIso(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const pill = (label: string, tone: 'slate' | 'emerald' | 'amber' | 'rose') => {
  const tones = {
    slate: 'border-slate-600 bg-slate-900/80 text-slate-200',
    emerald: 'border-emerald-800/60 bg-emerald-950/35 text-emerald-100',
    amber: 'border-amber-800/50 bg-amber-950/30 text-amber-100',
    rose: 'border-rose-800/50 bg-rose-950/35 text-rose-100',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{label}</span>
  );
};

const EnvirofactsApiStatusCard: React.FC<Props> = ({ status, meta, lastLiveMeta, errorMessage }) => {
  const statusLabel =
    status === 'loading'
      ? 'Loading'
      : status === 'connected'
        ? 'Connected'
        : status === 'fallback'
          ? 'Fallback'
          : status === 'error'
            ? 'Error'
            : 'Idle';

  const statusTone: 'slate' | 'emerald' | 'amber' | 'rose' =
    status === 'connected' ? 'emerald' : status === 'fallback' ? 'amber' : status === 'error' ? 'rose' : 'slate';

  const displayMeta = meta ?? lastLiveMeta;

  return (
    <section className="rounded-xl border border-slate-700/90 bg-slate-900/75 p-4 md:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 pb-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">Live API status</h2>
        {pill(`Status · ${statusLabel}`, statusTone)}
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2">
          <dt className="font-medium uppercase tracking-wide text-slate-500">API source</dt>
          <dd className="mt-1 font-medium text-slate-100">{displayMeta?.apiSource ?? 'EPA Envirofacts'}</dd>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2">
          <dt className="font-medium uppercase tracking-wide text-slate-500">Active table</dt>
          <dd className="mt-1 break-all font-mono text-[11px] text-slate-200">{displayMeta?.activeTable ?? 'lookups.mv_new_geo_best_picks'}</dd>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 sm:col-span-2 lg:col-span-1">
          <dt className="font-medium uppercase tracking-wide text-slate-500">Query mode</dt>
          <dd className="mt-1 text-slate-200">{displayMeta?.queryMode ?? 'Run a search to build an EPA request.'}</dd>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2">
          <dt className="font-medium uppercase tracking-wide text-slate-500">Records returned</dt>
          <dd className="mt-1 font-semibold text-slate-100">{displayMeta != null ? displayMeta.recordCount : '—'}</dd>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2">
          <dt className="font-medium uppercase tracking-wide text-slate-500">Pinnable records</dt>
          <dd className="mt-1 font-semibold text-slate-100">{displayMeta != null ? displayMeta.pinnableCount : '—'}</dd>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2">
          <dt className="font-medium uppercase tracking-wide text-slate-500">Without coordinates</dt>
          <dd className="mt-1 font-semibold text-slate-100">{displayMeta != null ? displayMeta.noCoordinateCount : '—'}</dd>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 sm:col-span-2 lg:col-span-3">
          <dt className="font-medium uppercase tracking-wide text-slate-500">Last successful live EPA call</dt>
          <dd className="mt-1 break-all font-mono text-[11px] text-slate-300">{formatIso(lastLiveMeta?.lastFetchedAtIso)}</dd>
        </div>
        {meta?.requestUrl ? (
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 sm:col-span-2 lg:col-span-3">
            <dt className="font-medium uppercase tracking-wide text-slate-500">Request URL</dt>
            <dd className="mt-1 break-all font-mono text-[10px] leading-relaxed text-slate-400">{meta.requestUrl}</dd>
          </div>
        ) : null}
      </dl>
      {errorMessage ? <p className="mt-3 rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-xs text-rose-100">{errorMessage}</p> : null}
    </section>
  );
};

export default EnvirofactsApiStatusCard;
