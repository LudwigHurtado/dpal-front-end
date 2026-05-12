import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Globe, ShieldCheck } from '../../../components/icons';
import { getApiBase } from '../../../constants';
import ForestEvidencePacketPanel from './components/ForestEvidencePacketPanel';
import ForestLayerControl, { type ForestMapLayers } from './components/ForestLayerControl';
import ForestRiskSummaryCards from './components/ForestRiskSummaryCards';
import ForestWatchAutomationPanel from './components/ForestWatchAutomationPanel';
import {
  clearForestIntegrityScanCache,
  getForestIntegrityProviderStatus,
  getForestIntegrityScan,
  postForestIntegrityEvidencePacket,
} from './services/forestIntegrityApi';
import type {
  ForestEvidencePacketResponse,
  ForestIntegrityScanResponse,
  ForestProviderStatusResponse,
  ForestWatchStep,
} from './types';

type Props = {
  onReturn: () => void;
};

function isoFromDateInput(d: string, endOfDay: boolean): string {
  if (!d) return '';
  const [y, m, day] = d.split('-').map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return '';
  const dt = new Date(Date.UTC(y, m - 1, day, endOfDay ? 23 : 12, endOfDay ? 59 : 0, 0));
  return dt.toISOString();
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function initialSteps(): ForestWatchStep[] {
  return [
    {
      id: 'aoi',
      title: 'Confirm AOI / coordinates',
      status: 'pending',
      explanation: 'DPAL needs a fixed place to monitor before any satellite pull.',
    },
    {
      id: 'baseline',
      title: 'Load baseline satellite context',
      status: 'pending',
      provider: 'Microsoft Planetary Computer / Landsat C2 L2',
      explanation: 'Retrieve past-window scene metadata and statistics for the AOI.',
    },
    {
      id: 'current',
      title: 'Load current satellite context',
      status: 'pending',
      provider: 'Microsoft Planetary Computer / Landsat C2 L2',
      explanation: 'Retrieve latest-window scene metadata and statistics for change detection.',
    },
    {
      id: 'indices',
      title: 'Calculate NDVI / NDMI / NBR',
      status: 'pending',
      provider: 'Landsat C2 L2 band means (item statistics)',
      explanation: 'Vegetation vigor, moisture, and burn-sensitive index deltas when scenes resolve.',
    },
    {
      id: 'gfw',
      title: 'Check deforestation alert providers',
      status: 'pending',
      provider: 'Global Forest Watch (when configured)',
      explanation: 'Integrated deforestation / disturbance alerts require a configured GFW API path on the host.',
    },
    {
      id: 'firms',
      title: 'Check NASA FIRMS active fire signals',
      status: 'pending',
      provider: 'NASA FIRMS VIIRS SNPP NRT (CSV area API)',
      explanation: 'Near-real-time thermal anomaly CSV rows for the AOI (not ground-truthed fire perimeters).',
    },
    {
      id: 'gedi',
      title: 'Estimate biomass / carbon integrity risk',
      status: 'pending',
      provider: 'NASA GEDI (when implemented)',
      explanation: 'Canopy height / biomass estimates are not yet wired — provider remains honest about gaps.',
    },
    {
      id: 'score',
      title: 'Compute DPAL Forest Integrity score',
      status: 'pending',
      provider: 'DPAL scoring model (transparent weights)',
      explanation: 'Combine vegetation, disturbance, FIRMS, deforestation lane, and evidence completeness.',
    },
    {
      id: 'packet',
      title: 'Prepare evidence packet',
      status: 'pending',
      provider: 'DPAL Forest Integrity API',
      explanation: 'Assemble AOI, timestamps, indices, provider outcomes, and limitations.',
    },
    {
      id: 'hash',
      title: 'Create QR / hash-ready audit summary',
      status: 'pending',
      provider: 'SHA-256 over canonical packet JSON',
      explanation: 'Integrity hash anchors the packet for investor and audit workflows.',
    },
  ];
}

function MapPicker({ onPick }: { onPick: (p: { lat: number; lng: number }) => void }) {
  function Picker() {
    useMapEvents({
      click(e) {
        onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  }
  return <Picker />;
}

const ForestIntegrityPage: React.FC<Props> = ({ onReturn }) => {
  const [label, setLabel] = useState('Forest AOI');
  const [center, setCenter] = useState({ lat: -3.4653, lng: -62.2159 });
  const [radiusKm, setRadiusKm] = useState(15);
  const [baselineDay, setBaselineDay] = useState(() => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [currentDay, setCurrentDay] = useState(() => new Date().toISOString().slice(0, 10));

  const [layers, setLayers] = useState<ForestMapLayers>({ satellite: true, labels: true, aoiCircle: true });
  const [providerStatus, setProviderStatus] = useState<ForestProviderStatusResponse | null>(null);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);

  const [watchOpen, setWatchOpen] = useState(false);
  const [steps, setSteps] = useState<ForestWatchStep[]>(() => initialSteps());
  const [isRunning, setIsRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ForestIntegrityScanResponse | null>(null);
  const [evidence, setEvidence] = useState<ForestEvidencePacketResponse | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  const watchRunIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const baselineIso = useMemo(() => isoFromDateInput(baselineDay, false), [baselineDay]);
  const currentIso = useMemo(() => isoFromDateInput(currentDay, true), [currentDay]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getForestIntegrityProviderStatus();
        if (!cancelled) setProviderStatus(s);
      } catch (e) {
        if (!cancelled) setProviderStatusError(e instanceof Error ? e.message : 'Status unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchStep = useCallback((id: string, patch: Partial<ForestWatchStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const resetSteps = useCallback(() => {
    setSteps(initialSteps());
  }, []);

  const stopWatch = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
  }, []);

  const handleMapPick = useCallback((p: { lat: number; lng: number }) => {
    setCenter(p);
    setLastScan(null);
    setEvidence(null);
    setCacheNotice(null);
    clearForestIntegrityScanCache();
  }, []);

  const runManualScan = useCallback(async () => {
    setLastError(null);
    setCacheNotice(null);
    try {
      const { data, fromCache } = await getForestIntegrityScan(
        {
          lat: center.lat,
          lng: center.lng,
          label,
          radiusKm,
          baselineDate: baselineIso,
          currentDate: currentIso,
          bypassCache: true,
        },
        undefined,
      );
      setLastScan(data);
      setEvidence(null);
      setCacheNotice(fromCache ? 'Served from short client cache (same AOI/window).' : null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scan failed';
      if ((e as Error).name === 'AbortError') return;
      setLastError(msg);
    }
  }, [baselineIso, center.lat, center.lng, currentIso, label, radiusKm]);

  const executeWatch = useCallback(async () => {
    if (!baselineIso || !currentIso) {
      setLastError('Choose valid baseline and current dates.');
      return;
    }

    setLastError(null);
    setEvidence(null);
    setCacheNotice(null);
    watchRunIdRef.current += 1;
    const runId = watchRunIdRef.current;
    const ac = new AbortController();
    abortRef.current = ac;
    setIsRunning(true);
    setWatchOpen(true);
    resetSteps();

    const assertRun = () => runId === watchRunIdRef.current;

    try {
      patchStep('aoi', {
        status: 'running',
        explanation: 'Validating map center, radius, and date window before provider calls.',
        at: new Date().toISOString(),
      });
      await delay(280, ac.signal);
      if (!assertRun()) return;

      patchStep('aoi', {
        status: 'complete',
        explanation: 'AOI locked for this run.',
        detail: `${label} @ ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)} — r=${radiusKm} km`,
        at: new Date().toISOString(),
      });

      patchStep('baseline', { status: 'running', at: new Date().toISOString() });
      await delay(320, ac.signal);
      if (!assertRun()) return;
      patchStep('current', { status: 'running', at: new Date().toISOString() });
      await delay(320, ac.signal);
      if (!assertRun()) return;

      const { data, fromCache } = await getForestIntegrityScan(
        {
          lat: center.lat,
          lng: center.lng,
          label,
          radiusKm,
          baselineDate: baselineIso,
          currentDate: currentIso,
        },
        ac.signal,
      );
      if (!assertRun()) return;

      setLastScan(data);
      setCacheNotice(fromCache ? 'Scan result: short client cache hit for identical AOI/window.' : null);

      const s = data.providers.sentinel;
      patchStep('baseline', {
        status: s.status === 'available' ? 'complete' : 'warning',
        explanation: s.message,
        detail: `Baseline scene: ${data.earthObservation && typeof data.earthObservation === 'object' ? String((data.earthObservation as { beforeScene?: { acquisitionDate?: string } }).beforeScene?.acquisitionDate ?? 'n/a') : 'n/a'}`,
        provider: 'Planetary Computer / Landsat C2 L2',
        at: new Date().toISOString(),
      });

      patchStep('current', {
        status: s.status === 'available' ? 'complete' : 'warning',
        explanation: s.message,
        detail: `Current scene date: ${s.sceneDate ?? 'n/a'}`,
        at: new Date().toISOString(),
      });

      const hasIdx =
        data.indices.ndvi != null || data.indices.ndmi != null || data.indices.nbr != null;
      patchStep('indices', {
        status: hasIdx ? 'complete' : 'warning',
        explanation: hasIdx
          ? 'Indices derived from scene mean reflectance where available.'
          : 'Indices unavailable for this AOI/window — see sentinel provider message.',
        detail: `NDVI ${data.indices.ndvi ?? 'n/a'}, NDMI ${data.indices.ndmi ?? 'n/a'}, NBR ${data.indices.nbr ?? 'n/a'}`,
        at: new Date().toISOString(),
      });

      const gfw = data.providers.gfw;
      patchStep('gfw', {
        status: gfw.status === 'not_configured' ? 'warning' : gfw.status === 'available' ? 'complete' : 'warning',
        explanation: gfw.message,
        detail: gfw.alerts != null ? `Alerts: ${gfw.alerts}` : undefined,
        at: new Date().toISOString(),
      });

      const fr = data.providers.firms;
      patchStep('firms', {
        status:
          fr.status === 'not_configured' ? 'warning' : fr.status === 'failed' ? 'failed' : 'complete',
        explanation: fr.message,
        detail: fr.activeFires != null ? `CSV rows (hotspot proxy): ${fr.activeFires}` : undefined,
        at: new Date().toISOString(),
      });

      const gedi = data.providers.gedi;
      patchStep('gedi', {
        status: 'warning',
        explanation: gedi.message,
        at: new Date().toISOString(),
      });

      patchStep('score', {
        status: data.forestIntegrityScore != null ? 'complete' : 'warning',
        explanation:
          data.forestIntegrityScore != null
            ? `Score ${data.forestIntegrityScore} — band: ${data.riskLevel.replace(/_/g, ' ')}`
            : 'Score withheld until at least one primary lane returns usable evidence.',
        at: new Date().toISOString(),
      });

      patchStep('packet', { status: 'running', explanation: 'Posting evidence packet to API host…', at: new Date().toISOString() });
      const ev = await postForestIntegrityEvidencePacket(data, ac.signal);
      if (!assertRun()) return;
      setEvidence(ev);
      patchStep('packet', {
        status: 'complete',
        explanation: 'Evidence packet accepted and normalized server-side.',
        at: new Date().toISOString(),
      });

      patchStep('hash', {
        status: 'complete',
        explanation: 'Integrity hash generated for QR-ready anchoring.',
        detail: ev.integrityHash,
        at: new Date().toISOString(),
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setSteps((prev) =>
          prev.map((s) =>
            s.status === 'running' ? { ...s, status: 'skipped' as const, explanation: 'Stopped by operator.' } : s,
          ),
        );
      } else {
        const msg = e instanceof Error ? e.message : 'Watch run failed';
        setLastError(msg);
        setSteps((prev) =>
          prev.map((s) =>
            s.status === 'running' || s.status === 'pending'
              ? { ...s, status: 'failed' as const, explanation: msg }
              : s,
          ),
        );
      }
    } finally {
      if (assertRun()) {
        setIsRunning(false);
        abortRef.current = null;
      }
    }
  }, [baselineIso, center.lat, center.lng, currentIso, label, patchStep, radiusKm, resetSteps]);

  const restartWatch = useCallback(() => {
    if (isRunning) return;
    void executeWatch();
  }, [executeWatch, isRunning]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <div className="max-w-[1400px] mx-auto px-4 pt-6">
        <button
          type="button"
          onClick={onReturn}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-black/30 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-black/45"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <header className="rounded-2xl border border-emerald-800/40 bg-gradient-to-r from-emerald-950/80 via-slate-950 to-slate-950 p-6 md:p-8 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/90">Forestry Protection</p>
              <h1 className="mt-1 text-2xl md:text-3xl font-black text-white tracking-tight">Forest Integrity + Satellite Monitoring</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400 leading-relaxed">
                Evidence-support workspace for forest AOI screening using Landsat-backed indices when the API host is live,
                honest provider status when adapters are missing, and FIRMS CSV checks when configured.
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                disabled={isRunning}
                onClick={() => void executeWatch()}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 disabled:opacity-45"
              >
                Watch DPAL Work
              </button>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => void runManualScan()}
                className="rounded-xl border border-slate-500/70 bg-black/30 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-black/45 disabled:opacity-45"
              >
                Run manual scan
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-100/90 leading-snug">
            DPAL Forest Integrity results are evidence-support tools, not final legal findings or certified carbon-credit
            issuance. Results should be validated with field evidence, project documents, and independent review before formal
            claims are made.
          </div>
        </header>

        <div className="mb-3 rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-[10px] text-slate-500 font-mono">
          API base: {getApiBase()}
        </div>

        {lastError ? (
          <div className="mb-4 rounded-lg border border-rose-800/50 bg-rose-950/30 px-3 py-2 text-sm text-rose-100">{lastError}</div>
        ) : null}
        {cacheNotice ? (
          <div className="mb-4 rounded-lg border border-cyan-800/40 bg-cyan-950/25 px-3 py-2 text-xs text-cyan-100">{cacheNotice}</div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-xs">
                <span className="text-slate-500">AOI label</span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-slate-500">Radius (km)</span>
                <input
                  type="number"
                  min={1}
                  max={250}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number.parseFloat(e.target.value) || 15)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-slate-500">Baseline date</span>
                <input
                  type="date"
                  value={baselineDay}
                  onChange={(e) => setBaselineDay(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-slate-500">Current date</span>
                <input
                  type="date"
                  value={currentDay}
                  onChange={(e) => setCurrentDay(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1.5 text-sm"
                />
              </label>
            </div>

            <ForestLayerControl layers={layers} onChange={setLayers} />

            <div className="rounded-xl overflow-hidden border border-slate-800">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-2 bg-slate-900/80">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Forest AOI map</span>
                <span className="text-[10px] text-slate-500">Click map to move center</span>
              </div>
              <div style={{ height: '440px' }}>
                <MapContainer center={[center.lat, center.lng]} zoom={8} scrollWheelZoom style={{ height: '440px', width: '100%' }}>
                  {layers.satellite ? (
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={20}
                    />
                  ) : (
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
                  )}
                  {layers.labels ? (
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={20}
                    />
                  ) : null}
                  {layers.aoiCircle ? (
                    <Circle
                      center={[center.lat, center.lng]}
                      radius={radiusKm * 1000}
                      pathOptions={{ color: '#34d399', weight: 2, fillOpacity: 0.08 }}
                    />
                  ) : null}
                  <MapPicker onPick={handleMapPick} />
                </MapContainer>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <p className="text-sm font-bold text-white">Provider status</p>
              </div>
              {providerStatusError ? (
                <p className="text-xs text-rose-300">{providerStatusError}</p>
              ) : providerStatus ? (
                <ul className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <li>Earth Observation live: {providerStatus.earthObservationLive ? 'configured' : 'off / unavailable'}</li>
                  <li>NASA FIRMS key: {providerStatus.nasaFirmsConfigured ? 'present' : 'not configured'}</li>
                  <li>GFW API: {providerStatus.gfwConfigured ? 'key present (adapter pending)' : 'not configured'}</li>
                  <li>GEDI lane: {providerStatus.gediImplemented ? 'implemented' : 'not implemented'}</li>
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Loading…</p>
              )}
            </div>

            <ForestRiskSummaryCards scan={lastScan} />
            <ForestEvidencePacketPanel scan={lastScan} evidence={evidence} />
          </div>
        </div>
      </div>

      <ForestWatchAutomationPanel
        open={watchOpen}
        steps={steps}
        isRunning={isRunning}
        onClose={() => {
          if (isRunning) stopWatch();
          setWatchOpen(false);
        }}
        onStop={stopWatch}
        onRestart={restartWatch}
      />
    </div>
  );
};

export default ForestIntegrityPage;
