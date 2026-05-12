import React from 'react';
import type { ForestEvidencePacketResponse, ForestIntegrityScanResponse } from '../types';

type Props = {
  scan: ForestIntegrityScanResponse | null;
  evidence: ForestEvidencePacketResponse | null;
};

const ForestEvidencePacketPanel: React.FC<Props> = ({ scan, evidence }) => {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/85 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/90">Evidence packet</p>
        {evidence?.integrityHash ? (
          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]" title={evidence.integrityHash}>
            SHA-256: {evidence.integrityHash.slice(0, 16)}…
          </span>
        ) : null}
      </div>

      {!scan ? (
        <p className="text-sm text-slate-500">Run a scan to populate the evidence packet.</p>
      ) : (
        <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
          <li>
            AOI: {scan.label} — {scan.aoi.lat.toFixed(5)}, {scan.aoi.lng.toFixed(5)} (r {scan.aoi.radiusKm} km)
          </li>
          <li>
            Window: {new Date(scan.aoi.baselineDate).toLocaleDateString()} → {new Date(scan.aoi.currentDate).toLocaleDateString()}
          </li>
          <li>Scan id: {scan.scanId}</li>
          <li>NDVI / NDMI / NBR: {[scan.indices.ndvi, scan.indices.ndmi, scan.indices.nbr].map((v) => v ?? 'n/a').join(', ')}</li>
          <li>FIRMS lane: {scan.providers.firms.message}</li>
          <li>GFW lane: {scan.providers.gfw.message}</li>
          <li>GEDI lane: {scan.providers.gedi.message}</li>
          <li>Score: {scan.forestIntegrityScore ?? 'n/a'} ({scan.riskLevel})</li>
        </ul>
      )}

      {evidence?.qrPayloadPreview ? (
        <div className="rounded-lg border border-slate-600/80 bg-black/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">QR / hash-ready preview</p>
          <pre className="text-[10px] leading-relaxed text-emerald-100/90 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(evidence.qrPayloadPreview, null, 2)}
          </pre>
        </div>
      ) : null}

      {scan?.limitations?.length ? (
        <div>
          <p className="text-[10px] font-bold uppercase text-amber-200/90 mb-1">Limitations</p>
          <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4">
            {scan.limitations.slice(0, 8).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default ForestEvidencePacketPanel;
