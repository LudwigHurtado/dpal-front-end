import React from 'react';
import { Link } from 'react-router-dom';
import VWCUCard from './components/VWCUCard';
import { COLORADO_MOCK_VWCUS } from './services/coloradoRiverMockData';

export default function VWCURegistryView(): React.ReactElement {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
        VWCU registry (pilot)
      </h1>
      <p className="text-[11px] dpal-text-secondary">
        Pilot / Demonstration Mode · Human-verified and blockchain-anchored columns appear only when true on the record.
      </p>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {COLORADO_MOCK_VWCUS.map((u) => (
          <VWCUCard key={u.id} u={u} />
        ))}
      </div>
      <Link to="/water-intelligence/colorado-river" className="text-[11px] font-semibold text-cyan-300 hover:underline inline-block">
        ← Colorado pilot
      </Link>
    </div>
  );
}
