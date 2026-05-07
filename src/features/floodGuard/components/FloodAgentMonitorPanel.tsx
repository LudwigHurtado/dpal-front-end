import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronRight,
  Cloud,
  Droplets,
  FileText,
  Globe,
  Loader,
  RefreshCw,
  ShieldCheck,
} from '../../../../components/icons';
import { floodGuardApi } from '../services/floodGuardApi';
import type {
  FloodAgentMonitorResponse,
  FloodMissionBridgeRecord,
  FloodMissionSafetyClassification,
  FloodZoneAgentEvaluation,
} from '../floodGuardTypes';
import { ALERT_LEVEL_COLORS } from './floodGuardUi';

const FLOODGUARD_LEGAL =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

const SAFETY_CHIP_STYLE: Record<
  FloodMissionSafetyClassification,
  { fg: string; bg: string; border: string; label: string }
> = {
  no_mission_allowed: {
    fg: '#fecaca',
    bg: 'rgba(239,68,68,0.2)',
    border: 'rgba(239,68,68,0.55)',
    label: 'No mission allowed',
  },
  remote_only: {
    fg: '#fde68a',
    bg: 'rgba(245,158,11,0.18)',
    border: 'rgba(245,158,11,0.5)',
    label: 'Remote only',
  },
  safe_distance_only: {
    fg: '#fef08a',
    bg: 'rgba(234,179,8,0.16)',
    border: 'rgba(234,179,8,0.45)',
    label: 'Safe distance only',
  },
  post_event_only: {
    fg: '#93c5fd',
    bg: 'rgba(59,130,246,0.18)',
    border: 'rgba(59,130,246,0.45)',
    label: 'Post-event only',
  },
  validator_review_required: {
    fg: '#e9d5ff',
    bg: 'rgba(168,85,247,0.2)',
    border: 'rgba(168,85,247,0.45)',
    label: 'Validator review',
  },
  mission_allowed: {
    fg: '#86efac',
    bg: 'rgba(34,197,94,0.18)',
    border: 'rgba(34,197,94,0.45)',
    label: 'Mission allowed',
  },
};

function SafetyChip({ classification }: { classification: FloodMissionSafetyClassification }) {
  const s = SAFETY_CHIP_STYLE[classification];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: s.fg, background: s.bg, border: `1px solid ${s.border}` }}
      title={classification}
    >
      {s.label}
    </span>
  );
}

export interface FloodAgentMonitorPanelProps {
  cityId: string;
  actorName: string;
  onOpenEvidenceForZone: (zoneId: string, alertId: string | null) => void;
}

const FloodAgentMonitorPanel: React.FC<FloodAgentMonitorPanelProps> = ({
  cityId,
  actorName,
  onOpenEvidenceForZone,
}) => {
  const [monitor, setMonitor] = useState<FloodAgentMonitorResponse | null>(null);
  const [dpalMissions, setDpalMissions] = useState<FloodMissionBridgeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dispatchKey, setDispatchKey] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  const refreshMissions = useCallback(async () => {
    const res = await floodGuardApi.listDpalMissions();
    if (res.ok) setDpalMissions(res.data.missions);
    else setDpalMissions([]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [monitorRes] = await Promise.all([floodGuardApi.getAgentMonitor(), refreshMissions()]);
    if (!monitorRes.ok) {
      setMonitor(null);
      setError(monitorRes.message);
      setLoading(false);
      return;
    }
    setMonitor(monitorRes.data);
    setLoading(false);
  }, [refreshMissions]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Map of "zoneId:missionType" -> latest active bridge record (open/in_progress). */
  const dispatchedByZoneAndType = useMemo(() => {
    const m = new Map<string, FloodMissionBridgeRecord>();
    for (const rec of dpalMissions) {
      if (rec.status === 'cancelled' || rec.status === 'completed') continue;
      const key = `${rec.sourceZoneId}:${rec.missionType}`;
      const prev = m.get(key);
      if (!prev || prev.createdAt < rec.createdAt) m.set(key, rec);
    }
    return m;
  }, [dpalMissions]);

  const zonesForCity = useMemo(
    () => (monitor ? monitor.zones.filter((z) => z.cityId === cityId) : []),
    [monitor, cityId],
  );

  const toggleZone = (zoneId: string) => {
    setExpanded((prev) => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  const handleDispatch = async (zone: FloodZoneAgentEvaluation, missionType: string) => {
    const key = `${zone.zoneId}:${missionType}`;
    setDispatchKey(key);
    setDispatchError(null);
    setDispatchSuccess(null);
    const res = await floodGuardApi.dispatchMission({
      zoneId: zone.zoneId,
      missionType,
      requestedBy: actorName.trim() || 'operator',
      safetyClassification: zone.missionSafetyClassification,
    });
    setDispatchKey(null);
    if (!res.ok) {
      setDispatchError(res.message + (res.code ? ` (${res.code})` : ''));
      return;
    }
    const dpalId = res.data.dpalMission?.missionId;
    setDispatchSuccess(
      `Dispatched ${res.data.mission.missionId} · ${missionType}` +
        (dpalId ? ` · DPAL mission ${dpalId}` : ''),
    );
    void refreshMissions();
  };

  if (loading && !monitor) {
    return (
      <div
        className="rounded-2xl p-8 border dpal-border-subtle flex flex-col items-center justify-center gap-3"
        style={{ background: 'var(--dpal-card)' }}
      >
        <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--dpal-primary)' }} />
        <p className="text-sm dpal-text-muted">Loading agent monitor…</p>
      </div>
    );
  }

  if (error && !monitor) {
    return (
      <div
        className="rounded-2xl p-5 border dpal-border-subtle space-y-3"
        style={{ background: 'var(--dpal-card)' }}
      >
        <div className="flex items-center gap-2 text-amber-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">Agent monitor unavailable</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--dpal-text-secondary)' }}>
          {error} The rest of FloodGuard keeps working with local or API feeds. Try again when the backend exposes{' '}
          <code className="text-[11px]">GET /api/floodguard/agents/monitor</code>.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)', color: 'var(--dpal-text-primary)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
        <p className="text-[11px] dpal-text-muted border-t border-dashed pt-3 dpal-border-subtle">{FLOODGUARD_LEGAL}</p>
      </div>
    );
  }

  if (!monitor) return null;

  const { integrations } = monitor;

  return (
    <div className="space-y-4">
      {/* Stage 12J — onboarding banner: this is the operational starting point. */}
      <div
        className="rounded-2xl p-3 text-[12px] leading-relaxed flex items-start gap-2"
        style={{
          background: 'rgba(34,211,238,0.08)',
          border: '1px solid rgba(34,211,238,0.35)',
          color: 'var(--dpal-text-secondary)',
        }}
      >
        <Bot className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#22d3ee' }} />
        <div>
          <span className="font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
            Start here for real flood intelligence.
          </span>{' '}
          Refresh the agent monitor to evaluate rainfall, satellite, water-level, historical risk,
          exposure, active alerts, and mission safety for each Geo-ID zone.
        </div>
      </div>

      <div
        className="rounded-2xl p-4 border dpal-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ background: 'var(--dpal-card)' }}
      >
        <div className="flex items-start gap-2">
          <Bot className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#22d3ee' }} />
          <div>
            <h2 className="text-sm font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
              Agent Monitor
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--dpal-text-secondary)' }}>
              Remote sensing first: rainfall, satellite water signals, and zone risk drive safety gates. Field tasks are
              optional and only from the safe catalog.
            </p>
            <p className="text-[10px] mt-2 dpal-text-muted">
              Evaluated <span className="font-mono">{monitor.evaluatedAt}</span> · Showing {zonesForCity.length} zone(s)
              for selected city
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shrink-0"
          style={{
            background: 'rgba(34,211,238,0.12)',
            border: '1px solid rgba(34,211,238,0.35)',
            color: '#22d3ee',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <Loader className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Refresh
        </button>
      </div>

      {(dispatchError || dispatchSuccess) && (
        <div
          className="rounded-xl px-3 py-2 text-xs font-medium border"
          style={{
            background: dispatchError ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
            borderColor: dispatchError ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.35)',
            color: dispatchError ? '#fecaca' : '#86efac',
          }}
        >
          {dispatchError ?? dispatchSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          className="rounded-2xl p-4 border dpal-border-subtle"
          style={{ background: 'var(--dpal-card)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-4 h-4" style={{ color: '#38bdf8' }} />
            <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">Rainfall integration</span>
          </div>
          <p className="text-xs font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
            {integrations.rainfall.providerLabel} · {integrations.rainfall.status}
          </p>
          {integrations.rainfall.message && (
            <p className="text-[11px] mt-1 dpal-text-muted">{integrations.rainfall.message}</p>
          )}
        </div>
        <div
          className="rounded-2xl p-4 border dpal-border-subtle"
          style={{ background: 'var(--dpal-card)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4" style={{ color: '#34d399' }} />
            <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">Satellite integration</span>
          </div>
          <p className="text-xs font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
            {integrations.satellite.providerLabel} · {integrations.satellite.status}
          </p>
          {integrations.satellite.message && (
            <p className="text-[11px] mt-1 dpal-text-muted">{integrations.satellite.message}</p>
          )}
        </div>
        <div
          className="rounded-2xl p-4 border dpal-border-subtle"
          style={{ background: 'var(--dpal-card)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4" style={{ color: '#60a5fa' }} />
            <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">Water-level integration</span>
          </div>
          {integrations.waterLevel ? (
            <>
              <p className="text-xs font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                {integrations.waterLevel.providerLabel} · {integrations.waterLevel.status}
              </p>
              {integrations.waterLevel.message && (
                <p className="text-[11px] mt-1 dpal-text-muted">{integrations.waterLevel.message}</p>
              )}
            </>
          ) : (
            <p className="text-[11px] dpal-text-muted">Water-level integration not returned by this API version.</p>
          )}
        </div>
      </div>

      <div
        className="rounded-2xl p-4 border dpal-border-subtle space-y-2"
        style={{ background: 'var(--dpal-surface-alt)' }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
          <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">Legal & safety</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--dpal-text-secondary)' }}>
          {FLOODGUARD_LEGAL} Users should follow official emergency guidance from local authorities.
        </p>
        {monitor.legalNotice && (
          <p className="text-[11px] dpal-text-muted border-t border-dashed pt-2 dpal-border-subtle">{monitor.legalNotice}</p>
        )}
      </div>

      {zonesForCity.length === 0 && (
        <div className="rounded-xl p-4 text-xs dpal-text-muted border dpal-border-subtle" style={{ background: 'var(--dpal-card)' }}>
          No evaluated zones for this city in the current monitor payload.
        </div>
      )}

      {zonesForCity.map((zone) => {
        const open = expanded[zone.zoneId] ?? true;
        const levelStyle = ALERT_LEVEL_COLORS[zone.alertLevel];
        const zoneMissions = dpalMissions.filter((m) => m.sourceZoneId === zone.zoneId);
        return (
          <div
            key={zone.zoneId}
            className="rounded-2xl border overflow-hidden dpal-border-subtle"
            style={{ background: 'var(--dpal-card)' }}
          >
            <button
              type="button"
              onClick={() => toggleZone(zone.zoneId)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left"
              style={{ background: 'var(--dpal-surface-alt)' }}
            >
              {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold truncate" style={{ color: 'var(--dpal-text-primary)' }}>
                    {zone.zoneName}
                  </span>
                  <span className="text-[10px] font-mono dpal-text-muted truncate">{zone.zoneId}</span>
                  <SafetyChip classification={zone.missionSafetyClassification} />
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                    style={{
                      color: levelStyle.fg,
                      background: levelStyle.bg,
                      border: `1px solid ${levelStyle.border}`,
                    }}
                  >
                    L{zone.alertLevel} {zone.alertLabel}
                  </span>
                  <span className="text-[10px] dpal-text-muted">
                    Risk {zone.riskScore}/100 · {zone.confidenceBand} confidence
                  </span>
                </div>
              </div>
            </button>

            {open && (
              <div className="p-4 space-y-4 border-t dpal-border-subtle">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted mb-1">Risk reasons</div>
                  <ul className="list-disc list-inside text-xs space-y-0.5" style={{ color: 'var(--dpal-text-secondary)' }}>
                    {zone.riskReasons.map((r, i) => (
                      <li key={`${i}-${r}`}>{r}</li>
                    ))}
                  </ul>
                </div>

                {zone.safetyRationale.length > 0 && (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted mb-1">
                      Safety rationale
                    </div>
                    <ul className="list-disc list-inside text-xs space-y-0.5" style={{ color: 'var(--dpal-text-secondary)' }}>
                      {zone.safetyRationale.map((r, i) => (
                        <li key={`${i}-${r}`}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted mb-2">Agent findings</div>
                  <div className="space-y-2">
                    {zone.agentFindings.map((f, idx) => (
                      <div
                        key={`${f.agentId}-${idx}`}
                        className="rounded-lg p-2 border text-xs dpal-border-subtle"
                        style={{ background: 'var(--dpal-background)' }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                            {f.agentLabel}
                          </span>
                          <span
                            className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
                            style={{
                              background:
                                f.severity === 'critical'
                                  ? 'rgba(239,68,68,0.2)'
                                  : f.severity === 'warning'
                                    ? 'rgba(245,158,11,0.2)'
                                    : 'rgba(34,211,238,0.12)',
                              color:
                                f.severity === 'critical'
                                  ? '#fecaca'
                                  : f.severity === 'warning'
                                    ? '#fde68a'
                                    : '#a5f3fc',
                            }}
                          >
                            {f.severity}
                          </span>
                        </div>
                        <p className="mt-1" style={{ color: 'var(--dpal-text-secondary)' }}>
                          {f.summary}
                        </p>
                        {f.details && f.details.length > 0 && (
                          <ul className="mt-1 list-disc list-inside text-[11px] dpal-text-muted">
                            {f.details.map((d) => (
                              <li key={d}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted mb-2">
                    Recommended missions (safe catalog)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="dpal-text-muted border-b dpal-border-subtle">
                          <th className="py-2 pr-2 font-semibold">Type</th>
                          <th className="py-2 pr-2 font-semibold">Title</th>
                          <th className="py-2 pr-2 font-semibold">Reason / scope</th>
                          <th className="py-2 pr-2 font-semibold">Safety gate</th>
                          <th className="py-2 pr-2 font-semibold">Zone</th>
                          <th className="py-2 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zone.recommendedMissions.map((m) => {
                          const dispatchedKey = `${zone.zoneId}:${m.missionType}`;
                          const existing = dispatchedByZoneAndType.get(dispatchedKey);
                          const inFlight = dispatchKey === dispatchedKey;
                          return (
                            <tr key={m.missionType} className="border-b dpal-border-subtle" style={{ color: 'var(--dpal-text-secondary)' }}>
                              <td className="py-2 pr-2 font-mono text-[10px]">{m.missionType}</td>
                              <td className="py-2 pr-2 font-medium" style={{ color: 'var(--dpal-text-primary)' }}>
                                {m.title}
                              </td>
                              <td className="py-2 pr-2 max-w-[220px]">{m.description}</td>
                              <td className="py-2 pr-2">
                                <SafetyChip classification={zone.missionSafetyClassification} />
                              </td>
                              <td className="py-2 pr-2 font-mono text-[10px]">{zone.zoneId}</td>
                              <td className="py-2">
                                {existing ? (
                                  <div className="flex flex-col gap-1">
                                    <span
                                      className="inline-flex items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                                      style={{
                                        background: 'rgba(34,197,94,0.12)',
                                        border: '1px solid rgba(34,197,94,0.35)',
                                        color: '#86efac',
                                      }}
                                      title={`DPAL mission ${existing.missionId} (status: ${existing.status})`}
                                    >
                                      Dispatched · {existing.status}
                                    </span>
                                    <span className="text-[10px] font-mono dpal-text-muted truncate max-w-[160px]">
                                      {existing.missionId}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={inFlight}
                                      onClick={() => void handleDispatch(zone, m.missionType)}
                                      className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
                                      style={{
                                        background: 'rgba(34,211,238,0.08)',
                                        border: '1px solid rgba(34,211,238,0.3)',
                                        color: '#22d3ee',
                                        opacity: inFlight ? 0.5 : 1,
                                      }}
                                    >
                                      {inFlight ? '…' : 'Re-dispatch'}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={inFlight}
                                    onClick={() => void handleDispatch(zone, m.missionType)}
                                    className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                                    style={{
                                      background: 'rgba(34,211,238,0.15)',
                                      border: '1px solid rgba(34,211,238,0.4)',
                                      color: '#22d3ee',
                                      opacity: inFlight ? 0.5 : 1,
                                    }}
                                  >
                                    {inFlight ? '…' : 'Dispatch'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted mb-2">
                    Blocked / unsafe patterns
                  </div>
                  <ul className="space-y-2">
                    {zone.blockedMissions.map((b, idx) => (
                      <li
                        key={`${b.missionType}-${idx}`}
                        className="rounded-lg p-2 border text-xs"
                        style={{
                          background: 'rgba(239,68,68,0.08)',
                          borderColor: 'rgba(239,68,68,0.25)',
                          color: '#fecaca',
                        }}
                      >
                        <span className="font-mono text-[10px] block dpal-text-muted">{b.missionType}</span>
                        <span className="block mt-1">{b.reason}</span>
                        <span className="block mt-1 text-[10px] opacity-80">Do not dispatch field work that matches this pattern.</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {zoneMissions.length > 0 && (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted mb-2">
                      DPAL bridge missions for this zone ({zoneMissions.length})
                    </div>
                    <ul className="space-y-2">
                      {zoneMissions.map((bm) => (
                        <li
                          key={bm.missionId}
                          className="rounded-lg p-2 border text-xs dpal-border-subtle"
                          style={{ background: 'var(--dpal-background)' }}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] dpal-text-muted">{bm.missionId}</span>
                            <span
                              className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
                              style={{
                                background: 'rgba(59,130,246,0.15)',
                                color: '#bfdbfe',
                                border: '1px solid rgba(59,130,246,0.35)',
                              }}
                            >
                              {bm.dpalCategory}
                            </span>
                            <SafetyChip classification={bm.safetyClassification} />
                            <span className="text-[10px] font-bold uppercase tracking-wide dpal-text-muted">
                              {bm.status}
                            </span>
                          </div>
                          <p className="mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
                            {bm.missionTitle}
                          </p>
                          <p className="mt-1 text-[11px]" style={{ color: 'var(--dpal-text-secondary)' }}>
                            {bm.missionDescription}
                          </p>
                          {bm.linkedEvidencePacketId && (
                            <p className="text-[10px] dpal-text-muted mt-1">
                              Evidence packet: <span className="font-mono">{bm.linkedEvidencePacketId}</span>
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t dpal-border-subtle">
                  <button
                    type="button"
                    onClick={() => onOpenEvidenceForZone(zone.zoneId, zone.activeAlertId)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
                    style={{
                      background: 'var(--dpal-surface-alt)',
                      border: '1px solid var(--dpal-border)',
                      color: 'var(--dpal-text-primary)',
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Evidence packet workflow
                  </button>
                  {!zone.activeAlertId && (
                    <span className="text-[10px] dpal-text-muted self-center">
                      No active alert for this zone — open Evidence tab after an alert exists to generate a packet.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FloodAgentMonitorPanel;
