import React from 'react';
import WaterProjectCard from './components/WaterProjectCard';
import { COLORADO_MOCK_PROJECTS } from './services/coloradoRiverMockData';
import RouteBreadcrumbHeader from './components/RouteBreadcrumbHeader';

export default function AgricultureConservationView(): React.ReactElement {
  const rows = COLORADO_MOCK_PROJECTS.filter(
    (p) => p.id === 'WI-CO-GV-AG-001' || p.id === 'WI-CO-CBT-LEASE-003',
  );
  return (
    <div className="space-y-4">
      <RouteBreadcrumbHeader title="Agricultural conservation" currentPageLabel="Agriculture Conservation" />
      <p className="text-[11px] dpal-text-secondary">Pilot / Demonstration Mode · Mock projects only.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((p) => (
          <WaterProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}
