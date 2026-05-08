import React from 'react';
import VWCUCard from './components/VWCUCard';
import { COLORADO_MOCK_VWCUS } from './services/coloradoRiverMockData';
import RouteBreadcrumbHeader from './components/RouteBreadcrumbHeader';

export default function VWCURegistryView(): React.ReactElement {
  return (
    <div className="space-y-4">
      <RouteBreadcrumbHeader title="VWCU registry" currentPageLabel="Registry" />
      <p className="text-[11px] dpal-text-secondary">
        Pilot / Demonstration Mode · Human-verified and blockchain-anchored columns appear only when true on the record.
      </p>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {COLORADO_MOCK_VWCUS.map((u) => (
          <VWCUCard key={u.id} u={u} />
        ))}
      </div>
    </div>
  );
}
