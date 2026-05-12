import React from 'react';
import { FileText } from '../../../../components/icons';
import type { HyperspectralPlasticScanResponse, PlasticEvidencePacketResponse } from '../types';

type Props = {
  scan: HyperspectralPlasticScanResponse | null;
  evidence: PlasticEvidencePacketResponse | null;
};

type TabId = 'packet' | 'readiness' | 'providers' | 'limitations' | 'signals';

function cell(label: string, value: string) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2 last:border-0">
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-xs text-slate-800 break-words">{value}</span>
    </div>
  );
}

const PlasticEvidencePacketPanel: React.FC<Props> = ({ scan, evidence }) => {
  const [tab, setTab] = React.useState<TabId>('packet');

  const exportJson = () => {
    if (!scan) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            scan,
            evidencePacket: evidence ?? null,
            exportedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hyperspectral-plastic-watch-${scan.scanId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'packet', label: 'Evidence packet' },
    { id: 'readiness', label: 'Readiness & next actions' },
    { id: 'providers', label: 'Providers' },
    { id: 'limitations', label: 'Limitations' },
    { id: 'signals', label: 'Spectral signals' },
  ];

  const claimsNarrative = !scan
    ? ''
    : scan.evidencePacket.claimsLevel === 'narrow_band_metadata'
      ? 'Narrow-band product metadata was retrieved from NASA CMR. Plastic-risk scoring may be computed only after index extraction and validation logic completes against real products. This packet cannot claim confirmed plastic detection.'
      : 'Narrow-band spectral confirmation is not available yet. This packet is metadata-only and cannot claim confirmed plastic detection.';

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 bg-slate-50/80">
        <FileText className="h-4 w-4 text-indigo-700 shrink-0" />
        <span className="text-sm font-semibold text-slate-800">Evidence packet preview</span>
        {evidence?.integrityHash ? (
          <span className="text-[10px] font-mono text-slate-500 truncate ml-auto max-w-[40%]" title={evidence.integrityHash}>
            SHA-256 {evidence.integrityHash.slice(0, 12)}…
          </span>
        ) : null}
        <button
          type="button"
          disabled={!scan}
          onClick={exportJson}
          className="ml-auto rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          Export JSON
        </button>
      </div>

      <div className="flex flex-wrap gap-1 px-2 pt-2 border-b border-slate-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-indigo-800 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3 md:p-4">
        {tab === 'packet' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <p className="text-[11px] font-semibold text-slate-700 mb-2">Summary</p>
              {!scan ? (
                <p className="text-sm text-slate-500">Run a scan or Watch DPAL Work to populate the packet.</p>
              ) : (
                <>
                  {cell('AOI label', scan.label)}
                  {cell('Location', `${scan.aoi.lat.toFixed(5)}, ${scan.aoi.lng.toFixed(5)}`)}
                  {cell('Radius / AOI', `${scan.aoi.radiusKm} km`)}
                  {cell('Date window', `${scan.aoi.baselineDate.slice(0, 10)} → ${scan.aoi.currentDate.slice(0, 10)}`)}
                  {cell('Environment', scan.aoi.environmentType.replace(/_/g, ' '))}
                  {cell('Evidence packet status', scan.evidencePacket.status)}
                  {cell('Claims level', scan.evidencePacket.claimsLevel.replace(/_/g, ' '))}
                  {cell('Plastic-risk score', scan.plasticRisk.score == null ? 'Not computed' : String(scan.plasticRisk.score))}
                  {cell('Plastic-risk status', scan.plasticRisk.status.replace(/_/g, ' '))}
                  {cell('Confidence (model)', `${Math.round(scan.spectralSignals.confidence * 100)}% (bounded; not a detection probability)`)}
                  {cell('Plastic-risk signal label', scan.spectralSignals.plasticRiskSignal.replace(/_/g, ' '))}
                  {cell('Field validation', 'Required before escalation or enforcement use')}
                  {cell('Drone connector', `${scan.providers.drone.status} · ${scan.providers.drone.mode}`)}
                </>
              )}
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <p className="text-[11px] font-semibold text-slate-700 mb-2">Claims language</p>
              {!scan ? (
                <p className="text-sm text-slate-500">No scan loaded.</p>
              ) : (
                <p className="text-xs text-slate-700 leading-snug">{claimsNarrative}</p>
              )}
              <p className="text-[11px] font-semibold text-slate-700 mt-4 mb-2">QR / hash-ready preview</p>
              {!evidence ? (
                <p className="text-sm text-slate-500">Generated after Watch completes the evidence packet step.</p>
              ) : (
                <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                  {JSON.stringify(evidence.qrPayloadPreview, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {tab === 'readiness' && (
          <div className="space-y-3 text-left text-xs text-slate-700">
            {!scan ? (
              <p className="text-slate-500">No scan loaded.</p>
            ) : (
              <>
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                  <p className="font-semibold text-indigo-950 mb-2">Provider readiness (this run)</p>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-indigo-100">
                        <th className="py-1 pr-2">Provider</th>
                        <th className="py-1 pr-2">Status</th>
                        <th className="py-1">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-indigo-50 align-top">
                        <td className="py-1.5 pr-2 font-semibold">PACE</td>
                        <td className="py-1.5 pr-2 font-mono">{scan.providers.pace.status}</td>
                        <td className="py-1.5 text-slate-600">{scan.providers.pace.message}</td>
                      </tr>
                      <tr className="border-b border-indigo-50 align-top">
                        <td className="py-1.5 pr-2 font-semibold">EMIT</td>
                        <td className="py-1.5 pr-2 font-mono">{scan.providers.emit.status}</td>
                        <td className="py-1.5 text-slate-600">{scan.providers.emit.message}</td>
                      </tr>
                      <tr className="border-b border-indigo-50 align-top">
                        <td className="py-1.5 pr-2 font-semibold">Sentinel/Landsat</td>
                        <td className="py-1.5 pr-2 font-mono">{scan.providers.sentinelLandsatFallback.status}</td>
                        <td className="py-1.5 text-slate-600">{scan.providers.sentinelLandsatFallback.message}</td>
                      </tr>
                      <tr className="align-top">
                        <td className="py-1.5 pr-2 font-semibold">Drone</td>
                        <td className="py-1.5 pr-2 font-mono">{scan.providers.drone.status}</td>
                        <td className="py-1.5 text-slate-600">{scan.providers.drone.message}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 mb-1">Next actions</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {(scan.evidencePacket.nextActions ?? []).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'providers' && (
          <div className="space-y-3 text-left text-xs text-slate-700">
            {!scan ? (
              <p className="text-slate-500">No scan loaded.</p>
            ) : (
              <>
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="font-semibold text-indigo-900">PACE</p>
                  <p className="mt-1 font-mono text-[11px]">{scan.providers.pace.status}</p>
                  <p className="mt-1 text-slate-600">{scan.providers.pace.message}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    CMR scenes (metadata): {scan.providers.pace.scenes?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="font-semibold text-indigo-900">EMIT</p>
                  <p className="mt-1 font-mono text-[11px]">{scan.providers.emit.status}</p>
                  <p className="mt-1 text-slate-600">{scan.providers.emit.message}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    CMR scenes (metadata): {scan.providers.emit.scenes?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="font-semibold text-indigo-900">Sentinel / Landsat fallback</p>
                  <p className="mt-1 font-mono text-[11px]">{scan.providers.sentinelLandsatFallback.status}</p>
                  <p className="mt-1 text-slate-600">{scan.providers.sentinelLandsatFallback.message}</p>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'limitations' && (
          <ul className="list-disc pl-5 space-y-2 text-xs text-slate-700">
            {!scan?.limitations?.length ? (
              <li className="text-slate-500">No scan limitations yet.</li>
            ) : (
              scan.limitations.map((line, i) => (
                <li key={i} className="leading-snug">
                  {line}
                </li>
              ))
            )}
            {scan?.evidencePacket?.limitations?.map((line, i) => (
              <li key={`e-${i}`} className="leading-snug text-amber-950">
                {line}
              </li>
            ))}
            <li className="text-amber-900">
              DPAL Hyperspectral Plastic Watch provides evidence-support signals only. Satellite spectral anomalies are not
              final proof of plastic pollution.
            </li>
          </ul>
        )}

        {tab === 'signals' && (
          <div className="text-xs text-slate-700 space-y-2">
            {!scan ? (
              <p className="text-slate-500">No spectral summary yet.</p>
            ) : (
              <>
                <p>
                  <span className="font-semibold">Plastic-risk signal label:</span>{' '}
                  {scan.spectralSignals.plasticRiskSignal.replace(/_/g, ' ')}
                </p>
                <p className="text-slate-600">{scan.spectralSignals.notes.join(' ')}</p>
                <p className="font-mono text-[11px]">
                  SWIR anomaly: {scan.spectralSignals.swirAnomaly == null ? 'n/a (indices not extracted)' : scan.spectralSignals.swirAnomaly}
                  {' · '}
                  Visible proxy: {scan.spectralSignals.visibleAnomaly == null ? 'n/a' : scan.spectralSignals.visibleAnomaly.toFixed(3)}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlasticEvidencePacketPanel;
