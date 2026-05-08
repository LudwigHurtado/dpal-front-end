import React from 'react';
import { Link } from 'react-router-dom';
import WaterRightsCard from './components/WaterRightsCard';
import { listWaterRightProfiles } from './services/waterRightsService';

export default function WaterRightsProtectionView(): React.ReactElement {
  const profiles = listWaterRightProfiles();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
        Water-rights protection (informational)
      </h1>
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
      <Link to="/water-intelligence/colorado-river" className="text-[11px] font-semibold text-cyan-300 hover:underline inline-block">
        ← Colorado pilot
      </Link>
    </div>
  );
}
