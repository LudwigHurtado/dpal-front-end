import React from 'react';
import { Link, useParams } from 'react-router-dom';

export default function WaterSituationRoomPlaceholder(): React.ReactElement {
  const { projectId = '' } = useParams();
  return (
    <div className="rounded-2xl p-6 border dpal-border-subtle space-y-3 max-w-xl mx-auto" style={{ background: 'var(--dpal-card)' }}>
      <h1 className="text-lg font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
        Situation room (placeholder)
      </h1>
      <p className="text-[11px] dpal-text-secondary">
        Project reference: <span className="font-mono">{decodeURIComponent(projectId)}</span>
      </p>
      <p className="text-[11px] dpal-text-muted">
        Pilot / Demonstration Mode · Human review threads and agency coordination would connect here when authorized — no
        live Situation Room integration in this phase.
      </p>
      <Link to="/water-intelligence/evidence" className="text-[11px] font-semibold text-cyan-300 hover:underline inline-block">
        ← Evidence packets
      </Link>
    </div>
  );
}
