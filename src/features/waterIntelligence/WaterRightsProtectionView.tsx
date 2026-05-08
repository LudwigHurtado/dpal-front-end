import React from 'react';
import WaterRightsCard from './components/WaterRightsCard';
import { listWaterRightProfiles } from './services/waterRightsService';
import RouteBreadcrumbHeader from './components/RouteBreadcrumbHeader';

export default function WaterRightsProtectionView(): React.ReactElement {
  const profiles = listWaterRightProfiles();
  return (
    <div className="space-y-4">
      <RouteBreadcrumbHeader title="Water-rights protection" currentPageLabel="Water Rights" />
      <div className="rounded-xl p-4 border dpal-border-subtle text-[11px] leading-relaxed space-y-2" style={{ background: 'var(--dpal-card)' }}>
        <p className="dpal-text-secondary">
          DPAL does not transfer legal water rights by itself. DPAL documents conservation performance and evidence so
          holders can pursue compensation under appropriate agreements. Any lease, transfer, or compensated forbearance
          requires proper authority, contracts, and legal review.
        </p>
        <p className="dpal-text-secondary">
          The goal is to protect agriculture by helping water-right holders receive value for verified conservation rather
          than treating conservation solely as uncompensated curtailment.
        </p>
        <p className="dpal-text-muted">Pilot / Demonstration Mode · illustrative cards below.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {profiles.map((r) => (
          <WaterRightsCard key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
}
