import React, { useState } from 'react';
import { Eye, ShieldCheck } from '../../../../components/icons';
import type {
  FloodAlert,
  FloodCity,
  FloodPublicMarker,
  FloodRiskScore,
  FloodZone,
} from '../floodGuardTypes';
import CityFloodMapView from './CityFloodMapView';

interface PublicFloodMapViewProps {
  city: FloodCity;
  zones: FloodZone[];
  alerts: FloodAlert[];
  scoresByZone: Record<string, FloodRiskScore>;
  publicMarkers: FloodPublicMarker[];
  className?: string;
}

const FILTERS: Array<{ id: string; label: string; kinds: FloodPublicMarker['kind'][] }> = [
  { id: 'all', label: 'All public guidance', kinds: ['safe_route', 'danger_zone', 'blocked_road', 'shelter', 'help_point', 'citizen_report'] },
  { id: 'safe', label: 'Safe routes & shelters', kinds: ['safe_route', 'shelter', 'help_point'] },
  { id: 'danger', label: 'Danger & blocked roads', kinds: ['danger_zone', 'blocked_road'] },
  { id: 'citizens', label: 'Citizen reports', kinds: ['citizen_report'] },
];

const PublicFloodMapView: React.FC<PublicFloodMapViewProps> = ({
  city,
  zones,
  alerts,
  scoresByZone,
  publicMarkers,
  className = '',
}) => {
  const [filterId, setFilterId] = useState('all');
  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];
  const filteredMarkers = publicMarkers.filter((marker) => filter.kinds.includes(marker.kind));

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className="rounded-2xl p-3 border dpal-border-subtle flex flex-wrap gap-2"
        style={{ background: 'var(--dpal-card)' }}
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider dpal-text-muted">
          <Eye className="w-3.5 h-3.5" /> Public View
        </div>
        {FILTERS.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => setFilterId(option.id)}
            className="text-[11px] font-semibold rounded-md px-2.5 py-1 transition"
            style={{
              background: filterId === option.id ? 'rgba(34,211,238,0.18)' : 'var(--dpal-surface-alt)',
              color: filterId === option.id ? '#22d3ee' : 'var(--dpal-text-secondary)',
              border: `1px solid ${filterId === option.id ? 'rgba(34,211,238,0.4)' : 'var(--dpal-border)'}`,
            }}
          >
            {option.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] dpal-text-muted">
          {filteredMarkers.length} marker(s)
        </span>
      </div>

      <CityFloodMapView
        city={city}
        zones={zones}
        alerts={alerts}
        scoresByZone={scoresByZone}
        publicMarkers={filteredMarkers}
        showPublicMarkers
        height={520}
      />

      <div
        className="rounded-2xl p-3 border dpal-border-subtle text-[11px] flex items-start gap-2"
        style={{ background: 'var(--dpal-card)', color: 'var(--dpal-text-secondary)' }}
      >
        <ShieldCheck className="w-3.5 h-3.5 mt-0.5" />
        <span>
          DPAL FloodGuard public guidance is community intelligence, not a replacement for official emergency
          alerts. Always follow guidance from local authorities, civil defense, and weather services.
        </span>
      </div>
    </div>
  );
};

export default PublicFloodMapView;
