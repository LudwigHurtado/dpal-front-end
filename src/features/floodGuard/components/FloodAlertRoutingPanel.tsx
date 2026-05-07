/**
 * Stage 12G — Alert Routing Panel (preview / dry-run only).
 *
 * Lists routing decisions returned from `POST /api/floodguard/alerts/:id/route-preview`
 * and historical previews from `GET /api/floodguard/alerts/:id/routing`. Every
 * decision is presented as preview-only — DPAL FloodGuard does NOT send real
 * SMS, email, webhook, or push notifications from this surface.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader,
  Megaphone,
  RefreshCw,
  Send,
  ShieldCheck,
} from '../../../../components/icons';
import { floodGuardApi } from '../services/floodGuardApi';
import type {
  FloodAlert,
  FloodRoutingDecision,
  FloodRoutingMode,
  FloodRoutingPreviewSummary,
} from '../floodGuardTypes';

const FLOODGUARD_LEGAL =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

const MODE_OPTIONS: Array<{ value: FloodRoutingMode; label: string; tone: string }> = [
  { value: 'dry_run', label: 'Dry-run (recommended)', tone: '#22d3ee' },
  { value: 'preview_only', label: 'Preview only', tone: '#a5f3fc' },
  { value: 'internal_only', label: 'Internal only (no preview channels)', tone: '#fde68a' },
  { value: 'external_disabled', label: 'External disabled', tone: '#fca5a5' },
];

const AUDIENCE_LABEL: Record<FloodRoutingDecision['audience'], string> = {
  dpal_operator: 'DPAL operator',
  city_validator: 'City validator',
  city_official: 'City official',
  emergency_contact: 'Emergency contact',
  school_admin: 'School admin',
  hospital_admin: 'Hospital admin',
  shelter_operator: 'Shelter operator',
  community_group: 'Community group',
  public_dashboard: 'Public dashboard',
  situation_room: 'Situation room',
};

const CHANNEL_LABEL: Record<FloodRoutingDecision['channel'], string> = {
  dashboard: 'Dashboard',
  situation_room: 'Situation room',
  email_preview: 'Email preview',
  sms_preview: 'SMS preview',
  webhook_preview: 'Webhook preview',
  public_map: 'Public map',
  mission_bridge: 'Mission bridge',
};

function PreviewBadge({ channel }: { channel: FloodRoutingDecision['channel'] }) {
  const isPreview = channel === 'email_preview' || channel === 'sms_preview' || channel === 'webhook_preview';
  if (!isPreview) return null;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{
        background: 'rgba(245,158,11,0.15)',
        color: '#fde68a',
        border: '1px solid rgba(245,158,11,0.4)',
      }}
      title="No outbound message is actually sent."
    >
      Preview only · no send
    </span>
  );
}

function RouteStateChip({ shouldRoute, mode }: { shouldRoute: boolean; mode: FloodRoutingMode }) {
  if (!shouldRoute) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ background: 'rgba(239,68,68,0.18)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.4)' }}
      >
        Blocked
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.4)' }}
      title={`Mode: ${mode}`}
    >
      Routable ({mode})
    </span>
  );
}

export interface FloodAlertRoutingPanelProps {
  alert: FloodAlert | null;
  actorName: string;
}

const FloodAlertRoutingPanel: React.FC<FloodAlertRoutingPanelProps> = ({ alert, actorName }) => {
  const [history, setHistory] = useState<FloodRoutingPreviewSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<FloodRoutingMode>('dry_run');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const alertId = alert?.alertId ?? null;

  const refreshHistory = useCallback(async () => {
    if (!alertId) {
      setHistory([]);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await floodGuardApi.listRoutingPreviews(alertId);
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      setHistory([]);
      return;
    }
    setHistory(res.data.previews);
  }, [alertId]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handleGenerate = async () => {
    if (!alertId) return;
    setGenerating(true);
    setError(null);
    setSuccess(null);
    const res = await floodGuardApi.previewRouting(alertId, {
      generatedBy: actorName.trim() || 'DPAL Operator',
      mode,
    });
    setGenerating(false);
    if (!res.ok) {
      setError(res.message + (res.code ? ` (${res.code})` : ''));
      return;
    }
    setSuccess(
      `Generated routing preview · ${res.data.preview.routableCount} routable / ${res.data.preview.blockedCount} blocked.`,
    );
    setHistory((prev) => [res.data.preview, ...prev]);
  };

  const latest = useMemo(() => history[0] ?? null, [history]);

  if (!alert) {
    return (
      <div className="rounded-2xl p-5 border dpal-border-subtle text-xs dpal-text-muted" style={{ background: 'var(--dpal-card)' }}>
        Select an alert to preview routing decisions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4 border dpal-border-subtle space-y-3"
        style={{ background: 'var(--dpal-card)' }}
      >
        <div className="flex items-start gap-2">
          <Megaphone className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--dpal-primary)' }} />
          <div className="flex-1">
            <h2 className="text-sm font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
              Alert Routing Preview
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--dpal-text-secondary)' }}>
              Generate a dry-run / preview-only routing decision tree. DPAL never sends real SMS, email, or webhook
              alerts from this surface — preview channels are dashboard-only.
            </p>
            <p className="text-[10px] mt-1 dpal-text-muted">
              Alert <span className="font-mono">{alert.alertId}</span> · L{alert.level} {alert.label} · risk{' '}
              {alert.riskScore}/100
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-wider dpal-text-muted">
            Routing mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as FloodRoutingMode)}
              className="mt-1 rounded-md px-2 py-1 text-xs"
              style={{
                background: 'var(--dpal-input-bg)',
                color: 'var(--dpal-input-text)',
                border: '1px solid var(--dpal-input-border)',
              }}
            >
              {MODE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold"
            style={{
              background: 'rgba(34,211,238,0.18)',
              border: '1px solid rgba(34,211,238,0.45)',
              color: '#22d3ee',
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Generate preview
          </button>
          <button
            type="button"
            onClick={() => void refreshHistory()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{
              background: 'var(--dpal-surface-alt)',
              border: '1px solid var(--dpal-border)',
              color: 'var(--dpal-text-primary)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh history
          </button>
        </div>

        {(error || success) && (
          <div
            className="rounded-xl px-3 py-2 text-xs font-medium border"
            style={{
              background: error ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
              borderColor: error ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.35)',
              color: error ? '#fecaca' : '#86efac',
            }}
          >
            {error ?? success}
          </div>
        )}

        <div
          className="rounded-lg p-2 text-[11px] flex items-start gap-2"
          style={{
            background: 'var(--dpal-surface)',
            border: '1px dashed var(--dpal-border)',
            color: 'var(--dpal-text-secondary)',
          }}
        >
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{FLOODGUARD_LEGAL}</span>
        </div>
      </div>

      {latest && <RoutingPreviewBlock preview={latest} expanded={expanded} setExpanded={setExpanded} latest />}

      {history.length > 1 && (
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
            Earlier previews ({history.length - 1})
          </div>
          {history.slice(1).map((preview) => (
            <RoutingPreviewBlock
              key={preview.generatedAt}
              preview={preview}
              expanded={expanded}
              setExpanded={setExpanded}
            />
          ))}
        </div>
      )}

      {!loading && history.length === 0 && !error && (
        <div
          className="rounded-xl p-4 text-xs flex items-start gap-2 border dpal-border-subtle"
          style={{ background: 'var(--dpal-card)', color: 'var(--dpal-text-secondary)' }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            No routing previews yet. Use Generate preview to create the first dry-run decision tree for this alert.
          </span>
        </div>
      )}
    </div>
  );
};

interface BlockProps {
  preview: FloodRoutingPreviewSummary;
  latest?: boolean;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const RoutingPreviewBlock: React.FC<BlockProps> = ({ preview, latest, expanded, setExpanded }) => {
  const key = preview.generatedAt;
  const open = expanded[key] ?? Boolean(latest);
  const toggle = () => setExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? Boolean(latest)) }));

  return (
    <div
      className="rounded-2xl border overflow-hidden dpal-border-subtle"
      style={{ background: 'var(--dpal-card)' }}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ background: 'var(--dpal-surface-alt)' }}
      >
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
              Preview {latest ? '(latest)' : ''}
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
              style={{ background: 'rgba(59,130,246,0.18)', color: '#bfdbfe', border: '1px solid rgba(59,130,246,0.4)' }}
            >
              mode: {preview.mode}
            </span>
            <span className="text-[10px] dpal-text-muted">
              {preview.routableCount} routable · {preview.blockedCount} blocked · {preview.totalDecisions} total
            </span>
          </div>
          <div className="text-[10px] mt-0.5 dpal-text-muted">
            generated <span className="font-mono">{preview.generatedAt}</span> by {preview.generatedBy}
          </div>
        </div>
      </button>

      {open && (
        <div className="p-4 border-t dpal-border-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="dpal-text-muted border-b dpal-border-subtle">
                  <th className="py-2 pr-2 font-semibold">State</th>
                  <th className="py-2 pr-2 font-semibold">Audience</th>
                  <th className="py-2 pr-2 font-semibold">Channel</th>
                  <th className="py-2 pr-2 font-semibold">Mode</th>
                  <th className="py-2 pr-2 font-semibold">Title</th>
                  <th className="py-2 pr-2 font-semibold">Body / blocked reason</th>
                  <th className="py-2 font-semibold">Links</th>
                </tr>
              </thead>
              <tbody>
                {preview.decisions.map((d) => (
                  <tr key={d.routingId} className="border-b dpal-border-subtle align-top" style={{ color: 'var(--dpal-text-secondary)' }}>
                    <td className="py-2 pr-2">
                      <RouteStateChip shouldRoute={d.shouldRoute} mode={d.mode} />
                    </td>
                    <td className="py-2 pr-2">
                      <span className="font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                        {AUDIENCE_LABEL[d.audience]}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium" style={{ color: 'var(--dpal-text-primary)' }}>
                          {CHANNEL_LABEL[d.channel]}
                        </span>
                        <PreviewBadge channel={d.channel} />
                      </div>
                    </td>
                    <td className="py-2 pr-2 font-mono text-[10px]">{d.mode}</td>
                    <td className="py-2 pr-2 max-w-[220px]" style={{ color: 'var(--dpal-text-primary)' }}>
                      {d.messageTitle}
                    </td>
                    <td className="py-2 pr-2 max-w-[320px]">
                      {d.shouldRoute ? (
                        <span>{d.messageBody}</span>
                      ) : (
                        <span style={{ color: '#fecaca' }}>
                          <span className="font-semibold">Blocked:</span> {d.blockedReason}
                          {d.blockedCode && (
                            <span className="block font-mono text-[10px] dpal-text-muted">code: {d.blockedCode}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-[10px] font-mono dpal-text-muted">
                      {d.linkedEvidencePacketId && (
                        <div title="Evidence packet">EV: {d.linkedEvidencePacketId}</div>
                      )}
                      {d.linkedMissionIds && d.linkedMissionIds.length > 0 && (
                        <div title="DPAL missions">M: {d.linkedMissionIds.join(', ')}</div>
                      )}
                      {!d.linkedEvidencePacketId && (!d.linkedMissionIds || d.linkedMissionIds.length === 0) && (
                        <span>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] mt-3 dpal-text-muted border-t border-dashed pt-3 dpal-border-subtle">
            {preview.legalDisclaimer}
          </p>
        </div>
      )}
    </div>
  );
};

export default FloodAlertRoutingPanel;
