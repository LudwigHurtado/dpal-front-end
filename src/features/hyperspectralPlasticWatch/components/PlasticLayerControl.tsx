import React from 'react';
import { Activity, Droplets, Layout, MapPin, Satellite, Sparkles, Waves } from '../../../../components/icons';
import type { PlasticMapLayers } from '../types';

type Props = {
  layers: PlasticMapLayers;
  onChange: (next: PlasticMapLayers) => void;
};

type RowKey = keyof PlasticMapLayers;

const ROWS: { key: RowKey; label: string; hint: string; Icon: React.FC<{ className?: string }> }[] = [
  { key: 'paceOceanColor', label: 'PACE ocean color', hint: 'Legend / provider context', Icon: Waves },
  { key: 'emitHyperspectral', label: 'EMIT hyperspectral scene', hint: 'Legend / provider context', Icon: Sparkles },
  { key: 'plasticRiskAnomaly', label: 'Plastic-risk anomaly', hint: 'Possible spectral anomaly (not proof)', Icon: Activity },
  { key: 'turbiditySediment', label: 'Turbidity / sediment', hint: 'Confounder context', Icon: Droplets },
  { key: 'chlorophyllAlgae', label: 'Chlorophyll / algae', hint: 'Confounder context', Icon: Activity },
  { key: 'floatingDebrisCandidate', label: 'Floating debris candidate', hint: 'Visual screening context only', Icon: MapPin },
  { key: 'fieldValidationPoints', label: 'Field validation points', hint: 'Planned sampling / QA locations', Icon: Layout },
  { key: 'cleanupMissionPins', label: 'Cleanup mission pins', hint: 'Legend only — no live mission layer yet', Icon: MapPin },
  { key: 'droneValidationPoints', label: 'Drone validation connector', hint: 'Manual / API / flight-plan hook (prepare-only)', Icon: Satellite },
  { key: 'satellite', label: 'Satellite base map', hint: 'Controls base map tiles', Icon: Satellite },
];

function Switch({ on, onToggle, id }: { on: boolean; onToggle: () => void; id: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative h-6 w-10 shrink-0 rounded-full border transition-colors ${
        on ? 'border-emerald-700 bg-emerald-700' : 'border-slate-300 bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const PlasticLayerControl: React.FC<Props> = ({ layers, onChange }) => {
  const toggle = (key: RowKey) => {
    onChange({ ...layers, [key]: !layers[key] });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Layer visibility</p>
      <p className="text-[10px] text-slate-400 mb-3 leading-snug">
        Toggles inform the on-map legend. DPAL does not draw proprietary PACE/EMIT tiles until adapters are live.
      </p>
      <ul className="space-y-0">
        {ROWS.map(({ key, label, hint, Icon }) => (
          <li
            key={key}
            className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="h-4 w-4 shrink-0 text-emerald-800 opacity-90" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 leading-tight">{label}</p>
                <p className="text-[10px] text-slate-400 truncate">{hint}</p>
              </div>
            </div>
            <Switch id={`plastic-layer-${key}`} on={layers[key]} onToggle={() => toggle(key)} />
          </li>
        ))}
      </ul>
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-[10px] font-medium text-slate-600">Place labels</span>
        <Switch id="plastic-layer-labels" on={layers.labels} onToggle={() => toggle('labels')} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-[10px] font-medium text-slate-600">AOI circle</span>
        <Switch id="plastic-layer-aoi" on={layers.aoiCircle} onToggle={() => toggle('aoiCircle')} />
      </div>
    </div>
  );
};

export default PlasticLayerControl;
