import React from 'react';
import { Activity, Flame, Globe, Layout, Satellite, TreePine } from '../../../../components/icons';

export type ForestMapLayers = {
  satellite: boolean;
  labels: boolean;
  aoiCircle: boolean;
  deforestationAlerts: boolean;
  disturbanceAlerts: boolean;
  activeFires: boolean;
  canopyGedi: boolean;
  forestLossHansen: boolean;
};

type Props = {
  layers: ForestMapLayers;
  onChange: (next: ForestMapLayers) => void;
};

type RowKey = keyof ForestMapLayers;

const ROWS: { key: RowKey; label: string; hint: string; Icon: React.FC<{ className?: string }> }[] = [
  { key: 'deforestationAlerts', label: 'Deforestation Alerts (GFW)', hint: 'Legend / analysis context', Icon: TreePine },
  { key: 'disturbanceAlerts', label: 'Disturbance Alerts (GFW)', hint: 'Legend / analysis context', Icon: Activity },
  { key: 'activeFires', label: 'Active Fires (FIRMS)', hint: 'Legend / analysis context', Icon: Flame },
  { key: 'satellite', label: 'Satellite Imagery (Landsat)', hint: 'Controls base map tiles', Icon: Satellite },
  { key: 'canopyGedi', label: 'Canopy Height (GEDI)', hint: 'Legend / provider context', Icon: Layout },
  { key: 'forestLossHansen', label: 'Forest Loss (Hansen)', hint: 'Legend / provider context', Icon: Globe },
];

function Switch({
  on,
  onToggle,
  id,
}: {
  on: boolean;
  onToggle: () => void;
  id: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative h-6 w-10 shrink-0 rounded-full border transition-colors ${
        on ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-slate-200'
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

const ForestLayerControl: React.FC<Props> = ({ layers, onChange }) => {
  const toggle = (key: RowKey) => {
    onChange({ ...layers, [key]: !layers[key] });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Layer visibility</p>
      <p className="text-[10px] text-slate-400 mb-3 leading-snug">
        Map tiles follow Satellite / labels / AOI. Other toggles drive the on-map legend (no fabricated alert geometry).
      </p>
      <ul className="space-y-0">
        {ROWS.map(({ key, label, hint, Icon }) => (
          <li
            key={key}
            className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="h-4 w-4 shrink-0 text-emerald-700 opacity-90" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 leading-tight">{label}</p>
                <p className="text-[10px] text-slate-400 truncate">{hint}</p>
              </div>
            </div>
            <Switch id={`forest-layer-${key}`} on={layers[key]} onToggle={() => toggle(key)} />
          </li>
        ))}
      </ul>
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-medium text-slate-600">Place labels</span>
        </div>
        <Switch id="forest-layer-labels" on={layers.labels} onToggle={() => toggle('labels')} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-medium text-slate-600">AOI circle</span>
        </div>
        <Switch id="forest-layer-aoi" on={layers.aoiCircle} onToggle={() => toggle('aoiCircle')} />
      </div>
    </div>
  );
};

export default ForestLayerControl;
