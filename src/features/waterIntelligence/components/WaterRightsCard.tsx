import React from 'react';
import type { WaterRightProfile } from '../services/waterIntelligenceTypes';

export default function WaterRightsCard({ r }: { r: WaterRightProfile }): React.ReactElement {
  return (
    <div className="rounded-xl p-4 border dpal-border-subtle space-y-2" style={{ background: 'var(--dpal-card)' }}>
      <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">Water-right profile (demo)</div>
      <h3 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
        {r.holderLabel}
      </h3>
      <dl className="text-[11px] space-y-1 dpal-text-secondary">
        <div>
          <dt className="font-semibold dpal-text-muted inline">Entitlement reference:</dt> {r.entitlementReference}
        </div>
        <div>
          <dt className="font-semibold dpal-text-muted inline">Conservation agreement:</dt> {r.conservationAgreementStatus}
        </div>
        <div>
          <dt className="font-semibold dpal-text-muted inline">Lease eligibility:</dt> {r.leaseEligibility}
        </div>
        <div>
          <dt className="font-semibold dpal-text-muted inline">Authority review needed:</dt>{' '}
          {r.authorityReviewNeeded ? 'Yes' : 'No'}
        </div>
        <div>
          <dt className="font-semibold dpal-text-muted inline">Legal review needed:</dt> {r.legalReviewNeeded ? 'Yes' : 'No'}
        </div>
        <div>
          <dt className="font-semibold dpal-text-muted inline">Compensation status:</dt> {r.compensationStatus}
        </div>
        <div className="pt-2 border-t dpal-border-subtle text-[11px] leading-relaxed">{r.riskNotes}</div>
      </dl>
    </div>
  );
}
