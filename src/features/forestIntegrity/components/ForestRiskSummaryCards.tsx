import React from 'react';
import type { ForestIntegrityScanResponse } from '../types';

function bandLabel(riskLevel: string): string {
  if (riskLevel === 'strong_integrity') return 'Strong integrity (85–100)';
  if (riskLevel === 'watchlist') return 'Watchlist (65–84)';
  if (riskLevel === 'elevated_risk') return 'Elevated risk (40–64)';
  if (riskLevel === 'critical_concern') return 'Critical concern (0–39)';
  return 'Insufficient data';
}

type Props = {
  scan: ForestIntegrityScanResponse | null;
};

const ForestRiskSummaryCards: React.FC<Props> = ({ scan }) => {
  const score = scan?.forestIntegrityScore;
  const risk = scan?.riskLevel ?? 'unknown';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-xl border border-emerald-800/50 bg-gradient-to-br from-emerald-950/60 to-slate-950 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/80">Forest integrity score</p>
        <p className="mt-2 text-3xl font-black text-white tabular-nums">{score != null ? score : '—'}</p>
        <p className="mt-1 text-xs text-emerald-100/80">{bandLabel(risk)}</p>
        <p className="mt-2 text-[11px] text-slate-400 leading-snug">
          Weighted model: vegetation health 25, canopy change 25, FIRMS lane 20, deforestation lane 20, evidence
          completeness 10. Missing providers reduce confidence — see limitations on the scan.
        </p>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Indices snapshot</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
          <dt className="text-slate-500">NDVI</dt>
          <dd className="text-right font-mono text-slate-100">{scan?.indices.ndvi ?? '—'}</dd>
          <dt className="text-slate-500">NDMI</dt>
          <dd className="text-right font-mono text-slate-100">{scan?.indices.ndmi ?? '—'}</dd>
          <dt className="text-slate-500">NBR</dt>
          <dd className="text-right font-mono text-slate-100">{scan?.indices.nbr ?? '—'}</dd>
        </dl>
      </div>
    </div>
  );
};

export default ForestRiskSummaryCards;
