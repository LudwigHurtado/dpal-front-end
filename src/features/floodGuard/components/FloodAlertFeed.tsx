import React from 'react';
import { AlertTriangle, Bot, MapPin, RefreshCw, ShieldCheck, Megaphone } from '../../../../components/icons';
import type { FloodAlert, FloodZone } from '../floodGuardTypes';
import { ALERT_LEVEL_COLORS, LIFECYCLE_LABEL, formatRelativeTimestamp } from './floodGuardUi';

interface FloodAlertFeedProps {
  alerts: FloodAlert[];
  zonesById: Record<string, FloodZone>;
  selectedAlertId?: string | null;
  onSelectAlert?: (alertId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

const FloodAlertFeed: React.FC<FloodAlertFeedProps> = ({
  alerts,
  zonesById,
  selectedAlertId,
  onSelectAlert,
  onRefresh,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl p-5 border dpal-border-subtle ${className}`}
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
            Live Detection Feed
          </div>
          <div className="text-sm font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
            {alerts.length} active alert{alerts.length === 1 ? '' : 's'}
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border dpal-border-subtle hover:opacity-80 transition flex items-center gap-1"
            style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div
          className="rounded-xl p-4 text-center text-xs dpal-text-muted"
          style={{ background: 'var(--dpal-surface-alt)' }}
        >
          <ShieldCheck className="w-5 h-5 mx-auto mb-2 opacity-60" />
          No active alerts in the current city. The feed will surface camera, citizen, and satellite signals as they arrive.
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => {
            const palette = ALERT_LEVEL_COLORS[alert.level];
            const zone = zonesById[alert.zoneId];
            const isSelected = selectedAlertId === alert.alertId;
            return (
              <li key={alert.alertId}>
                <button
                  type="button"
                  onClick={() => onSelectAlert?.(alert.alertId)}
                  className="w-full text-left rounded-xl px-3 py-3 transition"
                  style={{
                    background: isSelected ? palette.bg : 'var(--dpal-surface-alt)',
                    border: `1px solid ${isSelected ? palette.border : 'transparent'}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5"
                          style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}` }}
                        >
                          L{alert.level} · {alert.label}
                        </span>
                        <span className="text-[10px] dpal-text-muted">
                          {formatRelativeTimestamp(alert.updatedAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-semibold truncate" style={{ color: 'var(--dpal-text-primary)' }}>
                        {zone?.name ?? alert.zoneId}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] dpal-text-muted">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{alert.zoneId}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] dpal-text-muted">
                        <Bot className="w-3.5 h-3.5" />
                        <span>{LIFECYCLE_LABEL[alert.lifecycle]}</span>
                        <span className="opacity-50">·</span>
                        <span>Score {alert.riskScore}/100</span>
                      </div>
                      {alert.reasons[0] && (
                        <div className="mt-1.5 flex items-start gap-1.5 text-[11px]" style={{ color: palette.fg }}>
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
                          <span className="line-clamp-2">{alert.reasons[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Megaphone className="w-4 h-4" style={{ color: palette.fg }} />
                      <span className="text-[10px] dpal-text-muted">{alert.channels.length} ch</span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div
        className="mt-4 rounded-lg p-2.5 text-[11px] dpal-text-muted"
        style={{ background: 'var(--dpal-surface)', border: '1px dashed var(--dpal-border)' }}
      >
        DPAL FloodGuard provides verified civic flood intelligence. It does not replace official government emergency
        alerts. Continue to follow guidance from local authorities and weather services.
      </div>
    </div>
  );
};

export default FloodAlertFeed;
