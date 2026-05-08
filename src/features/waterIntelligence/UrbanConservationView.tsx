import React from 'react';
import { Link } from 'react-router-dom';
import WaterProjectCard from './components/WaterProjectCard';
import { COLORADO_MOCK_PROJECTS } from './services/coloradoRiverMockData';

export default function UrbanConservationView(): React.ReactElement {
  const rows = COLORADO_MOCK_PROJECTS.filter((p) => p.id === 'WI-CO-DEN-URB-002');
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
        Urban conservation (demo)
      </h1>
      <p className="text-[11px] dpal-text-secondary">Pilot / Demonstration Mode · municipal outdoor savings storyline.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((p) => (
          <WaterProjectCard key={p.id} project={p} />
        ))}
      </div>
      <Link to="/water-intelligence/colorado-river" className="text-[11px] font-semibold text-cyan-300 hover:underline inline-block">
        ← Colorado pilot dashboard
      </Link>
    </div>
  );
}
