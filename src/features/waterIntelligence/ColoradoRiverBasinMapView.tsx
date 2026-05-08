import React from 'react';
import { Link } from 'react-router-dom';
import BasinMapPlaceholder from './components/BasinMapPlaceholder';
import MapSourceGuidanceCard from './components/MapSourceGuidanceCard';

export default function ColoradoRiverBasinMapView(): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex justify-between flex-wrap gap-2">
        <h1 className="text-lg font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
          Colorado River basin map
        </h1>
        <Link to="/water-intelligence/colorado-river" className="text-[11px] font-semibold text-cyan-300 hover:underline">
          Colorado pilot →
        </Link>
      </div>
      <BasinMapPlaceholder />
      <MapSourceGuidanceCard variant="colorado" />
    </div>
  );
}
