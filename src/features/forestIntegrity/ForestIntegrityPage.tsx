import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  ChevronRight,
  Crosshair,
  Layout,
  Maximize2,
  Search,
  Settings,
} from '../../../components/icons';
import ForestEvidencePacketPanel from './components/ForestEvidencePacketPanel';
import ForestLayerControl, { type ForestMapLayers } from './components/ForestLayerControl';
import ForestRiskSummaryCards from './components/ForestRiskSummaryCards';
import ForestWatchAutomationPanel from './components/ForestWatchAutomationPanel';
import { WATCH_DEEP_LINK_HASH } from '../../../utils/appRoutes';
import EnvironmentalDashboardShell from '../environmentalIntelligence/shared/EnvironmentalDashboardShell';
import EnvironmentalDisclaimerBar from '../environmentalIntelligence/shared/EnvironmentalDisclaimerBar';
import EnvironmentalProviderStatusStrip from '../environmentalIntelligence/shared/EnvironmentalProviderStatusStrip';
import InvestorDemoExplainer from '../environmentalIntelligence/shared/InvestorDemoExplainer';
import { getDemoScenarioById } from '../environmentalIntelligence/shared/demoScenarios';
import type { EnvironmentalProviderStripItem } from '../environmentalIntelligence/shared/EnvironmentalProviderStatusStrip';
import type { EnvironmentalProviderUiState } from '../environmentalIntelligence/shared/environmentalServiceStatus';
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

type PresetId = '1m' | '3m' | '6m' | '1y';

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
      id: 'init',
      title: 'Initializing Forest Integrity Scan',
      status: 'pending',
      explanation: 'Validating AOI, radius, and date window before provider calls.',
    },
    {
      id: 'gfw_integrated',
      title: 'Checking Global Forest Watch Integrated Alerts',
      status: 'pending',
      provider: 'Global Forest Watch',
      explanation: 'Awaiting scan response for integrated deforestation alerts.',
    },
    {
      id: 'gfw_disturbance',
      title: 'Checking RADD Disturbance Alerts',
      status: 'pending',
      provider: 'Global Forest Watch',
      explanation: 'Awaiting scan response for disturbance / RADD-style lanes when returned.',
    },
    {
      id: 'firms',
      title: 'Checking Active Fires',
      status: 'pending',
      provider: 'NASA FIRMS VIIRS SNPP NRT',
      explanation: 'Awaiting hotspot CSV row counts for the AOI window.',
    },
    {
      id: 'landsat',
      title: 'Analyzing Satellite Imagery',
      status: 'pending',
      provider: 'Microsoft Planetary Computer / Landsat C2 L2',
      explanation: 'Scene statistics for NDVI / NDMI / NBR when Earth Observation is live.',
    },
    {
      id: 'gedi',
      title: 'Checking GEDI Biomass / Canopy Status',
      status: 'pending',
      provider: 'NASA GEDI',
      explanation: 'Biomass / canopy lane status from the API host (not implemented until adapter is live).',
    },
    {
      id: 'score',
      title: 'Calculating Forest Integrity Score',
      status: 'pending',
      provider: 'DPAL Forest Integrity model',
      explanation: 'Transparent weighted score when configured lanes return usable evidence.',
    },
    {
      id: 'packet',
      title: 'Compiling Evidence Packet',
      status: 'pending',
      provider: 'DPAL Forest Integrity API',
      explanation: 'Posting normalized evidence payload to the API host.',
    },
    {
      id: 'finalize',
      title: 'Finalizing QR / Hash-ready Record',
      status: 'pending',
      provider: 'SHA-256 integrity hash',
      explanation: 'Anchoring the evidence packet for audit workflows.',
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

function LeafletZoomScale() {
  const map = useMap();
  useEffect(() => {
    const zoom = L.control.zoom({ position: 'topright' });
    const scale = L.control.scale({ imperial: false, metric: true, position: 'bottomleft' });
    zoom.addTo(map);
    scale.addTo(map);
    return () => {
      map.removeControl(zoom);
      map.removeControl(scale);
    };
  }, [map]);
  return null;
}

function MapViewSync({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), { animate: false });
  }, [center.lat, center.lng, map]);
  return null;
}

const ForestIntegrityPage: React.FC<Props> = ({ onReturn }) => {
  const [label, setLabel] = useState('Forest AOI');
  const [searchText, setSearchText] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [center, setCenter] = useState({ lat: -3.4653, lng: -62.2159 });
  const [radiusKm, setRadiusKm] = useState(15);
  const [baselineDay, setBaselineDay] = useState(() => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [currentDay, setCurrentDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [activePreset, setActivePreset] = useState<PresetId | null>('6m');

  const [layers, setLayers] = useState<ForestMapLayers>({
    satellite: true,
    labels: true,
    aoiCircle: true,
    deforestationAlerts: true,
    disturbanceAlerts: true,
    activeFires: true,
    canopyGedi: true,
    forestLossHansen: true,
  });
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const layerMenuRef = useRef<HTMLDivElement | null>(null);
  const mapWrapRef = useRef<HTMLDivElement | null>(null);

  const [providerStatus, setProviderStatus] = useState<ForestProviderStatusResponse | null>(null);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);

  const [watchOpen, setWatchOpen] = useState(false);
  const [watchLogLines, setWatchLogLines] = useState<string[]>([]);
  const [steps, setSteps] = useState<ForestWatchStep[]>(() => initialSteps());
  const [isRunning, setIsRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ForestIntegrityScanResponse | null>(null);
  const [evidence, setEvidence] = useState<ForestEvidencePacketResponse | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  const watchRunIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const watchCtaRef = useRef<HTMLButtonElement | null>(null);

  const baselineIso = useMemo(() => isoFromDateInput(baselineDay, false), [baselineDay]);
  const currentIso = useMemo(() => isoFromDateInput(currentDay, true), [currentDay]);

  const pushLog = useCallback((line: string) => {
    const ts = new Date().toISOString().slice(11, 19);
    setWatchLogLines((prev) => [...prev.slice(-200), `[${ts}Z] ${line}`]);
  }, []);

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

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (settingsOpen && settingsRef.current && !settingsRef.current.contains(t)) setSettingsOpen(false);
      if (layerMenuOpen && layerMenuRef.current && !layerMenuRef.current.contains(t)) setLayerMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [settingsOpen, layerMenuOpen]);

  /**
   * `#watch` deep-link handler.
   * Opens the Watch DPAL Work side panel and scrolls the Watch CTA into view so the
   * operator can review the plan and click Restart/Run themselves. Does NOT auto-run
   * any scan or provider call — preserves the "honest labels" / operator-consent model.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== WATCH_DEEP_LINK_HASH) return;
    setWatchOpen(true);
    const id = window.requestAnimationFrame(() => {
      try {
        watchCtaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        watchCtaRef.current?.focus({ preventScroll: true });
      } catch {
        /* ignore — graceful no-op when element is absent */
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const patchStep = useCallback((id: string, patch: Partial<ForestWatchStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const resetSteps = useCallback(() => {
    setSteps(initialSteps());
    setWatchLogLines([]);
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

  const applyPreset = useCallback((pid: PresetId) => {
    setActivePreset(pid);
    const months = pid === '1m' ? 1 : pid === '3m' ? 3 : pid === '6m' ? 6 : 12;
    const end = new Date(currentDay + 'T12:00:00Z');
    const start = new Date(end);
    start.setUTCMonth(start.getUTCMonth() - months);
    setBaselineDay(start.toISOString().slice(0, 10));
  }, [currentDay]);

  const onBaselineChange = (v: string) => {
    setBaselineDay(v);
    setActivePreset(null);
  };
  const onCurrentChange = (v: string) => {
    setCurrentDay(v);
    setActivePreset(null);
  };

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
      patchStep('init', {
        status: 'running',
        explanation: 'Validating map center, radius, and date window.',
        at: new Date().toISOString(),
      });
      await delay(220, ac.signal);
      if (!assertRun()) return;

      patchStep('init', {
        status: 'complete',
        explanation: 'AOI locked for this run.',
        detail: `${label} @ ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)} — r=${radiusKm} km`,
        at: new Date().toISOString(),
      });
      pushLog(`Scan initialized for AOI (${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}), radius ${radiusKm} km.`);

      patchStep('gfw_integrated', { status: 'running', at: new Date().toISOString() });
      pushLog('GFW integrated alerts query started (via combined forest scan).');

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
      pushLog('Forest integrity scan response received from API.');

      const gfw = data.providers.gfw;
      const gfwMeta: string[] = [];
      if (Array.isArray(gfw.datasetVersionsUsed) && gfw.datasetVersionsUsed.length) {
        gfwMeta.push(`datasets: ${gfw.datasetVersionsUsed.join('; ')}`);
      }
      if (gfw.queriedAt) gfwMeta.push(`queriedAt: ${gfw.queriedAt}`);
      const gfwMetaLine = gfwMeta.length ? gfwMeta.join(' · ') : undefined;
      const intMsg =
        typeof gfw.integratedAlerts === 'number'
          ? `GFW integrated alerts returned ${gfw.integratedAlerts} alert(s).`
          : `GFW integrated alerts unavailable (${gfw.status}).`;
      pushLog(intMsg);

      const distMsg =
        typeof gfw.disturbanceAlerts === 'number'
          ? `GFW disturbance alerts returned ${gfw.disturbanceAlerts} alert(s).`
          : `GFW disturbance alerts unavailable (${gfw.status}).`;
      pushLog(distMsg);

      const fr = data.providers.firms;
      if (typeof fr.activeFires === 'number') {
        pushLog(`FIRMS returned ${fr.activeFires} active-fire CSV row(s).`);
      } else {
        pushLog(`FIRMS lane: ${fr.status} — ${fr.message}`);
      }

      const gfwIntegratedStatus: ForestWatchStep['status'] =
        gfw.status === 'available'
          ? 'complete'
          : gfw.status === 'auth_error' || gfw.status === 'failed'
          ? 'failed'
          : 'warning';
      patchStep('gfw_integrated', {
        status: gfwIntegratedStatus,
        explanation: gfw.message,
        detail:
          typeof gfw.integratedAlerts === 'number'
            ? `integrated=${gfw.integratedAlerts}${gfwMetaLine ? ` · ${gfwMetaLine}` : ''}`
            : `status=${gfw.status}${gfwMetaLine ? ` · ${gfwMetaLine}` : ''}`,
        at: new Date().toISOString(),
      });

      const gfwDistStatus: ForestWatchStep['status'] =
        gfw.status === 'available'
          ? 'complete'
          : gfw.status === 'auth_error' || gfw.status === 'failed'
          ? 'failed'
          : 'warning';
      patchStep('gfw_disturbance', {
        status: gfwDistStatus,
        explanation: gfw.message,
        detail:
          typeof gfw.disturbanceAlerts === 'number'
            ? `disturbance=${gfw.disturbanceAlerts}${gfwMetaLine ? ` · ${gfwMetaLine}` : ''}`
            : gfwMetaLine,
        at: new Date().toISOString(),
      });

      patchStep('firms', {
        status:
          fr.status === 'not_configured' ? 'warning' : fr.status === 'failed' ? 'failed' : 'complete',
        explanation: fr.message,
        detail: fr.activeFires != null ? `CSV rows: ${fr.activeFires}` : undefined,
        at: new Date().toISOString(),
      });

      const s = data.providers.sentinel;
      const hasIdx = data.indices.ndvi != null || data.indices.ndmi != null || data.indices.nbr != null;
      patchStep('landsat', {
        status: s.status === 'available' && hasIdx ? 'complete' : 'warning',
        explanation: hasIdx
          ? 'Landsat-derived indices present for this window.'
          : `${s.message} Indices may be missing if scenes did not resolve.`,
        detail: `NDVI ${data.indices.ndvi ?? 'n/a'}, NDMI ${data.indices.ndmi ?? 'n/a'}, NBR ${data.indices.nbr ?? 'n/a'}`,
        at: new Date().toISOString(),
      });

      const gedi = data.providers.gedi;
      patchStep('gedi', {
        status: providerStatus?.gediImplemented ? 'warning' : 'skipped',
        explanation: gedi.message,
        detail: providerStatus?.gediImplemented
          ? 'GEDI lane present — biomass products may still be unavailable for this AOI.'
          : 'GEDI biomass / canopy adapter not implemented on this API host.',
        at: new Date().toISOString(),
      });

      const limShort =
        Array.isArray(data.limitations) && data.limitations.length
          ? data.limitations.join(' | ').slice(0, 360)
          : undefined;
      patchStep('score', {
        status: data.forestIntegrityScore != null ? 'complete' : 'warning',
        explanation:
          data.forestIntegrityScore != null
            ? `Score ${data.forestIntegrityScore} — ${data.riskLevel.replace(/_/g, ' ')}`
            : 'Score withheld when configured lanes do not return enough usable evidence.',
        detail: limShort,
        at: new Date().toISOString(),
      });

      patchStep('packet', { status: 'running', explanation: 'Posting evidence packet…', at: new Date().toISOString() });
      const ev = await postForestIntegrityEvidencePacket(data, ac.signal);
      if (!assertRun()) return;
      setEvidence(ev);
      patchStep('packet', {
        status: 'complete',
        explanation: 'Evidence packet accepted server-side.',
        at: new Date().toISOString(),
      });
      pushLog('Evidence packet compiled and accepted by API.');

      patchStep('finalize', {
        status: 'complete',
        explanation: 'Integrity hash ready for anchoring.',
        detail: ev.integrityHash,
        at: new Date().toISOString(),
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        pushLog('Scan stopped by operator.');
        setSteps((prev) =>
          prev.map((s) =>
            s.status === 'running' ? { ...s, status: 'skipped' as const, explanation: 'Stopped by operator.' } : s,
          ),
        );
      } else {
        const msg = e instanceof Error ? e.message : 'Watch run failed';
        setLastError(msg);
        pushLog(`Error: ${msg}`);
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
  }, [baselineIso, center.lat, center.lng, currentIso, label, patchStep, providerStatus, pushLog, radiusKm, resetSteps]);

  const restartWatch = useCallback(() => {
    if (isRunning) return;
    void executeWatch();
  }, [executeWatch, isRunning]);

  const toggleFullscreen = useCallback(async () => {
    const el = mapWrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  const submitSearch = useCallback(async () => {
    const q = searchText.trim();
    if (!q) return;
    setSearchBusy(true);
    setSearchNotice(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
      const arr = (await res.json()) as { lat: string; lon: string; display_name?: string }[];
      if (!arr?.length) {
        setSearchNotice('No results — try another query or click the map.');
        return;
      }
      const lat = Number.parseFloat(arr[0].lat);
      const lng = Number.parseFloat(arr[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Invalid geocoder response');
      if (arr[0].display_name) setLabel(arr[0].display_name.slice(0, 80));
      handleMapPick({ lat, lng });
    } catch {
      setSearchNotice('Geocoding unavailable (network/CORS). Use map click or enter coordinates.');
    } finally {
      setSearchBusy(false);
    }
  }, [handleMapPick, searchText]);

  const legendRows = useMemo(
    () =>
      [
        { key: 'aoiCircle' as const, label: 'AOI', color: 'bg-emerald-500' },
        { key: 'deforestationAlerts' as const, label: 'Deforestation Alerts', color: 'bg-amber-500' },
        { key: 'disturbanceAlerts' as const, label: 'Disturbance Alerts', color: 'bg-orange-500' },
        { key: 'activeFires' as const, label: 'Active Fires', color: 'bg-rose-500' },
        { key: 'forestLossHansen' as const, label: 'Forest Loss (Hansen)', color: 'bg-lime-600' },
        { key: 'canopyGedi' as const, label: 'Canopy Height (GEDI)', color: 'bg-teal-600' },
        { key: 'satellite' as const, label: 'Satellite Imagery', color: 'bg-slate-600' },
      ].filter((row) => (row.key === 'aoiCircle' ? layers.aoiCircle : layers[row.key])),
    [layers],
  );

  const providerStripItems = useMemo((): EnvironmentalProviderStripItem[] => {
    const ps = providerStatus;
    const scan = lastScan;
    const gfw = scan?.providers.gfw;
    const firms = scan?.providers.firms;

    let earthObs: EnvironmentalProviderUiState = ps?.earthObservationLive ? 'live' : 'unavailable';

    let gfwState: EnvironmentalProviderUiState = 'not_configured';
    if (gfw?.status === 'available') gfwState = 'available';
    else if (gfw?.status === 'auth_error') gfwState = 'auth_error';
    else if (gfw?.status === 'rate_limited') gfwState = 'rate_limited';
    else if (gfw?.status === 'failed') gfwState = 'failed';
    else if (gfw?.status === 'unavailable') gfwState = 'unavailable';
    else if (ps?.gfwConfigured) gfwState = 'configured';

    let firmsState: EnvironmentalProviderUiState = ps?.nasaFirmsConfigured ? 'configured' : 'not_configured';
    if (firms?.status === 'failed') firmsState = 'failed';
    if (firms?.status === 'available' && typeof firms.activeFires === 'number') firmsState = 'available';

    const cop: EnvironmentalProviderUiState = ps?.copernicusConfigured ? 'configured' : 'not_configured';

    const gediState: EnvironmentalProviderUiState = ps?.gediImplemented ? 'partial' : 'coming_soon';

    if (!ps && !scan) {
      return [
        { id: 'eo', label: 'Earth Observation', state: 'unavailable', hint: 'Loading host status…' },
        { id: 'gfw', label: 'Global Forest Watch', state: 'not_configured', hint: 'Awaiting status' },
        { id: 'firms', label: 'NASA FIRMS', state: 'not_configured', hint: 'Awaiting status' },
        { id: 'cop', label: 'Copernicus', state: 'not_configured', hint: 'Awaiting status' },
        { id: 'gedi', label: 'GEDI', state: 'coming_soon', hint: 'Canopy / biomass lane' },
      ];
    }

    if (ps?.earthObservationLive === false) earthObs = 'unavailable';

    return [
      {
        id: 'eo',
        label: 'Earth Observation',
        state: earthObs,
        hint: ps?.earthObservationLive ? 'Landsat / index lane when scenes resolve' : 'Disabled or unavailable on API host',
      },
      {
        id: 'gfw',
        label: 'Global Forest Watch',
        state: gfwState,
        hint: gfw?.message ?? (ps?.gfwConfigured ? 'Credentials configured — run a scan for live counts' : 'Not configured'),
      },
      {
        id: 'firms',
        label: 'NASA FIRMS',
        state: firmsState,
        hint: firms?.message ?? (ps?.nasaFirmsConfigured ? 'Key configured — run a scan for fire rows' : 'Not configured'),
      },
      {
        id: 'cop',
        label: 'Copernicus',
        state: cop,
        hint: ps?.copernicusConfigured ? 'Adapter configured on API host' : 'Not configured',
      },
      {
        id: 'gedi',
        label: 'GEDI',
        state: gediState,
        hint: ps?.gediImplemented ? 'Lane present — may return partial context' : 'Not implemented',
      },
    ];
  }, [providerStatus, lastScan]);

  return (
    <EnvironmentalDashboardShell>
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onReturn}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-[10px] font-bold text-white">
                DP
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap">
                  <span>Monitoring &amp; Remote Sensing</span>
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
                  <span className="font-semibold text-slate-800">Forest Integrity</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex flex-col items-end text-[10px] text-slate-500 leading-tight">
              <span>
                Baseline: <span className="font-mono text-slate-700">{baselineDay}</span>
              </span>
              <span>
                Current: <span className="font-mono text-slate-700">{currentDay}</span>
              </span>
            </div>
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              {settingsOpen ? (
                <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Provider status</p>
                  {providerStatusError ? (
                    <p className="text-rose-600">{providerStatusError}</p>
                  ) : providerStatus ? (
                    <ul className="space-y-1 text-slate-600">
                      <li>Earth Observation live: {providerStatus.earthObservationLive ? 'Yes' : 'No'}</li>
                      <li>NASA FIRMS key: {providerStatus.nasaFirmsConfigured ? 'Configured' : 'Not configured'}</li>
                      <li>GFW API: {providerStatus.gfwConfigured ? 'Configured' : 'Not configured'}</li>
                      <li>GEDI lane: {providerStatus.gediImplemented ? 'Implemented' : 'Not implemented'}</li>
                    </ul>
                  ) : (
                    <p className="text-slate-500">Loading…</p>
                  )}
                </div>
              ) : null}
            </div>
            <button
              ref={watchCtaRef}
              type="button"
              disabled={isRunning}
              onClick={() => void executeWatch()}
              className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-50"
            >
              Watch DPAL Work
            </button>
          </div>
        </div>
      </header>

      <EnvironmentalProviderStatusStrip items={providerStripItems} />

      <div className="mx-auto flex w-full max-w-[1920px] flex-1 min-h-0 flex-col gap-3 px-4 py-4 lg:flex-row">
        <aside className="w-full shrink-0 space-y-3 lg:w-[320px] lg:max-w-[360px]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Define Area of Interest</h2>

            <div className="mt-3">
              <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Search</label>
              <div className="mt-1 flex gap-1">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void submitSearch();
                    }}
                    placeholder="Search location or click on map"
                    className="w-full rounded-lg border border-slate-200 py-1.5 pl-7 pr-2 text-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={searchBusy}
                  onClick={() => void submitSearch()}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Go
                </button>
              </div>
              {searchNotice ? <p className="mt-1 text-[10px] text-amber-700">{searchNotice}</p> : null}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[10px] font-medium text-slate-500">
                Lat
                <input
                  type="number"
                  step="any"
                  value={Number.isFinite(center.lat) ? center.lat : ''}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value);
                    if (Number.isFinite(v)) setCenter((c) => ({ ...c, lat: v }));
                  }}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono"
                />
              </label>
              <label className="text-[10px] font-medium text-slate-500">
                Lng
                <input
                  type="number"
                  step="any"
                  value={Number.isFinite(center.lng) ? center.lng : ''}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value);
                    if (Number.isFinite(v)) setCenter((c) => ({ ...c, lng: v }));
                  }}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono"
                />
              </label>
            </div>

            <div className="mt-3">
              <p className="text-[10px] font-medium text-slate-500">Radius (km)</p>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRadiusKm((r) => Math.max(1, r - 1))}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  aria-label="Decrease radius"
                >
                  −
                </button>
                <span className="min-w-[3rem] text-center text-sm font-mono font-semibold">{radiusKm}</span>
                <button
                  type="button"
                  onClick={() => setRadiusKm((r) => Math.min(250, r + 1))}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  aria-label="Increase radius"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-slate-500">or Draw AOI</span>
              <button
                type="button"
                disabled
                title="Polygon draw coming soon"
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-400 cursor-not-allowed"
              >
                <Layout className="h-3.5 w-3.5" />
                Draw
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              <label className="text-[10px] font-medium text-slate-500">
                Baseline Date
                <input
                  type="date"
                  value={baselineDay}
                  onChange={(e) => onBaselineChange(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
              </label>
              <label className="text-[10px] font-medium text-slate-500">
                Current Date
                <input
                  type="date"
                  value={currentDay}
                  onChange={(e) => onCurrentChange(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
              </label>
            </div>

            <div className="mt-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1.5">Quick presets</p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ['1m', '1 mo'],
                    ['3m', '3 mo'],
                    ['6m', '6 mo'],
                    ['1y', '1 yr'],
                  ] as const
                ).map(([id, lab]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => applyPreset(id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${
                      activePreset === id
                        ? 'border-emerald-800 bg-emerald-800 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {lab}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <ForestLayerControl layers={layers} onChange={setLayers} />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={isRunning}
                onClick={() => void runManualScan()}
                className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
              >
                Run Manual Scan
              </button>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => void executeWatch()}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-emerald-900 hover:bg-slate-50 disabled:opacity-50"
              >
                Watch DPAL Work
              </button>
            </div>

            <label className="mt-3 block text-[10px] text-slate-500">
              AOI label (optional)
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
              />
            </label>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-3">
          {lastError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{lastError}</div>
          ) : null}
          {cacheNotice ? (
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-900">{cacheNotice}</div>
          ) : null}

          {(() => {
            const scenario = getDemoScenarioById('demo-forest-amazon-aoi');
            if (!scenario) return null;
            return (
              <InvestorDemoExplainer
                title={scenario.title}
                moduleLabel={scenario.moduleLabel}
                whatYouAreSeeing="A Forest Integrity workspace prepared for an AOI investigation. The map, AOI controls, date window, and Watch DPAL Work panel are all visible — no provider call has fired yet."
                whyItMatters="Verified forest evidence depends on combining GFW alerts, NASA FIRMS hotspots, and Landsat indices. DPAL surfaces honest lane states so frontline communities and validators can trust the result."
                honestyNote={scenario.limitationNote}
                nextAction={scenario.recommendedNextAction}
                accent={scenario.accent}
                evidencePreview={{
                  location: scenario.locationLabel,
                  timestampLabel: 'Baseline / current window — set in the side panel before scan.',
                  providerSources: scenario.providerSources,
                  signalSummary:
                    'No scan has run yet — provider lanes will report GFW alerts, FIRMS rows, and Landsat index status when the operator clicks Watch DPAL Work.',
                  confidenceNote:
                    'Forest integrity score is withheld until configured lanes return enough usable evidence (transparent weighted model).',
                  fieldValidationStatus: 'Field validation is operator-led — DPAL never auto-publishes a forest claim.',
                  qrHashStatus: 'SHA-256 integrity hash is issued after the evidence packet is accepted server-side.',
                  recommendedAction: scenario.recommendedNextAction,
                }}
              />
            );
          })()}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col flex-1 min-h-[320px]">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <p className="text-xs font-semibold text-slate-800">Forest AOI map</p>
              <p className="text-[10px] text-slate-500">Click map to set center</p>
            </div>
            <div ref={mapWrapRef} className="relative flex-1 min-h-[380px]">
              <div className="h-[min(52vh,520px)] min-h-[380px] w-full">
                <MapContainer
                  center={[center.lat, center.lng]}
                  zoom={8}
                  scrollWheelZoom
                  zoomControl={false}
                  className="z-0 h-full w-full rounded-none"
                  style={{ height: '100%', width: '100%' }}
                >
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
                      pathOptions={{ color: '#047857', weight: 2, fillOpacity: 0.06 }}
                    />
                  ) : null}
                  <MapPicker onPick={handleMapPick} />
                  <LeafletZoomScale />
                  <MapViewSync center={center} />
                </MapContainer>
              </div>

              <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
                <Crosshair className="h-8 w-8 text-emerald-700/50 drop-shadow-sm" strokeWidth={2.5} />
              </div>

              <div className="pointer-events-auto absolute left-3 top-3 z-[450] flex flex-col gap-1">
                <div className="relative" ref={layerMenuRef}>
                  <button
                    type="button"
                    onClick={() => setLayerMenuOpen((o) => !o)}
                    className="rounded-lg border border-slate-200 bg-white/95 p-2 text-slate-700 shadow-sm hover:bg-white"
                    title="Map layers"
                  >
                    <Layout className="h-4 w-4" />
                  </button>
                  {layerMenuOpen ? (
                    <div className="absolute left-0 top-full z-[460] mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg">
                      <p className="text-[10px] font-semibold text-slate-500 mb-1">Quick toggles</p>
                      <label className="flex items-center justify-between gap-2 py-1">
                        <span>Satellite base</span>
                        <input
                          type="checkbox"
                          checked={layers.satellite}
                          onChange={() => setLayers((L) => ({ ...L, satellite: !L.satellite }))}
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 py-1">
                        <span>Labels</span>
                        <input
                          type="checkbox"
                          checked={layers.labels}
                          onChange={() => setLayers((L) => ({ ...L, labels: !L.labels }))}
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 py-1">
                        <span>AOI circle</span>
                        <input
                          type="checkbox"
                          checked={layers.aoiCircle}
                          onChange={() => setLayers((L) => ({ ...L, aoiCircle: !L.aoiCircle }))}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  className="rounded-lg border border-slate-200 bg-white/95 p-2 text-slate-700 shadow-sm hover:bg-white"
                  title="Fullscreen map"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>

              <div className="pointer-events-none absolute bottom-3 right-3 z-[450] max-w-[220px] rounded-lg border border-slate-200 bg-white/95 p-2.5 text-[10px] shadow-md">
                <p className="font-semibold text-slate-800 mb-1.5">Legend</p>
                <ul className="space-y-1">
                  {legendRows.length === 0 ? (
                    <li className="text-slate-500">All overlays hidden in layer panel.</li>
                  ) : (
                    legendRows.map((row) => (
                      <li key={row.label} className="flex items-center gap-2 text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${row.color}`} />
                        {row.label}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>

          <ForestRiskSummaryCards scan={lastScan} />

          <ForestEvidencePacketPanel scan={lastScan} evidence={evidence} />
        </main>
      </div>

      <EnvironmentalDisclaimerBar tone="amber">
        Disclaimer: Data is provided by third-party sources. DPAL does not treat this information alone as a final legal
        finding or certified carbon-credit determination. Always conduct on-ground verification and independent review.
      </EnvironmentalDisclaimerBar>

      <ForestWatchAutomationPanel
        open={watchOpen}
        steps={steps}
        logLines={watchLogLines}
        isRunning={isRunning}
        onClose={() => {
          if (isRunning) stopWatch();
          setWatchOpen(false);
        }}
        onStop={stopWatch}
        onRestart={restartWatch}
      />
    </EnvironmentalDashboardShell>
  );
};

export default ForestIntegrityPage;
