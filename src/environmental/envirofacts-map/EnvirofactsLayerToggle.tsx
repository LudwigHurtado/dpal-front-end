import React from 'react';
import type { EnvirofactsLayer } from '../../types/envirofactsTypes';

type Props = {
  activeLayers: EnvirofactsLayer[];
  onToggle: (layer: EnvirofactsLayer) => void;
};

const layers: EnvirofactsLayer[] = ['Air', 'Water', 'Waste', 'Toxics', 'Land', 'Radiation', 'Enforcement', 'Facilities'];

const EnvirofactsLayerToggle: React.FC<Props> = ({ activeLayers, onToggle }) => (
  <div className="flex flex-wrap gap-2">
    {layers.map((layer) => {
      const active = activeLayers.includes(layer);
      return (
        <button
          key={layer}
          type="button"
          onClick={() => onToggle(layer)}
          className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
            active ? 'border-cyan-500/70 bg-cyan-900/35 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300'
          }`}
        >
          {layer}
        </button>
      );
    })}
  </div>
);

export default EnvirofactsLayerToggle;
