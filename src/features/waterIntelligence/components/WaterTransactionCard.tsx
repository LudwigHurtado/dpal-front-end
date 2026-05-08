import React from 'react';
import type { WaterTransaction } from '../services/waterIntelligenceTypes';
import { formatTransactionCategory } from '../services/waterIntelligenceLabels';

export default function WaterTransactionCard({ t }: { t: WaterTransaction }): React.ReactElement {
  return (
    <div className="rounded-xl p-4 border dpal-border-subtle space-y-2" style={{ background: 'var(--dpal-card)' }}>
      <div className="flex justify-between flex-wrap gap-2">
        <span className="text-sm font-bold font-mono" style={{ color: 'var(--dpal-text-primary)' }}>
          {t.id}
        </span>
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a' }}>
          {formatTransactionCategory(t.category)}
        </span>
      </div>
      <div className="text-[11px] grid gap-1 dpal-text-secondary">
        <div>
          <span className="font-semibold">Seller:</span> {t.seller}
        </div>
        <div>
          <span className="font-semibold">Buyer:</span> {t.buyer}
        </div>
        <div>
          <span className="font-semibold">Units / AF:</span> {t.units.toLocaleString()} VWCUs · {t.acreFeet.toLocaleString()} AF
        </div>
        <div>
          <span className="font-semibold">Price / total:</span> Demo only — ${t.pricePerAF}/AF · ${t.totalValue} (not a real payment)
        </div>
        <div>
          <span className="font-semibold">Authority:</span> {t.authorityApprovalStatus}
        </div>
        <div>
          <span className="font-semibold">Escrow:</span> {t.escrowStatus}
        </div>
        <div>
          <span className="font-semibold">Transfer:</span> {t.transferStatus}
        </div>
        <div>
          <span className="font-semibold">Ledger:</span> {t.ledgerStatus}
        </div>
        <div>
          <span className="font-semibold">Public record:</span> {t.publicRecordStatus}
        </div>
      </div>
    </div>
  );
}
