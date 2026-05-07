import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Database,
  ExternalLink,
  FileText,
  Hash,
  QrCode,
  ShieldCheck,
} from '../../../../components/icons';
import { floodGuardApi } from '../services/floodGuardApi';
import type {
  FloodLedgerAnchorStatus,
  FloodPublicLedgerRecord,
  FloodPublicVerificationStatus,
} from '../floodGuardTypes';

/* ───────── Visual helpers (kept local; mirror dashboard styling) ──────── */

const STATUS_CHIP: Record<
  FloodLedgerAnchorStatus,
  { label: string; tone: string; bg: string; border: string }
> = {
  pending: {
    label: 'Pending anchor',
    tone: '#fde68a',
    bg: 'rgba(245,158,11,0.15)',
    border: 'rgba(245,158,11,0.4)',
  },
  anchored_mock: {
    label: 'Anchored (DPAL mock)',
    tone: '#86efac',
    bg: 'rgba(34,197,94,0.14)',
    border: 'rgba(34,197,94,0.4)',
  },
  anchored_live: {
    label: 'Anchored (live chain)',
    tone: '#bbf7d0',
    bg: 'rgba(16,185,129,0.18)',
    border: 'rgba(16,185,129,0.45)',
  },
  failed: {
    label: 'Anchor failed',
    tone: '#fecaca',
    bg: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.4)',
  },
  superseded: {
    label: 'Superseded',
    tone: '#cbd5e1',
    bg: 'rgba(148,163,184,0.18)',
    border: 'rgba(148,163,184,0.4)',
  },
};

const VERIFICATION_LABEL: Record<FloodPublicVerificationStatus, string> = {
  verified_anchored_mock: 'Verified · DPAL mock anchor',
  verified_anchored_live: 'Verified · live chain anchor',
  pending_anchor: 'Pending anchor',
  superseded: 'Superseded by newer anchor',
  failed: 'Anchor failed',
  unknown: 'Unknown',
};

function StatusChip({ status }: { status: FloodLedgerAnchorStatus }) {
  const s = STATUS_CHIP[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.tone, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

function MockChip({ isMock }: { isMock: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: isMock ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.18)',
        color: isMock ? '#fde68a' : '#bbf7d0',
        border: `1px solid ${isMock ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.45)'}`,
      }}
    >
      {isMock ? 'Mock' : 'Live'}
    </span>
  );
}

const CopyIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

interface CopyableRowProps {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  copyable?: boolean;
}

const CopyableRow: React.FC<CopyableRowProps> = ({ icon, label, value, copyable = true }) => {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore — clipboard unavailable in some browsers */
    }
  };
  if (!value) return null;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'var(--dpal-surface-alt)' }}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider dpal-text-muted">
        {icon ?? <Hash className="w-3.5 h-3.5" />} {label}
      </div>
      <div className="flex items-start gap-2 mt-1">
        <div
          className="font-mono text-[11px] break-all flex-1"
          style={{ color: 'var(--dpal-text-primary)' }}
        >
          {value}
        </div>
        {copyable && (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold border dpal-border-subtle transition"
            style={{
              background: copied ? 'rgba(16,185,129,0.18)' : 'var(--dpal-surface)',
              color: copied ? '#bbf7d0' : 'var(--dpal-text-primary)',
            }}
            aria-label={`Copy ${label}`}
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
};

/* ───────────────────────── Main page ───────────────────────── */

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; record: FloodPublicLedgerRecord; legalNotice: string }
  | { status: 'not_found' }
  | { status: 'unavailable'; message: string };

const FloodLedgerVerificationPage: React.FC = () => {
  const { ledgerRecordId } = useParams<{ ledgerRecordId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const load = useCallback(async (id: string) => {
    setState({ status: 'loading' });
    const res = await floodGuardApi.getPublicLedgerRecord(id);
    if (res.ok) {
      setState({ status: 'ok', record: res.data.record, legalNotice: res.data.legalNotice });
      return;
    }
    if (res.code === 'not_found') {
      setState({ status: 'not_found' });
      return;
    }
    setState({
      status: 'unavailable',
      message: res.message ?? 'DPAL FloodGuard verification service is currently unavailable.',
    });
  }, []);

  useEffect(() => {
    if (!ledgerRecordId) {
      setState({ status: 'not_found' });
      return;
    }
    void load(ledgerRecordId);
  }, [ledgerRecordId, load]);

  const goToFloodguard = useCallback(() => {
    navigate('/floodguard');
  }, [navigate]);

  const headerCard = useMemo(
    () => (
      <div
        className="rounded-2xl p-5 border dpal-border-subtle"
        style={{ background: 'var(--dpal-card)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
          <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
            DPAL FloodGuard Verification Record
          </div>
        </div>
        <div className="text-sm dpal-text-secondary">
          Public, QR-friendly view of an anchored FloodGuard evidence record. Private citizen
          reports, contact details, internal Situation Room messages, and operator notes are
          intentionally excluded from this page.
        </div>
      </div>
    ),
    [],
  );

  return (
    <div
      className="min-h-screen px-3 md:px-6 py-6"
      style={{ background: 'var(--dpal-background)' }}
    >
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goToFloodguard}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border dpal-border-subtle"
            style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to FloodGuard
          </button>
          {state.status === 'ok' && (
            <div className="flex items-center gap-1.5">
              <StatusChip status={state.record.anchorStatus} />
              <MockChip isMock={state.record.isMock} />
            </div>
          )}
        </div>

        {headerCard}

        {state.status === 'loading' && (
          <div
            className="rounded-2xl p-5 border dpal-border-subtle text-sm dpal-text-secondary"
            style={{ background: 'var(--dpal-card)' }}
          >
            Loading verification record…
          </div>
        )}

        {state.status === 'not_found' && (
          <div
            className="rounded-2xl p-5 border dpal-border-subtle space-y-2"
            style={{ background: 'var(--dpal-card)' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: '#fde68a' }} />
              <div className="text-sm font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                Verification record not found
              </div>
            </div>
            <div className="text-xs dpal-text-secondary">
              The ledger record id{ledgerRecordId ? ` ${ledgerRecordId}` : ''} could not be located.
              It may have been superseded by a newer anchor, or the link may be incorrect.
            </div>
            <div className="text-[11px] dpal-text-muted">
              DPAL FloodGuard provides verified civic flood intelligence and does not replace
              official government emergency alerts.
            </div>
          </div>
        )}

        {state.status === 'unavailable' && (
          <div
            className="rounded-2xl p-5 border dpal-border-subtle space-y-2"
            style={{ background: 'var(--dpal-card)' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: '#fde68a' }} />
              <div className="text-sm font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                Verification service temporarily unavailable
              </div>
            </div>
            <div className="text-xs dpal-text-secondary">
              {state.message} Try refreshing in a moment, or open the FloodGuard dashboard for the
              latest status.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => ledgerRecordId && load(ledgerRecordId)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: 'var(--dpal-primary)',
                  color: 'var(--md-sys-color-on-primary, #00201a)',
                }}
              >
                Retry
              </button>
              <button
                type="button"
                onClick={goToFloodguard}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border dpal-border-subtle"
                style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
              >
                Open dashboard
              </button>
            </div>
            <div className="text-[11px] dpal-text-muted">
              DPAL FloodGuard provides verified civic flood intelligence and does not replace
              official government emergency alerts.
            </div>
          </div>
        )}

        {state.status === 'ok' && (
          <>
            {/* Summary block */}
            <div
              className="rounded-2xl p-5 border dpal-border-subtle space-y-3"
              style={{ background: 'var(--dpal-card)' }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{
                    background: 'rgba(59,130,246,0.18)',
                    color: '#bfdbfe',
                    border: '1px solid rgba(59,130,246,0.4)',
                  }}
                >
                  {VERIFICATION_LABEL[state.record.verificationStatus]}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{
                    background: 'rgba(59,130,246,0.18)',
                    color: '#bfdbfe',
                    border: '1px solid rgba(59,130,246,0.4)',
                  }}
                >
                  {state.record.chainProviderLabel}
                </span>
              </div>
              <div
                className="rounded-xl px-3 py-3"
                style={{ background: 'var(--dpal-surface-alt)' }}
              >
                <div className="text-[10px] dpal-text-muted uppercase tracking-wider">
                  Public summary
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
                  {state.record.publicSummary}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CopyableRow
                  icon={<Database className="w-3.5 h-3.5" />}
                  label="Ledger record id"
                  value={state.record.ledgerRecordId}
                />
                <CopyableRow
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label="Alert id"
                  value={state.record.alertId}
                />
                <CopyableRow
                  label={`Geo-ID zone${state.record.zoneName ? ` · ${state.record.zoneName}` : ''}`}
                  value={state.record.zoneId}
                />
                <CopyableRow
                  label={`City${state.record.cityName ? ` · ${state.record.cityName}` : ''}`}
                  value={state.record.cityId}
                />
                <CopyableRow label="Evidence packet id" value={state.record.evidencePacketId} />
                <CopyableRow
                  label="Content hash (SHA-256)"
                  value={state.record.contentHash}
                />
                <CopyableRow
                  label="Anchoring hash (composite SHA-256)"
                  value={state.record.anchoringHash}
                />
                <CopyableRow
                  icon={<QrCode className="w-3.5 h-3.5" />}
                  label="QR payload"
                  value={state.record.qrPayload}
                />
              </div>

              <div className="text-[10px] dpal-text-muted">
                Created {new Date(state.record.createdAt).toLocaleString()} · Anchored{' '}
                {new Date(state.record.anchoredAt).toLocaleString()}
              </div>
            </div>

            {/* Provenance digests */}
            <div
              className="rounded-2xl p-5 border dpal-border-subtle space-y-3"
              style={{ background: 'var(--dpal-card)' }}
            >
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
                <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
                  Provenance digests
                </div>
              </div>
              <div className="text-xs dpal-text-secondary">
                Each digest is a SHA-256 of the corresponding adapter / evaluation snapshot at
                anchor time. Re-deriving the digest from the same upstream signals must match for
                the record to verify.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CopyableRow label="Rainfall digest" value={state.record.rainfallDigest} />
                <CopyableRow label="Satellite digest" value={state.record.satelliteDigest} />
                <CopyableRow label="Water-level digest" value={state.record.waterLevelDigest} />
                <CopyableRow
                  label="Agent findings digest"
                  value={state.record.agentFindingsDigest}
                />
                <CopyableRow
                  label="Routing preview digest"
                  value={state.record.routingPreviewDigest}
                />
              </div>
              {!state.record.rainfallDigest &&
                !state.record.satelliteDigest &&
                !state.record.waterLevelDigest &&
                !state.record.agentFindingsDigest &&
                !state.record.routingPreviewDigest && (
                  <div className="text-[11px] dpal-text-muted">
                    No provenance digests were attached to this record.
                  </div>
                )}
            </div>

            {/* Linked DPAL missions */}
            <div
              className="rounded-2xl p-5 border dpal-border-subtle space-y-2"
              style={{ background: 'var(--dpal-card)' }}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
                <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
                  Linked DPAL missions
                </div>
              </div>
              {state.record.linkedMissionIds.length === 0 ? (
                <div className="text-[11px] dpal-text-muted">
                  No DPAL missions were linked to this anchor at the time of recording.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {state.record.linkedMissionIds.map((id) => (
                    <span
                      key={id}
                      className="font-mono text-[11px] rounded-md px-2 py-1"
                      style={{
                        background: 'var(--dpal-surface-alt)',
                        border: '1px solid var(--dpal-border)',
                        color: 'var(--dpal-text-primary)',
                      }}
                    >
                      {id}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Mock / live note */}
            <div
              className="rounded-2xl p-4 border dpal-border-subtle text-[12px] flex items-start gap-2"
              style={{
                background: state.record.isMock ? 'rgba(245,158,11,0.08)' : 'var(--dpal-card)',
                borderColor: state.record.isMock
                  ? 'rgba(245,158,11,0.4)'
                  : 'var(--dpal-border)',
                color: 'var(--dpal-text-secondary)',
              }}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                {state.record.isMock
                  ? 'Local DPAL mock ledger record — not a public blockchain transaction. The composite anchoring hash binds the evidence packet to rainfall, satellite, water-level, agent findings, mission, and routing-preview digests for civic accountability review.'
                  : 'Live chain anchor recorded. Verify the anchoring hash against the chain provider before treating this record as authoritative.'}
              </div>
            </div>

            {/* Verification URL (live chains only) */}
            {state.record.verificationUrl && (
              <a
                href={state.record.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: 'var(--dpal-primary)',
                  color: 'var(--md-sys-color-on-primary, #00201a)',
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open chain explorer
              </a>
            )}

            {/* Privacy + legal */}
            <div
              className="rounded-2xl p-4 border dpal-border-subtle space-y-2"
              style={{ background: 'var(--dpal-card)' }}
            >
              <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
                Privacy notice
              </div>
              <div className="text-[12px] dpal-text-secondary">{state.record.privacyNotice}</div>
              <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted pt-1">
                Legal
              </div>
              <div className="text-[12px] dpal-text-secondary">{state.record.legalDisclaimer}</div>
              {state.legalNotice && state.legalNotice !== state.record.legalDisclaimer && (
                <div className="text-[11px] dpal-text-muted">{state.legalNotice}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FloodLedgerVerificationPage;
