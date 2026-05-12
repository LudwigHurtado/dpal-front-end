import React from 'react';
import type { HyperspectralPlasticScanResponse } from '../types';

type Props = {
  scan: HyperspectralPlasticScanResponse | null;
};

const SpectralSignaturePanel: React.FC<Props> = ({ scan }) => {
  const c = scan?.spectralSignals.waterConfounders;
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-indigo-950">Spectral signature context</h3>
      <p className="mt-1 text-[11px] text-slate-600 leading-snug">
        EMIT VNIR/SWIR and PACE ocean-color paths are reserved for narrow-band plastic-risk screening. Without those products,
        DPAL surfaces Landsat-derived context only — not plastic-specific absorption.
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
          <p className="font-semibold text-slate-800">Reference bands (plastic-risk review)</p>
          <ul className="mt-2 space-y-1 text-slate-600 list-disc pl-4">
            <li>SWIR features (e.g. near 1.73 µm, 2.31 µm) — requires EMIT or comparable hyperspectral coverage.</li>
            <li>Visible / NIR brightness and texture — confounded by foam, sediment, sun glint.</li>
            <li>PACE OCI — ocean color and chlorophyll retrievals for water-column confounders.</li>
          </ul>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
          <p className="font-semibold text-slate-800">Water quality confounders (this run)</p>
          {!c ? (
            <p className="text-slate-500 mt-2">Awaiting scan.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-slate-700">
              <li>Algae / chlorophyll proxy: {c.algae}</li>
              <li>Turbidity: {c.turbidity}</li>
              <li>Sediment: {c.sediment}</li>
              <li>Foam: {c.foam}</li>
              <li>Clouds / glint: {c.cloudsGlint}</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpectralSignaturePanel;
