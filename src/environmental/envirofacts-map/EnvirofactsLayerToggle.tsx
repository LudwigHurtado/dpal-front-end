import React from 'react';
import type { EnvirofactsLayer } from '../../types/envirofactsTypes';

type Props = {
  activeLayers: EnvirofactsLayer[];
  onToggle: (layer: EnvirofactsLayer) => void;
};

const layers: { key: EnvirofactsLayer; label: string }[] = [
  { key: 'Air', label: 'Air' },
  { key: 'Water', label: 'Water' },
  { key: 'Waste', label: 'Waste' },
  { key: 'Toxics', label: 'Toxics' },
  { key: 'Land', label: 'Land · Cleanup' },
  { key: 'Radiation', label: 'Radiation' },
  { key: 'Enforcement', label: 'Enforcement' },
  { key: 'Facilities', label: 'Facilities' },
  { key: 'GHG', label: 'GHG' },
];

const EnvirofactsLayerToggle: React.FC<Props> = ({ activeLayers, onToggle }) => (
  <div className="flex flex-wrap gap-2">
    {layers.map(({ key, label }) => {
      const active = activeLayers.includes(key);
      return (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
            active
              ? 'border-slate-400 bg-slate-800 text-slate-50'
              : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-300'
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export default EnvirofactsLayerToggle;
