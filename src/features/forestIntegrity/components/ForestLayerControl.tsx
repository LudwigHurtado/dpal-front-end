import React from 'react';

export type ForestMapLayers = {
  satellite: boolean;
  labels: boolean;
  aoiCircle: boolean;
};

type Props = {
  layers: ForestMapLayers;
  onChange: (next: ForestMapLayers) => void;
};

const ForestLayerControl: React.FC<Props> = ({ layers, onChange }) => {
  const toggle = (key: keyof ForestMapLayers) => {
    onChange({ ...layers, [key]: !layers[key] });
  };

  return (
    <div className="rounded-xl border border-emerald-900/50 bg-slate-950/80 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/90 mb-3">Map layers</p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['satellite', 'Satellite base'],
            ['labels', 'Place labels'],
            ['aoiCircle', 'AOI circle'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              layers[key]
                ? 'border-emerald-500/70 bg-emerald-950/50 text-emerald-100'
                : 'border-slate-600/80 bg-black/30 text-slate-400 hover:border-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ForestLayerControl;
