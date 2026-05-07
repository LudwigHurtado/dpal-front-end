import React from 'react';
import { Activity, Database, MapPin, ShieldCheck, AlertTriangle } from '../../../../components/icons';
import type {
  FloodAlert,
  FloodCitizenReport,
  FloodRiskScore,
  FloodWeatherSignal,
  FloodZone,
} from '../floodGuardTypes';
import { ALERT_LEVEL_COLORS, RISK_CATEGORY_COLORS, formatRelativeTimestamp } from './floodGuardUi';

interface FloodZoneDetailPanelProps {
  zone: FloodZone;
  score?: FloodRiskScore;
  alert?: FloodAlert | null;
  weather?: FloodWeatherSignal | null;
  citizenReports?: FloodCitizenReport[];
  className?: string;
}

const FloodZoneDetailPanel: React.FC<FloodZoneDetailPanelProps> = ({
  zone,
  score,
  alert,
  weather,
  citizenReports = [],
  className = '',
}) => {
  const palette = score
    ? ALERT_LEVEL_COLORS[score.alertLevel]
    : { fg: RISK_CATEGORY_COLORS[zone.riskCategory], bg: 'rgba(255,255,255,0.05)', border: RISK_CATEGORY_COLORS[zone.riskCategory], label: zone.riskCategory };

  return (
    <div
      className={`rounded-2xl p-5 border dpal-border-subtle ${className}`}
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
            Flood Zone
          </div>
          <div className="text-base font-semibold mt-1 truncate" style={{ color: 'var(--dpal-text-primary)' }}>
            {zone.name}
          </div>
          <div className="text-[11px] dpal-text-muted font-mono mt-0.5">
            {zone.zoneId} · geohash {zone.geohash}
          </div>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5"
          style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}` }}
        >
          {zone.riskCategory}
        </span>
      </div>

      <p className="mt-3 text-xs" style={{ color: 'var(--dpal-text-secondary)' }}>
        {zone.description}
      </p>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        {[
          { label: 'Schools', value: zone.exposure.schools },
          { label: 'Hospitals', value: zone.exposure.hospitals },
          { label: 'Shelters', value: zone.exposure.shelters },
          { label: 'Major roads', value: zone.exposure.majorRoads },
          { label: 'Bridges', value: zone.exposure.bridges },
          { label: 'Residents', value: zone.exposure.estimatedResidents.toLocaleString() },
        ].map((entry) => (
          <div
            key={entry.label}
            className="rounded-lg px-2.5 py-1.5"
            style={{ background: 'var(--dpal-surface-alt)' }}
          >
            <div className="dpal-text-muted text-[10px] uppercase tracking-wider">{entry.label}</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
              {entry.value}
            </div>
          </div>
        ))}
      </div>

      {weather && (
        <div
          className="mt-4 rounded-xl px-3 py-3"
          style={{ background: 'var(--dpal-surface-alt)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5" style={{ color: 'var(--dpal-primary)' }} />
            <div className="text-[10px] font-bold uppercase tracking-wider dpal-text-muted">
              Live signals (mock)
            </div>
            <span className="ml-auto text-[10px] dpal-text-muted">
              {formatRelativeTimestamp(weather.capturedAt)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]" style={{ color: 'var(--dpal-text-primary)' }}>
            <div>30m rainfall: <strong>{weather.rainfall30mMm} mm</strong></div>
            <div>24h rainfall: <strong>{weather.rainfall24hMm} mm</strong></div>
            {weather.riverGaugeMeters !== undefined && (
              <div>River gauge: <strong>{weather.riverGaugeMeters.toFixed(2)} m</strong></div>
            )}
            {weather.riverDeltaMeters !== undefined && (
              <div>Δ baseline: <strong>{weather.riverDeltaMeters >= 0 ? '+' : ''}{weather.riverDeltaMeters.toFixed(2)} m</strong></div>
            )}
            {weather.satelliteWaterExpansionPct !== undefined && (
              <div>Sat water expansion: <strong>{weather.satelliteWaterExpansionPct}%</strong></div>
            )}
          </div>
        </div>
      )}

      {citizenReports.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--dpal-primary)' }} />
            <div className="text-[10px] font-bold uppercase tracking-wider dpal-text-muted">
              Citizen reports ({citizenReports.length})
            </div>
          </div>
          <ul className="space-y-2">
            {citizenReports.slice(0, 3).map((report) => (
              <li
                key={report.reportId}
                className="rounded-lg px-2.5 py-2"
                style={{ background: 'var(--dpal-surface-alt)' }}
              >
                <div className="text-xs" style={{ color: 'var(--dpal-text-primary)' }}>
                  {report.description}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] dpal-text-muted">
                  <span>{report.reporterHandle ?? 'anon'}</span>
                  <span>·</span>
                  <span>{formatRelativeTimestamp(report.timestamp)}</span>
                  {typeof report.observedDepthCm === 'number' && (
                    <>
                      <span>·</span>
                      <span>~{report.observedDepthCm} cm</span>
                    </>
                  )}
                  {report.hasPhoto && (
                    <>
                      <span>·</span>
                      <span>photo</span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alert && (
        <div
          className="mt-4 rounded-xl px-3 py-3"
          style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: palette.fg }} />
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: palette.fg }}>
              Active alert
            </div>
            <span className="ml-auto text-[10px] dpal-text-muted">
              {formatRelativeTimestamp(alert.updatedAt)}
            </span>
          </div>
          <div className="text-xs mt-1.5" style={{ color: 'var(--dpal-text-primary)' }}>
            Level {alert.level} · {alert.label} · {alert.audiences.length} audience(s) routed
          </div>
        </div>
      )}

      {zone.history.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-3.5 h-3.5" style={{ color: 'var(--dpal-primary)' }} />
            <div className="text-[10px] font-bold uppercase tracking-wider dpal-text-muted">
              Historical events
            </div>
          </div>
          <ul className="space-y-1.5">
            {zone.history.map((event) => (
              <li
                key={`${zone.zoneId}-${event.date}`}
                className="rounded-lg px-2.5 py-1.5 text-[11px]"
                style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
              >
                <span className="font-semibold">{event.date}</span> · {event.summary}{' '}
                <span className="dpal-text-muted">(peak L{event.peakLevel})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="mt-4 flex items-start gap-2 text-[11px] rounded-lg px-3 py-2"
        style={{ background: 'var(--dpal-surface)', border: '1px dashed var(--dpal-border)', color: 'var(--dpal-text-secondary)' }}
      >
        <ShieldCheck className="w-3.5 h-3.5 mt-0.5" />
        <span>
          DPAL FloodGuard detections are screening signals to support city decisions and citizen awareness.
          They do not replace official government emergency alerts.
        </span>
      </div>
    </div>
  );
};

export default FloodZoneDetailPanel;
