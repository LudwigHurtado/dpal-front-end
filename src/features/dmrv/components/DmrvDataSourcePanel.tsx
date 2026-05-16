import React from 'react';
import { dataLayerProof } from '../dmrvRegistry';

export type DmrvDataSourcePanelProps = {
  layers: string[];
  selectedLayers: string[];
  onToggleLayer: (layer: string) => void;
  accentColor: string;
};

export function DmrvDataSourcePanel({
  layers,
  selectedLayers,
  onToggleLayer,
  accentColor,
}: DmrvDataSourcePanelProps): React.ReactElement {
  const active = selectedLayers[selectedLayers.length - 1];
  const proof = active ? dataLayerProof(active) : null;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Data sources</p>
        <h3 className="text-sm font-black uppercase tracking-wide text-[#1e3a5f]">Inputs &amp; layers</h3>
        <p className="mt-1 text-[11px] text-slate-600">Select layers required for the active DMRV type.</p>
      </div>

      <ul className="max-h-[320px] flex-1 space-y-1 overflow-y-auto p-2 [scrollbar-width:thin]">
        {layers.map((layer) => {
          const selected = selectedLayers.includes(layer);
          return (
            <li key={layer}>
              <button
                type="button"
                onClick={() => onToggleLayer(layer)}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition ${
                  selected
                    ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900/15'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-black text-white"
                  style={{ backgroundColor: selected ? accentColor : '#94a3b8' }}
                  aria-hidden
                >
                  ◆
                </span>
                <span className="min-w-0 flex-1 leading-snug">{layer}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {proof ? (
        <div className="border-t border-slate-200 bg-[#f7f9fc] p-3 text-[11px]">
          <p className="font-black uppercase tracking-wide text-slate-500">Selected layer</p>
          <p className="mt-1 font-bold text-slate-900">{active}</p>
          <p className="mt-2 text-slate-700">
            <span className="font-semibold">Proves:</span> {proof.proves}
          </p>
          <p className="mt-1 text-slate-700">
            <span className="font-semibold">DMRV role:</span> {proof.supports}
          </p>
          <p className="mt-2">
            <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
              {proof.kind}
            </span>
          </p>
        </div>
      ) : (
        <p className="border-t border-slate-200 p-3 text-[11px] text-slate-500">Select a data layer to see what it proves.</p>
      )}
    </div>
  );
}
