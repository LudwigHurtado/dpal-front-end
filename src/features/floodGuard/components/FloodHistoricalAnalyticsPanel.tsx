import React from 'react';
import { Activity, AlertTriangle, Database } from '../../../../components/icons';
import type { FloodHistoricalInsight } from '../floodGuardTypes';

interface FloodHistoricalAnalyticsPanelProps {
  insights: FloodHistoricalInsight[];
  className?: string;
}

const SEVERITY_COLORS: Record<FloodHistoricalInsight['severity'], { fg: string; bg: string; border: string }> = {
  info: { fg: '#22d3ee', bg: 'rgba(34,211,238,0.10)', border: 'rgba(34,211,238,0.4)' },
  warning: { fg: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.4)' },
  critical: { fg: '#ef4444', bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.45)' },
};

const FloodHistoricalAnalyticsPanel: React.FC<FloodHistoricalAnalyticsPanelProps> = ({
  insights,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl p-5 border dpal-border-subtle ${className}`}
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
        <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
          Historical Flood Analytics
        </div>
      </div>

      <p className="text-[11px] dpal-text-muted mb-4">
        DPAL FloodGuard treats every alert as a long-term civic record. The patterns below help cities prevent the
        next flood instead of only reacting to it.
      </p>

      <ul className="space-y-2">
        {insights.map((insight) => {
          const palette = SEVERITY_COLORS[insight.severity];
          return (
            <li
              key={insight.insightId}
              className="rounded-xl p-3"
              style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                    {insight.title}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--dpal-text-secondary)' }}>
                    {insight.summary}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] dpal-text-muted">
                    <Activity className="w-3.5 h-3.5" />
                    <span>{insight.occurrences} occurrence(s)</span>
                    <span>·</span>
                    <span>{insight.category.replace(/_/g, ' ')}</span>
                    {insight.zoneId && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{insight.zoneId}</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5"
                  style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}` }}
                >
                  {insight.severity}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className="mt-4 rounded-lg p-3 text-[11px] flex items-start gap-2"
        style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-secondary)' }}
      >
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
        <span>
          Analytics are aggregated from FloodGuard alerts and evidence packets. Independent verification of
          drainage failures, infrastructure negligence, or public-records claims still requires city engineers
          and regulators.
        </span>
      </div>
    </div>
  );
};

export default FloodHistoricalAnalyticsPanel;
