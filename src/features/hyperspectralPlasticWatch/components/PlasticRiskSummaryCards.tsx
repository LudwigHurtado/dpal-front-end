import React from 'react';
import type { HyperspectralPlasticScanResponse } from '../types';

type Props = {
  scan: HyperspectralPlasticScanResponse | null;
};

function band(s: string | undefined): string {
  if (!s) return '—';
  if (s === 'strong_candidate_for_review') return 'Strong candidate for review';
  if (s === 'elevated_plastic_risk_signal') return 'Elevated plastic-risk signal';
  if (s === 'watchlist') return 'Watchlist';
  if (s === 'low_confidence_no_clear_signal') return 'Low confidence / no clear signal';
  return s.replace(/_/g, ' ');
}

const PlasticRiskSummaryCards: React.FC<Props> = ({ scan }) => {
  const score = scan?.plasticRiskScore;
  const risk = scan ? band(scan.riskLevel) : '—';
  const pace = scan?.providers.pace.status ?? '—';
  const emit = scan?.providers.emit.status ?? '—';
  const fb = scan?.providers.sentinelLandsatFallback.status ?? '—';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Plastic-risk evidence score</p>
        <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{score != null ? score : '—'}</p>
        <p className="mt-1 text-[11px] text-slate-600 leading-snug">0–100 evidence-support composite (not a legal finding).</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Risk band</p>
        <p className="mt-2 text-sm font-semibold text-slate-900 leading-snug">{risk}</p>
        <p className="mt-1 text-[11px] text-slate-500">Requires field validation before enforcement use.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">PACE lane</p>
        <p className="mt-2 text-sm font-mono font-semibold text-slate-800">{pace}</p>
        <p className="mt-1 text-[10px] text-slate-500 line-clamp-3">{scan?.providers.pace.message}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">EMIT + Landsat context</p>
        <p className="mt-2 text-xs text-slate-800">
          <span className="font-mono font-semibold">{emit}</span>
          <span className="text-slate-400"> · </span>
          <span className="font-mono font-semibold">{fb}</span>
        </p>
        <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">{scan?.providers.emit.message}</p>
      </div>
    </div>
  );
};

export default PlasticRiskSummaryCards;
