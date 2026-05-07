import React from 'react';
import { Activity, AlertTriangle, ShieldCheck } from '../../../../components/icons';
import type { FloodRiskScore, FloodZone } from '../floodGuardTypes';
import { ALERT_LEVEL_COLORS, CONFIDENCE_LABEL } from './floodGuardUi';

interface FloodRiskScoreCardProps {
  zone: FloodZone;
  score: FloodRiskScore;
  className?: string;
}

const FloodRiskScoreCard: React.FC<FloodRiskScoreCardProps> = ({ zone, score, className = '' }) => {
  const palette = ALERT_LEVEL_COLORS[score.alertLevel];
  const positiveFactors = score.factors.filter((f) => f.contribution > 0);
  const penalty = score.factors.find((f) => f.contribution < 0);

  return (
    <div
      className={`rounded-2xl p-5 border ${className}`}
      style={{
        background: 'var(--dpal-card)',
        borderColor: palette.border,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
            Flood Risk Score
          </div>
          <div className="text-sm font-semibold mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
            {zone.name}
          </div>
          <div className="text-[11px] dpal-text-muted font-mono mt-0.5">{zone.zoneId}</div>
        </div>
        <div className="flex flex-col items-end">
          <div
            className="rounded-xl px-3 py-2 flex items-baseline gap-2"
            style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
          >
            <span className="text-3xl font-black" style={{ color: palette.fg }}>
              {score.score}
            </span>
            <span className="text-xs dpal-text-muted">/ 100</span>
          </div>
          <div
            className="mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
            style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}` }}
          >
            Level {score.alertLevel} · {score.alertLabel}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] dpal-text-muted">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>{CONFIDENCE_LABEL[score.confidence]}</span>
        <span className="opacity-50">·</span>
        <Activity className="w-3.5 h-3.5" />
        <span>{positiveFactors.length} contributing factor(s)</span>
      </div>

      {positiveFactors.length > 0 && (
        <ul className="mt-4 space-y-2">
          {positiveFactors.map((factor, i) => (
            <li
              key={`${factor.label}-${i}`}
              className="flex items-start justify-between gap-3 rounded-xl px-3 py-2"
              style={{ background: 'var(--dpal-surface-alt)' }}
            >
              <div>
                <div className="text-xs font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                  {factor.label}
                </div>
                <div className="text-[11px] dpal-text-muted mt-0.5">{factor.detail}</div>
              </div>
              <div className="text-sm font-black" style={{ color: palette.fg }}>
                +{factor.contribution}
              </div>
            </li>
          ))}
        </ul>
      )}

      {penalty && (
        <div
          className="mt-3 rounded-xl px-3 py-2 flex items-start gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)' }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: '#ef4444' }} />
          <div className="flex-1">
            <div className="text-xs font-semibold" style={{ color: '#fecaca' }}>
              {penalty.label} ({penalty.contribution})
            </div>
            <div className="text-[11px] dpal-text-muted">{penalty.detail}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloodRiskScoreCard;
