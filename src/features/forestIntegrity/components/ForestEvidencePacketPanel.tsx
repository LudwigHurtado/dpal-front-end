import React, { useMemo, useState } from 'react';
import { FileText } from '../../../../components/icons';
import type { ForestEvidencePacketResponse, ForestIntegrityScanResponse } from '../types';

type Props = {
  scan: ForestIntegrityScanResponse | null;
  evidence: ForestEvidencePacketResponse | null;
};

type TabId = 'packet' | 'providers' | 'limitations' | 'alerts';

function cell(label: string, value: string) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2 last:border-0">
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-xs text-slate-800 break-words">{value}</span>
    </div>
  );
}

function formatIso(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const ForestEvidencePacketPanel: React.FC<Props> = ({ scan, evidence }) => {
  const [tab, setTab] = useState<TabId>('packet');

  const alertsRows = useMemo(() => {
    if (!scan) return [] as { label: string; value: string }[];
    const g = scan.providers.gfw;
    return [
      { label: 'GFW lane status', value: g.status },
      { label: 'Integrated deforestation alerts', value: typeof g.integratedAlerts === 'number' ? String(g.integratedAlerts) : 'N/A' },
      { label: 'Disturbance alerts', value: typeof g.disturbanceAlerts === 'number' ? String(g.disturbanceAlerts) : 'N/A' },
      { label: 'Combined alerts (scoring)', value: typeof g.alerts === 'number' ? String(g.alerts) : 'N/A' },
      { label: 'FIRMS rows (proxy)', value: typeof scan.providers.firms.activeFires === 'number' ? String(scan.providers.firms.activeFires) : 'N/A' },
      { label: 'GFW message', value: g.message },
    ];
  }, [scan]);

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
    a.download = `forest-integrity-${scan.scanId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'packet', label: 'Evidence Packet' },
    { id: 'providers', label: 'Provider Details' },
    { id: 'limitations', label: 'Limitations' },
    { id: 'alerts', label: 'Alerts List' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 bg-slate-50/80">
        <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
        <span className="text-sm font-semibold text-slate-800">Evidence and datasets</span>
        {evidence?.integrityHash ? (
          <span className="text-[10px] font-mono text-slate-500 truncate ml-auto max-w-[40%]" title={evidence.integrityHash}>
            SHA-256 {evidence.integrityHash.slice(0, 12)}…
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1 px-2 pt-2 border-b border-slate-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3 md:p-4">
        {tab === 'packet' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <p className="text-[11px] font-semibold text-slate-700 mb-2">Key metrics</p>
              {!scan ? (
                <p className="text-sm text-slate-500">Awaiting scan.</p>
              ) : (
                <>
                  {cell('GFW Integrated Alerts', typeof scan.providers.gfw.integratedAlerts === 'number' ? String(scan.providers.gfw.integratedAlerts) : 'N/A')}
                  {cell('GFW Disturbance Alerts', typeof scan.providers.gfw.disturbanceAlerts === 'number' ? String(scan.providers.gfw.disturbanceAlerts) : 'N/A')}
                  {cell('FIRMS Active Fires', typeof scan.providers.firms.activeFires === 'number' ? String(scan.providers.firms.activeFires) : 'N/A')}
                  {cell('Forest loss (Hansen / GFW)', typeof scan.providers.gfw.alerts === 'number' ? `${scan.providers.gfw.alerts} (combined GFW count)` : 'N/A')}
                  {cell('Canopy height (GEDI)', scan.providers.gedi.biomassEstimateMgPerHa != null ? String(scan.providers.gedi.biomassEstimateMgPerHa) : 'Not configured')}
                  {cell('Carbon impact (model)', scan.forestIntegrityScore != null ? `${scan.forestIntegrityScore} / 100` : 'Insufficient data')}
                </>
              )}
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <p className="text-[11px] font-semibold text-slate-700 mb-2">Dataset versions</p>
              {!scan ? (
                <p className="text-sm text-slate-500">Awaiting scan.</p>
              ) : (
                <>
                  {cell(
                    'GFW Integrated Alerts',
                    scan.providers.gfw.datasetVersionsUsed?.[0] ??
                      (scan.providers.gfw.status === 'not_configured' ? 'Not configured' : 'Not returned'),
                  )}
                  {cell(
                    'GFW Disturbance Alerts',
                    scan.providers.gfw.datasetVersionsUsed?.[1] ??
                      (scan.providers.gfw.status === 'not_configured' ? 'Not configured' : 'Not returned'),
                  )}
                  {cell('FIRMS / VIIRS', 'VIIRS_SNPP_NRT (NASA FIRMS area CSV)')}
                  {cell(
                    'Hansen Global Forest Change',
                    scan.providers.gfw.datasetVersionsUsed?.find((x) => /hansen|umd|loss|treecover/i.test(x)) ??
                      'Not listed separately in datasetVersionsUsed',
                  )}
                  {cell('GEDI biomass / canopy', 'Not implemented on API route')}
                  {cell('Landsat collection', 'Collection 2 Level-2 (Planetary Computer when EO live)')}
                </>
              )}
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <p className="text-[11px] font-semibold text-slate-700 mb-2">Scan information</p>
              {!scan ? (
                <p className="text-sm text-slate-500">Awaiting scan.</p>
              ) : (
                <>
                  {cell('Scan ID', scan.scanId)}
                  {cell('AOI radius', `${scan.aoi.radiusKm} km`)}
                  {cell('Center coordinates', `${scan.aoi.lat.toFixed(5)}, ${scan.aoi.lng.toFixed(5)}`)}
                  {cell('Baseline date', formatIso(scan.aoi.baselineDate))}
                  {cell('Current date', formatIso(scan.aoi.currentDate))}
                  {cell('Scanned at', formatIso(scan.generatedAt))}
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'providers' && (
          <div className="space-y-3 text-sm text-slate-700">
            {!scan ? (
              <p className="text-slate-500">Awaiting scan.</p>
            ) : (
              <>
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs font-semibold text-slate-800 mb-1">Landsat / Earth Observation</p>
                  <p className="text-xs text-slate-600">{scan.providers.sentinel.status}</p>
                  <p className="text-xs text-slate-500 mt-1">{scan.providers.sentinel.message}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs font-semibold text-slate-800 mb-1">Global Forest Watch</p>
                  <p className="text-xs text-slate-600">{scan.providers.gfw.status}</p>
                  <p className="text-xs text-slate-500 mt-1">{scan.providers.gfw.message}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs font-semibold text-slate-800 mb-1">NASA FIRMS</p>
                  <p className="text-xs text-slate-600">{scan.providers.firms.status}</p>
                  <p className="text-xs text-slate-500 mt-1">{scan.providers.firms.message}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs font-semibold text-slate-800 mb-1">NASA GEDI</p>
                  <p className="text-xs text-slate-600">{scan.providers.gedi.status}</p>
                  <p className="text-xs text-slate-500 mt-1">{scan.providers.gedi.message}</p>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'limitations' && (
          <div>
            {!scan?.limitations?.length ? (
              <p className="text-sm text-slate-500">No limitations listed for this scan.</p>
            ) : (
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                {scan.limitations.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'alerts' && (
          <div className="rounded-lg border border-slate-100 overflow-hidden">
            {!scan ? (
              <p className="p-3 text-sm text-slate-500">Awaiting scan.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Field</th>
                    <th className="px-3 py-2 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {alertsRows.map((row) => (
                    <tr key={row.label} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.label}</td>
                      <td className="px-3 py-2 text-slate-900 break-words">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 px-3 py-3 bg-slate-50/80">
        <button
          type="button"
          disabled
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed"
          title="PDF export is not wired yet."
        >
          Download Evidence Packet (PDF) — Coming soon
        </button>
        <button
          type="button"
          disabled={!scan}
          onClick={exportJson}
          className="rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Export Data (JSON)
        </button>
      </div>
    </div>
  );
};

export default ForestEvidencePacketPanel;
