import React, { useMemo } from 'react';
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

function confounderRiskLabel(scan: HyperspectralPlasticScanResponse | null): string {
  if (!scan) return 'Awaiting scan';
  const w = scan.spectralSignals.waterConfounders;
  const highs = [w.algae, w.turbidity, w.sediment, w.cloudsGlint].filter((v) => v === 'high').length;
  if (highs >= 2) return 'Elevated confounder risk';
  if (highs === 1) return 'Moderate confounder risk';
  if (w.algae === 'unknown' && w.turbidity === 'unknown') return 'Confounders not fully characterized';
  return 'Confounder screening complete';
}

function validationReadiness(scan: HyperspectralPlasticScanResponse | null): string {
  if (!scan) return 'Awaiting scan';
  if (scan.providers.emit.status === 'available' || scan.providers.pace.status === 'available') {
    return 'Spectral lanes returned data — still requires field validation';
  }
  if (scan.providers.emit.status === 'not_configured' && scan.providers.pace.status === 'not_configured') {
    return 'Hyperspectral lanes not configured — validation deferred';
  }
  return 'Requires field validation before enforcement use';
}

const PlasticRiskSummaryCards: React.FC<Props> = ({ scan }) => {
  const confidenceLine = useMemo(() => {
    if (!scan) return 'Awaiting scan';
    const c = scan.spectralSignals.confidence;
    if (typeof c !== 'number' || Number.isNaN(c)) return 'Not reported';
    return `${Math.round(c * 100)}% model confidence (evidence-support)`;
  }, [scan]);

  const signalLine = useMemo(() => {
    if (!scan) return 'Awaiting scan';
    return band(scan.spectralSignals.plasticRiskSignal);
  }, [scan]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Plastic-risk signal</p>
        <p className="mt-2 text-sm font-semibold text-slate-900 leading-snug">{signalLine}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
          {scan?.plasticRiskScore != null ? scan.plasticRiskScore : '—'}
          <span className="ml-1 text-xs font-semibold text-slate-500"> / 100</span>
        </p>
        <p className="mt-1 text-[11px] text-slate-600 leading-snug">Plastic-risk evidence score — possible anomaly context only.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Confidence</p>
        <p className="mt-2 text-lg font-bold text-slate-900 tabular-nums">{confidenceLine}</p>
        <p className="mt-1 text-[11px] text-slate-500">Candidate spectral signal strength context.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">PACE status</p>
        <p className="mt-2 text-sm font-mono font-semibold text-slate-800">{scan?.providers.pace.status ?? '—'}</p>
        <p className="mt-1 text-[10px] text-slate-500 line-clamp-3">{scan?.providers.pace.message ?? 'Awaiting scan'}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">EMIT status</p>
        <p className="mt-2 text-sm font-mono font-semibold text-slate-800">{scan?.providers.emit.status ?? '—'}</p>
        <p className="mt-1 text-[10px] text-slate-500 line-clamp-3">{scan?.providers.emit.message ?? 'Awaiting scan'}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Confounder risk</p>
        <p className="mt-2 text-sm font-semibold text-slate-900 leading-snug">{confounderRiskLabel(scan)}</p>
        <p className="mt-1 text-[11px] text-slate-500">Algae, turbidity, sediment, foam, clouds / glint screening.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Validation readiness</p>
        <p className="mt-2 text-sm font-semibold text-slate-900 leading-snug">{validationReadiness(scan)}</p>
        <p className="mt-1 text-[11px] text-slate-500">Evidence-support only until independent field confirmation.</p>
      </div>
    </div>
  );
};

export default PlasticRiskSummaryCards;
