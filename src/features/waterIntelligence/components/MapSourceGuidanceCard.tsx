import React from 'react';
import { Globe } from '../../../../components/icons';

export interface MapSourceGuidanceCardProps {
  /** When true, lists Colorado-specific planned layers; otherwise generic FloodGuard copy. */
  variant?: 'colorado' | 'city';
  className?: string;
}

const COLORADO_LAYERS = [
  'USGS stream gauges',
  'Bureau of Reclamation reservoir data',
  'NOAA Colorado Basin forecasts',
  'OpenET evapotranspiration data',
  'NASA / DPAL satellite water and vegetation indices',
  'Field reports',
  'Water-right and conservation documents',
];

/**
 * Map Source Guidance — reminds operators that every layer needs provenance and confidence labeling.
 */
const MapSourceGuidanceCard: React.FC<MapSourceGuidanceCardProps> = ({
  variant = 'city',
  className = '',
}) => (
  <div
    className={`rounded-2xl p-4 border dpal-border-subtle space-y-2 ${className}`}
    style={{ background: 'var(--dpal-card)' }}
  >
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
      <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
        Map Source Guidance
      </span>
    </div>
    <p className="text-xs dpal-text-secondary leading-relaxed">
      {variant === 'colorado' ? (
        <>
          DPAL Water Intelligence maps can be built from river-basin boundaries, reservoir datasets, stream gauges, open
          geospatial layers, satellite imagery, hydrology sources, irrigation district data, field reports,
          water-right/conservation documents, and DPAL-generated risk/conservation zones. Each layer should be labeled
          by source and confidence.
        </>
      ) : (
        <>
          FloodGuard and Water Intelligence maps can be built from city-provided zones, river-basin boundaries,
          reservoir datasets, stream gauges, open geospatial layers, satellite imagery, drainage/hydrology sources,
          and DPAL-generated risk zones. Each layer should be labeled by source and confidence.
        </>
      )}
    </p>
    {variant === 'colorado' && (
      <div className="rounded-xl px-3 py-2 space-y-1" style={{ background: 'var(--dpal-surface-alt)' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider dpal-text-muted">
          Colorado River pilot — planned / demo layers
        </div>
        <ul className="text-[11px] dpal-text-secondary list-disc pl-4 space-y-0.5">
          {COLORADO_LAYERS.map((layer) => (
            <li key={layer}>{layer}</li>
          ))}
        </ul>
        <p className="text-[10px] dpal-text-muted mt-1">
          Shown as planned or demo until live adapters are connected — do not present as operational government
          feeds.
        </p>
      </div>
    )}
  </div>
);

export default MapSourceGuidanceCard;
