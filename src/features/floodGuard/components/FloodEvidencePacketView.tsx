import React from 'react';
import {
  AlertTriangle,
  Database,
  ExternalLink,
  FileText,
  Hash,
  QrCode,
  ShieldCheck,
} from '../../../../components/icons';
import type {
  FloodEvidencePacket,
  FloodLedgerAnchorStatus,
  FloodLedgerRecord,
} from '../floodGuardTypes';

interface FloodEvidencePacketViewProps {
  packet: FloodEvidencePacket | null;
  onGenerate?: () => void;
  onAnchor?: () => void;
  generating?: boolean;
  anchoring?: boolean;
  className?: string;
}

const STATUS_COPY: Record<FloodLedgerAnchorStatus, { label: string; tone: string; bg: string; border: string }> = {
  pending: { label: 'Pending anchor', tone: '#fde68a', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
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
  failed: { label: 'Anchor failed', tone: '#fecaca', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' },
  superseded: {
    label: 'Superseded',
    tone: '#cbd5e1',
    bg: 'rgba(148,163,184,0.18)',
    border: 'rgba(148,163,184,0.4)',
  },
};

function StatusChip({ status }: { status: FloodLedgerAnchorStatus }) {
  const s = STATUS_COPY[status];
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
      title={isMock ? 'Local DPAL mock ledger record — not a public blockchain transaction.' : 'Anchored on a real chain'}
    >
      {isMock ? 'Mock' : 'Live'}
    </span>
  );
}

function DigestRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'var(--dpal-surface-alt)' }}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider dpal-text-muted">
        <Hash className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="font-mono text-[11px] break-all mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function LedgerBlock({ record }: { record: FloodLedgerRecord }) {
  const verifyHref = `/floodguard/verify/${encodeURIComponent(record.ledgerRecordId)}`;
  return (
    <div
      className="rounded-2xl p-4 border dpal-border-subtle space-y-3"
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Database className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
        <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
          DPAL ledger record
        </span>
        <StatusChip status={record.anchorStatus} />
        <MockChip isMock={record.isMock} />
        <span
          className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
          style={{
            background: 'rgba(59,130,246,0.18)',
            color: '#bfdbfe',
            border: '1px solid rgba(59,130,246,0.4)',
          }}
        >
          {record.chainProviderLabel}
        </span>
        <a
          href={verifyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border dpal-border-subtle"
          style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
          title="Open public verification page"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open verification page
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <DigestRow label="Ledger record id" value={record.ledgerRecordId} />
        <DigestRow label="Anchoring hash (composite SHA-256)" value={record.anchoringHash} />
        <DigestRow label="Content hash" value={record.contentHash} />
        <DigestRow label="Evidence packet" value={record.evidencePacketId} />
        <DigestRow label="Rainfall digest" value={record.rainfallDigest} />
        <DigestRow label="Satellite digest" value={record.satelliteDigest} />
        <DigestRow label="Water-level digest" value={record.waterLevelDigest} />
        <DigestRow label="Agent findings digest" value={record.agentFindingsDigest} />
        <DigestRow label="Routing preview digest" value={record.routingPreviewDigest} />
        <DigestRow label="QR payload" value={record.qrPayload} />
      </div>

      {record.linkedMissionIds.length > 0 && (
        <div className="rounded-lg px-3 py-2" style={{ background: 'var(--dpal-surface-alt)' }}>
          <div className="text-[10px] uppercase tracking-wider dpal-text-muted">Linked DPAL missions</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {record.linkedMissionIds.map((id) => (
              <span
                key={id}
                className="font-mono text-[10px] rounded-md px-1.5 py-0.5"
                style={{
                  background: 'var(--dpal-surface)',
                  border: '1px solid var(--dpal-border)',
                  color: 'var(--dpal-text-primary)',
                }}
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className="rounded-lg px-3 py-2 text-[11px] flex items-start gap-2"
        style={{
          background: record.isMock ? 'rgba(245,158,11,0.08)' : 'var(--dpal-surface)',
          border: `1px dashed ${record.isMock ? 'rgba(245,158,11,0.35)' : 'var(--dpal-border)'}`,
          color: 'var(--dpal-text-secondary)',
        }}
      >
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {record.isMock
            ? 'Local DPAL mock ledger record — not a public blockchain transaction. The composite anchoring hash binds the evidence packet to rainfall, satellite, water-level, agent findings, mission, and routing-preview digests.'
            : 'Live chain anchor recorded. Verify against the chain provider before treating as authoritative.'}
        </span>
      </div>

      <div className="text-[10px] dpal-text-muted">
        Created {new Date(record.createdAt).toLocaleString()} by {record.createdBy} · Anchored{' '}
        {new Date(record.anchoredAt).toLocaleString()}
      </div>

      <div
        className="rounded-lg px-3 py-2 text-[11px]"
        style={{
          background: 'var(--dpal-surface)',
          border: '1px dashed var(--dpal-border)',
          color: 'var(--dpal-text-secondary)',
        }}
      >
        {record.legalDisclaimer}
      </div>
    </div>
  );
}

const FloodEvidencePacketView: React.FC<FloodEvidencePacketViewProps> = ({
  packet,
  onGenerate,
  onAnchor,
  generating = false,
  anchoring = false,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className="rounded-2xl p-5 border dpal-border-subtle"
        style={{ background: 'var(--dpal-card)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
          <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
            Evidence Packet
          </div>
        </div>

        {!packet ? (
          <div
            className="rounded-xl px-3 py-4 text-center"
            style={{ background: 'var(--dpal-surface-alt)' }}
          >
            <div className="text-xs dpal-text-muted">
              No evidence packet generated yet for this alert.
            </div>
            {onGenerate && (
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
              >
                <FileText className="w-3.5 h-3.5" />
                {generating ? 'Generating…' : 'Generate evidence packet'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="rounded-xl px-3 py-3"
              style={{ background: 'var(--dpal-surface-alt)' }}
            >
              <div className="text-[10px] dpal-text-muted uppercase tracking-wider">Summary</div>
              <div className="text-sm mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
                {packet.summary}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg px-3 py-2" style={{ background: 'var(--dpal-surface-alt)' }}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider dpal-text-muted">
                  <Hash className="w-3.5 h-3.5" /> Content hash (SHA-256)
                </div>
                <div className="font-mono text-[11px] break-all mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
                  {packet.contentHash}
                </div>
              </div>
              <div className="rounded-lg px-3 py-2" style={{ background: 'var(--dpal-surface-alt)' }}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider dpal-text-muted">
                  <Hash className="w-3.5 h-3.5" /> Anchoring hash (composite)
                </div>
                <div className="font-mono text-[11px] break-all mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
                  {packet.anchoringHash ?? '— not anchored yet —'}
                </div>
              </div>
              <div className="rounded-lg px-3 py-2" style={{ background: 'var(--dpal-surface-alt)' }}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider dpal-text-muted">
                  <Database className="w-3.5 h-3.5" /> Ledger record
                </div>
                <div className="font-mono text-[11px] break-all mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
                  {packet.ledgerRecordId}
                </div>
              </div>
              <div className="rounded-lg px-3 py-2" style={{ background: 'var(--dpal-surface-alt)' }}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider dpal-text-muted">
                  <QrCode className="w-3.5 h-3.5" /> QR payload
                </div>
                <div className="font-mono text-[11px] break-all mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
                  {packet.ledgerAnchor?.qrPayload ?? packet.qrDataPayload}
                </div>
              </div>
              <div className="rounded-lg px-3 py-2" style={{ background: 'var(--dpal-surface-alt)' }}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider dpal-text-muted">
                  <ShieldCheck className="w-3.5 h-3.5" /> Generated
                </div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
                  {new Date(packet.generatedAt).toLocaleString()} · by {packet.generatedBy}
                </div>
              </div>
            </div>

            <div
              className="rounded-lg px-3 py-2 text-[11px]"
              style={{
                background: 'var(--dpal-surface)',
                border: '1px dashed var(--dpal-border)',
                color: 'var(--dpal-text-secondary)',
              }}
            >
              {packet.legalDisclaimer}
            </div>

            <div className="flex flex-wrap gap-2">
              {onGenerate && (
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 border dpal-border-subtle"
                  style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {generating ? 'Regenerating…' : 'Regenerate'}
                </button>
              )}
              {onAnchor && (
                <button
                  type="button"
                  onClick={onAnchor}
                  disabled={anchoring}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                  style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
                >
                  <Database className="w-3.5 h-3.5" />
                  {anchoring
                    ? 'Anchoring…'
                    : packet.anchoringHash
                      ? 'Re-anchor on DPAL ledger'
                      : 'Anchor on DPAL ledger'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {packet?.ledgerAnchor && <LedgerBlock record={packet.ledgerAnchor} />}
    </div>
  );
};

export default FloodEvidencePacketView;
