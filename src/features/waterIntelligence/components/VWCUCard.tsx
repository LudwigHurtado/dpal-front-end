import React from 'react';
import type { VerifiedWaterConservationUnit } from '../services/waterIntelligenceTypes';
import { formatTransactionCategory } from '../services/waterIntelligenceLabels';

export default function VWCUCard({ u }: { u: VerifiedWaterConservationUnit }): React.ReactElement {
  return (
    <div
      className="rounded-xl p-3 border dpal-border-subtle text-[11px] space-y-1"
      style={{ background: 'var(--dpal-surface-alt)' }}
    >
      <div className="flex justify-between gap-2 flex-wrap">
        <span className="font-mono font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
          {u.id}
        </span>
        <span className="text-[10px] uppercase font-bold" style={{ color: '#fde68a' }}>
          Mock / Demo
        </span>
      </div>
      <div className="dpal-text-secondary">Project: {u.projectId}</div>
      <div className="dpal-text-secondary">Owner: {u.ownerLabel}</div>
      <div style={{ color: 'var(--dpal-text-primary)' }}>
        {u.acreFeet.toLocaleString()} acre-feet · {formatTransactionCategory(u.transactionCategory)}
      </div>
      <div className="dpal-text-muted">Evidence: {u.evidencePacketId}</div>
      <div className="dpal-text-muted font-mono text-[10px] break-all">Hash: {u.evidenceHash}</div>
      {u.humanVerified && <div className="text-emerald-300 font-semibold">Human-verified</div>}
      {u.blockchainAnchored && <div className="text-emerald-300 font-semibold">Blockchain-anchored</div>}
    </div>
  );
}
