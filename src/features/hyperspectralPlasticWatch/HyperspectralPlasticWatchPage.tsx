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
import PlasticEvidencePacketPanel from './components/PlasticEvidencePacketPanel';
import PaceSatelliteMetadataCard from './components/PaceSatelliteMetadataCard';
import PlasticLayerControl from './components/PlasticLayerControl';
import PlasticRiskSummaryCards from './components/PlasticRiskSummaryCards';
import PlasticWatchAutomationPanel from './components/PlasticWatchAutomationPanel';
import SpectralSignaturePanel from './components/SpectralSignaturePanel';
import { WATCH_DEEP_LINK_HASH } from '../../../utils/appRoutes';
import EnvironmentalDashboardShell from '../environmentalIntelligence/shared/EnvironmentalDashboardShell';
import EnvironmentalDisclaimerBar from '../environmentalIntelligence/shared/EnvironmentalDisclaimerBar';
import EnvironmentalProviderStatusStrip from '../environmentalIntelligence/shared/EnvironmentalProviderStatusStrip';
import InvestorDemoExplainer from '../environmentalIntelligence/shared/InvestorDemoExplainer';
import { getDemoScenarioById } from '../environmentalIntelligence/shared/demoScenarios';
import type { EnvironmentalProviderStripItem } from '../environmentalIntelligence/shared/EnvironmentalProviderStatusStrip';
import type { EnvironmentalProviderUiState } from '../environmentalIntelligence/shared/environmentalServiceStatus';
import {
  clearHyperspectralPlasticScanCache,
  getDroneValidationStatus,
  getHyperspectralPlasticProviderStatus,
  getHyperspectralPlasticScan,
  postDroneValidationPrepare,
  postHyperspectralPlasticEvidencePacket,
} from './services/hyperspectralPlasticApi';
import type {
  DroneValidationPrepareResponse,
  HyperspectralPlasticProviderStatusResponse,
  HyperspectralPlasticScanResponse,
  PlasticEnvironmentType,
  PlasticEvidencePacketResponse,
  PlasticMapLayers,
  PlasticProviderState,
  PlasticWatchStep,
  ProviderReadinessCard,
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

function stepTone(status: PlasticWatchStep['status']): string {
  if (status === 'complete') return 'bg-emerald-500';
  if (status === 'running') return 'bg-emerald-600 animate-pulse';
  if (status === 'warning') return 'bg-amber-500';
  if (status === 'failed') return 'bg-rose-500';
  if (status === 'skipped') return 'bg-slate-400';
  return 'bg-slate-300';
}

function providerStepStatus(s: PlasticProviderState): PlasticWatchStep['status'] {
  if (s === 'available' || s === 'ready') return 'complete';
  if (s === 'auth_error' || s === 'failed') return 'failed';
  if (s === 'rate_limited') return 'warning';
  if (s === 'needs_credentials' || s === 'not_enabled' || s === 'no_scene' || s === 'unavailable' || s === 'not_configured')
    return 'warning';
  return 'warning';
}

function mapReadinessCardToUi(
  card: ProviderReadinessCard | undefined,
): EnvironmentalProviderUiState {
  if (!card) return 'unavailable';
  switch (card.status) {
    case 'not_enabled':
      return 'not_enabled';
    case 'needs_credentials':
      return 'needs_credentials';
    case 'ready':
      return 'ready';
    case 'error':
      return 'failed';
    case 'available':
      return 'available';
    case 'partial':
      return 'partial';
    case 'unavailable':
      return 'unavailable';
    case 'ready_to_connect':
      return 'ready_to_connect';
    case 'provider_api_missing':
      return 'provider_api_missing';
    case 'provider_api_ready':
      return 'provider_api_ready';
    default:
      return 'preview';
  }
}

function mapPlasticLane(s: PlasticProviderState | undefined): EnvironmentalProviderUiState {
  if (!s) return 'unavailable';
  if (s === 'available' || s === 'ready') return 'available';
  if (s === 'not_enabled') return 'not_enabled';
  if (s === 'not_configured') return 'not_configured';
  if (s === 'needs_credentials') return 'needs_credentials';
  if (s === 'no_scene') return 'unavailable';
  if (s === 'auth_error') return 'auth_error';
  if (s === 'rate_limited') return 'rate_limited';
  if (s === 'failed') return 'failed';
  return 'unavailable';
}

function mapFallbackScanState(s: PlasticProviderState | undefined): EnvironmentalProviderUiState {
  if (!s) return 'unavailable';
  if (s === 'available') return 'available';
  if (s === 'no_scene') return 'partial';
  if (s === 'not_enabled' || s === 'not_configured') return 'unavailable';
  return mapPlasticLane(s);
}

function initialSteps(): PlasticWatchStep[] {
  return [
    {
      id: 'aoi',
      title: 'Confirm AOI on map',
      status: 'pending',
      explanation: 'Lock map center, radius, date window, and environment context.',
    },
    {
      id: 'providerReadiness',
      title: 'Check provider readiness snapshot',
      status: 'pending',
      provider: 'DPAL API',
      explanation: 'PACE/EMIT/Sentinel-Landsat gates from provider-status endpoint.',
    },
    {
      id: 'droneReadiness',
      title: 'Check drone validation connector',
      status: 'pending',
      provider: 'Drone connector',
      explanation: 'Manual, upload, API, or flight-plan hook mode — no dispatch without provider confirmation.',
    },
    {
      id: 'pace',
      title: 'Check PACE scene availability',
      status: 'pending',
      provider: 'NASA PACE',
      explanation: 'Ocean color lane status from API host.',
    },
    {
      id: 'emit',
      title: 'Check EMIT scene availability',
      status: 'pending',
      provider: 'NASA EMIT',
      explanation: 'Hyperspectral VNIR/SWIR lane status from API host.',
    },
    {
      id: 'fallback',
      title: 'Pull Sentinel/Landsat fallback context',
      status: 'pending',
      provider: 'Earth Observation',
      explanation: 'Broadband context only — not plastic-specific proof.',
    },
    {
      id: 'spectral',
      title: 'Analyze spectral-risk indicators',
      status: 'pending',
      provider: 'DPAL screening',
      explanation: 'Possible plastic-risk anomaly vs generic change context.',
    },
    {
      id: 'confounders',
      title: 'Check confounders: algae, turbidity, sediment, foam, cloud/glint',
      status: 'pending',
      explanation: 'Qualitative confounder screening only.',
    },
    {
      id: 'score',
      title: 'Plastic-risk score status',
      status: 'pending',
      explanation: 'Narrow-band index extraction required before a numeric plastic-risk score can be emitted.',
    },
    {
      id: 'packet',
      title: 'Prepare evidence packet',
      status: 'pending',
      provider: 'DPAL API',
      explanation: 'POST normalized scan payload.',
    },
    {
      id: 'mission',
      title: 'Create field validation mission',
      status: 'pending',
      explanation: 'Manual validation workflow — automated queue not connected.',
    },
    {
      id: 'finalize',
      title: 'Create QR/hash-ready audit summary',
      status: 'pending',
      provider: 'SHA-256',
      explanation: 'Integrity hash for audit workflows.',
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

const ENV_OPTIONS: { id: PlasticEnvironmentType; label: string }[] = [
  { id: 'river', label: 'River' },
  { id: 'lake', label: 'Lake' },
  { id: 'coast', label: 'Coast' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'landfill_dumping', label: 'Landfill / dumping area' },
  { id: 'flood_debris', label: 'Flood debris zone' },
];

const HyperspectralPlasticWatchPage: React.FC<Props> = ({ onReturn }) => {
  const [label, setLabel] = useState('Plastic Watch AOI');
  const [searchText, setSearchText] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [center, setCenter] = useState({ lat: 14.5995, lng: 120.9842 });
  const [radiusKm, setRadiusKm] = useState(12);
  const [environmentType, setEnvironmentType] = useState<PlasticEnvironmentType>('coast');
  const [baselineDay, setBaselineDay] = useState(() => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [currentDay, setCurrentDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [activePreset, setActivePreset] = useState<PresetId | null>('6m');

  const [layers, setLayers] = useState<PlasticMapLayers>({
    satellite: true,
    labels: true,
    aoiCircle: true,
    paceOceanColor: true,
    emitHyperspectral: true,
    plasticRiskAnomaly: true,
    turbiditySediment: true,
    chlorophyllAlgae: true,
    floatingDebrisCandidate: true,
    fieldValidationPoints: true,
    cleanupMissionPins: false,
    droneValidationPoints: false,
  });
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const layerMenuRef = useRef<HTMLDivElement | null>(null);
  const mapWrapRef = useRef<HTMLDivElement | null>(null);

  const [providerStatus, setProviderStatus] = useState<HyperspectralPlasticProviderStatusResponse | null>(null);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);

  const [watchOpen, setWatchOpen] = useState(false);
  const [watchLogLines, setWatchLogLines] = useState<string[]>([]);
  const [steps, setSteps] = useState<PlasticWatchStep[]>(() => initialSteps());
  const [isRunning, setIsRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<HyperspectralPlasticScanResponse | null>(null);
  const [evidence, setEvidence] = useState<PlasticEvidencePacketResponse | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [dronePrepare, setDronePrepare] = useState<DroneValidationPrepareResponse | null>(null);
  const [droneBusy, setDroneBusy] = useState(false);

  const watchRunIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const watchCtaRef = useRef<HTMLButtonElement | null>(null);

  const baselineIso = useMemo(() => isoFromDateInput(baselineDay, false), [baselineDay]);
  const currentIso = useMemo(() => isoFromDateInput(currentDay, true), [currentDay]);

  const googleMapsFrontendConfigured = useMemo(
    () =>
      Boolean(
        typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'string' &&
          import.meta.env.VITE_GOOGLE_MAPS_API_KEY.trim().length > 0,
      ),
    [],
  );

  const providerStripItems = useMemo((): EnvironmentalProviderStripItem[] => {
    const ps = providerStatus;
    const scan = lastScan;

    let pace: EnvironmentalProviderUiState = ps ? mapReadinessCardToUi(ps.pace) : 'unavailable';
    let emit: EnvironmentalProviderUiState = ps ? mapReadinessCardToUi(ps.emit) : 'unavailable';
    let fallback: EnvironmentalProviderUiState = ps ? mapReadinessCardToUi(ps.sentinelLandsat) : 'unavailable';
    let drone: EnvironmentalProviderUiState = ps ? mapReadinessCardToUi(ps.drone) : 'unavailable';

    if (scan) {
      pace = mapPlasticLane(scan.providers.pace.status);
      emit = mapPlasticLane(scan.providers.emit.status);
      fallback = mapFallbackScanState(scan.providers.sentinelLandsatFallback.status);
      drone = mapReadinessCardToUi({
        enabled: true,
        configured: true,
        status: scan.providers.drone.status,
        label: 'Drone Validation',
        message: scan.providers.drone.message,
      } as ProviderReadinessCard);
    }

    const notesHint = ps?.notes?.length ? ps.notes.join(' · ').slice(0, 200) : undefined;

    return [
      {
        id: 'gmaps',
        label: 'Google Maps',
        state: googleMapsFrontendConfigured ? 'configured' : 'not_configured',
        hint: googleMapsFrontendConfigured
          ? 'Browser map UI key present (value never shown)'
          : 'Google Maps key not configured. Use coordinates or fallback map.',
      },
      { id: 'pace', label: 'PACE', state: pace, hint: scan?.providers.pace.message ?? ps?.pace.message ?? notesHint },
      { id: 'emit', label: 'EMIT', state: emit, hint: scan?.providers.emit.message ?? ps?.emit.message ?? notesHint },
      {
        id: 'sentinel',
        label: 'Sentinel / Landsat fallback',
        state: fallback,
        hint: scan?.providers.sentinelLandsatFallback.message ?? ps?.sentinelLandsat.message ?? 'Broadband context only',
      },
      {
        id: 'field',
        label: 'Field validation',
        state: 'partial',
        hint: 'Manual sampling workflow — required before escalation or enforcement use',
      },
      {
        id: 'drone',
        label: 'Drone validation',
        state: drone,
        hint: scan?.providers.drone.message ?? ps?.drone.message ?? 'Connector-ready — configure server env for API dispatch',
      },
    ];
  }, [googleMapsFrontendConfigured, lastScan, providerStatus]);

  const plasticInvestorExplainerEl = useMemo(() => {
    const scenario = getDemoScenarioById('demo-plastic-manila-bay');
    if (!scenario) return null;

    const afterScan = lastScan?.ok === true;
    const pace = lastScan?.providers.pace;
    const paceGranules = pace?.scenes?.length ?? 0;

    const whatYouAreSeeing = afterScan
      ? `Live scan response loaded (${lastScan.scanId}). PACE lane reports ${pace?.status ?? '—'}. ${
          paceGranules > 0
            ? `NASA CMR lists ${paceGranules} PACE granule metadata record(s) for this AOI — satellite observations found, not plastic classification.`
            : (pace?.message ?? 'See the PACE Satellite Metadata card for lane details.')
        }`
      : 'A Hyperspectral Plastic Watch workspace ready for AOI review. Map, AOI controls, environment type, and the Watch DPAL Work panel are visible — run Watch DPAL Work or Manual scan to retrieve NASA CMR metadata for PACE / EMIT.';

    const signalSummary = afterScan
      ? `${lastScan.plasticRisk.message} (${lastScan.plasticRisk.status.replace(/_/g, ' ')}). Spectral extraction is not implemented in this build — field validation is required before attribution.`
      : 'No scan has run yet — PACE, EMIT, and Sentinel / Landsat fallback lanes will report scene availability after Watch DPAL Work.';

    const confidenceNote = afterScan
      ? 'Plastic-risk score is not computed from imagery in this build when indices are pending. Narrow-band metadata confirms catalog hits, not plastic presence.'
      : 'Plastic-risk evidence score (0–100) is withheld until narrow-band processing is wired. Narrow-band confirmation requires configured EMIT / PACE plus field validation.';

    return (
      <InvestorDemoExplainer
        title={scenario.title}
        moduleLabel={scenario.moduleLabel}
        whatYouAreSeeing={whatYouAreSeeing}
        whyItMatters={scenario.investorExplanation}
        honestyNote={scenario.limitationNote}
        nextAction={scenario.recommendedNextAction}
        accent={scenario.accent}
        evidencePreview={{
          location: scenario.locationLabel,
          timestampLabel: afterScan
            ? `Scan window: ${lastScan.aoi.baselineDate.slice(0, 10)} → ${lastScan.aoi.currentDate.slice(0, 10)}`
            : 'Baseline / current window — set in the side panel before scan.',
          providerSources: scenario.providerSources,
          signalSummary,
          confidenceNote,
          fieldValidationStatus:
            'Field sampling, drone validation, and water-quality context are required to escalate any anomaly.',
          qrHashStatus: 'SHA-256 integrity hash is issued after the evidence packet is accepted server-side.',
          recommendedAction: scenario.recommendedNextAction,
        }}
      />
    );
  }, [lastScan]);

  const pushLog = useCallback((line: string) => {
    const ts = new Date().toISOString().slice(11, 19);
    setWatchLogLines((prev) => [...prev.slice(-200), `[${ts}Z] ${line}`]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getHyperspectralPlasticProviderStatus();
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

  const patchStep = useCallback((id: string, patch: Partial<PlasticWatchStep>) => {
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
    clearHyperspectralPlasticScanCache();
  }, []);

  const applyPreset = useCallback(
    (pid: PresetId) => {
      setActivePreset(pid);
      const months = pid === '1m' ? 1 : pid === '3m' ? 3 : pid === '6m' ? 6 : 12;
      const end = new Date(currentDay + 'T12:00:00Z');
      const start = new Date(end);
      start.setUTCMonth(start.getUTCMonth() - months);
      setBaselineDay(start.toISOString().slice(0, 10));
    },
    [currentDay],
  );

  const onBaselineChange = (v: string) => {
    setBaselineDay(v);
    setActivePreset(null);
  };
  const onCurrentChange = (v: string) => {
    setCurrentDay(v);
    setActivePreset(null);
  };

  const scanParams = useMemo(
    () => ({
      lat: center.lat,
      lng: center.lng,
      label,
      radiusKm,
      baselineDate: baselineIso,
      currentDate: currentIso,
      environmentType,
      quickPreset: activePreset,
    }),
    [activePreset, baselineIso, center.lat, center.lng, currentIso, environmentType, label, radiusKm],
  );

  const runManualScan = useCallback(async () => {
    setLastError(null);
    setCacheNotice(null);
    try {
      const { data, fromCache } = await getHyperspectralPlasticScan(
        { ...scanParams, bypassCache: true },
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
  }, [scanParams]);

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
      patchStep('aoi', { status: 'running', explanation: 'Validating AOI and environment type.', at: new Date().toISOString() });
      await delay(200, ac.signal);
      if (!assertRun()) return;
      patchStep('aoi', {
        status: 'complete',
        explanation: 'AOI locked for this run.',
        detail: `${label} @ ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)} — r=${radiusKm} km — ${environmentType}`,
        at: new Date().toISOString(),
      });
      pushLog(`AOI confirmed (${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}), radius ${radiusKm} km.`);

      patchStep('providerReadiness', { status: 'running', at: new Date().toISOString() });
      const freshStatus = await getHyperspectralPlasticProviderStatus(ac.signal);
      if (!assertRun()) return;
      setProviderStatus(freshStatus);
      patchStep('providerReadiness', {
        status: 'complete',
        explanation: 'Provider readiness snapshot refreshed from API.',
        detail: `PACE=${freshStatus.pace.status} · EMIT=${freshStatus.emit.status} · Fallback=${freshStatus.sentinelLandsat.status} · Drone=${freshStatus.drone.status}`,
        at: new Date().toISOString(),
      });
      pushLog(`Provider readiness: PACE ${freshStatus.pace.status}, EMIT ${freshStatus.emit.status}, Landsat fallback ${freshStatus.sentinelLandsat.status}.`);

      patchStep('droneReadiness', { status: 'running', at: new Date().toISOString() });
      const droneSnap = await getDroneValidationStatus(ac.signal);
      if (!assertRun()) return;
      patchStep('droneReadiness', {
        status: 'complete',
        explanation: droneSnap.message,
        detail: `mode=${droneSnap.mode} · connector=${droneSnap.status}`,
        at: new Date().toISOString(),
      });
      pushLog(`Drone connector: ${droneSnap.status} (${droneSnap.mode}) — ${droneSnap.message}`);

      patchStep('pace', { status: 'running', at: new Date().toISOString() });
      patchStep('emit', { status: 'running', at: new Date().toISOString() });
      patchStep('fallback', { status: 'running', at: new Date().toISOString() });

      const { data, fromCache } = await getHyperspectralPlasticScan({ ...scanParams, bypassCache: true }, ac.signal);
      if (!assertRun()) return;

      setLastScan(data);
      setCacheNotice(fromCache ? 'Scan result: short client cache hit for identical AOI/window.' : null);
      pushLog('Hyperspectral plastic watch scan response received from API (POST).');

      const p = data.providers.pace;
      patchStep('pace', {
        status: providerStepStatus(p.status),
        explanation: p.message,
        detail:
          p.scenes?.length != null && p.scenes.length > 0
            ? `NASA CMR scenes=${p.scenes.length} (metadata only)`
            : p.sceneDate
              ? `sceneDate=${p.sceneDate}`
              : `status=${p.status}`,
        at: new Date().toISOString(),
      });
      pushLog(`PACE: ${p.status} — ${p.message}`);

      const em = data.providers.emit;
      patchStep('emit', {
        status: providerStepStatus(em.status),
        explanation: em.message,
        detail:
          em.scenes?.length != null && em.scenes.length > 0
            ? `NASA CMR scenes=${em.scenes.length} (metadata only)`
            : `status=${em.status}`,
        at: new Date().toISOString(),
      });
      pushLog(`EMIT: ${em.status} — ${em.message}`);

      const fb = data.providers.sentinelLandsatFallback;
      patchStep('fallback', {
        status: fb.status === 'available' ? 'complete' : providerStepStatus(fb.status),
        explanation: fb.message,
        at: new Date().toISOString(),
      });
      pushLog(`Landsat/Sentinel context: ${fb.status} — ${fb.message}`);

      patchStep('spectral', {
        status: 'complete',
        explanation: data.spectralSignals.notes.join(' ') || 'Spectral context summarized.',
        detail: `plasticRiskSignal=${data.spectralSignals.plasticRiskSignal} · claims=${data.evidencePacket.claimsLevel}`,
        at: new Date().toISOString(),
      });

      const wc = data.spectralSignals.waterConfounders;
      patchStep('confounders', {
        status: 'complete',
        explanation: 'Water quality confounders evaluated as qualitative screening only.',
        detail: `algae=${wc.algae}; turbidity=${wc.turbidity}; sediment=${wc.sediment}; clouds=${wc.cloudsGlint}`,
        at: new Date().toISOString(),
      });

      const pr = data.plasticRisk;
      patchStep('score', {
        status: pr.score == null ? 'warning' : 'complete',
        explanation:
          pr.score == null
            ? `${pr.message} (${pr.status})`
            : `Plastic-risk score ${pr.score} — ${data.riskLevel.replace(/_/g, ' ')}`,
        at: new Date().toISOString(),
      });
      pushLog(`Plastic-risk: ${pr.status} — ${pr.message}`);

      patchStep('packet', { status: 'running', explanation: 'Posting evidence packet…', at: new Date().toISOString() });
      const ev = await postHyperspectralPlasticEvidencePacket(data, ac.signal);
      if (!assertRun()) return;
      setEvidence(ev);
      patchStep('packet', {
        status: 'complete',
        explanation: 'Evidence packet accepted server-side.',
        at: new Date().toISOString(),
      });
      pushLog('Evidence packet prepared (server-side hash).');

      patchStep('mission', {
        status: 'warning',
        explanation: 'Field validation is operator-led; automated mission queue hooks are not enabled in this build.',
        at: new Date().toISOString(),
      });
      pushLog('Field validation mission: draft locally or use DPAL Missions when your deployment links the queue.');

      patchStep('finalize', {
        status: 'complete',
        explanation: 'Integrity hash ready for anchoring.',
        detail: ev.integrityHash,
        at: new Date().toISOString(),
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        pushLog('Watch stopped by operator.');
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
            s.status === 'running' || s.status === 'pending' ? { ...s, status: 'failed' as const, explanation: msg } : s,
          ),
        );
      }
    } finally {
      if (assertRun()) {
        setIsRunning(false);
        abortRef.current = null;
      }
    }
  }, [baselineIso, center.lat, center.lng, currentIso, environmentType, label, patchStep, pushLog, radiusKm, resetSteps, scanParams]);

  const handlePrepareDroneValidation = useCallback(async () => {
    setDroneBusy(true);
    setDronePrepare(null);
    try {
      const res = await postDroneValidationPrepare({
        lat: center.lat,
        lng: center.lng,
        radiusKm,
        siteLabel: label,
        reason: 'Possible plastic-risk anomaly review',
        requestedValidationTypes: [
          'photo',
          'video',
          'water-surface-observation',
          'shoreline-plastic-survey',
        ],
      });
      setDronePrepare(res);
    } catch (e) {
      setLastError(e instanceof Error ? e.message : 'Drone validation prepare failed');
    } finally {
      setDroneBusy(false);
    }
  }, [center.lat, center.lng, label, radiusKm]);

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

  const legendRows = useMemo(() => {
    const rows: { key: keyof PlasticMapLayers; label: string; color: string }[] = [
      { key: 'aoiCircle', label: 'AOI', color: 'bg-emerald-600' },
      { key: 'paceOceanColor', label: 'PACE (legend)', color: 'bg-sky-500' },
      { key: 'emitHyperspectral', label: 'EMIT (legend)', color: 'bg-violet-500' },
      { key: 'plasticRiskAnomaly', label: 'Plastic-risk anomaly', color: 'bg-fuchsia-500' },
      { key: 'turbiditySediment', label: 'Turbidity / sediment', color: 'bg-amber-600' },
      { key: 'chlorophyllAlgae', label: 'Chlorophyll / algae', color: 'bg-lime-600' },
      { key: 'floatingDebrisCandidate', label: 'Floating debris candidate', color: 'bg-orange-500' },
      { key: 'fieldValidationPoints', label: 'Field validation points', color: 'bg-emerald-700' },
      { key: 'cleanupMissionPins', label: 'Cleanup mission pins', color: 'bg-teal-600' },
      { key: 'droneValidationPoints', label: 'Drone validation points', color: 'bg-slate-500' },
      { key: 'satellite', label: 'Satellite base', color: 'bg-slate-600' },
    ];
    return rows.filter((row) => (row.key === 'aoiCircle' ? layers.aoiCircle : layers[row.key]));
  }, [layers]);

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
                  <span className="font-semibold text-slate-800">Hyperspectral Plastic Watch</span>
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
                    <ul className="space-y-2 text-slate-600">
                      <li className="font-mono text-[10px] text-slate-500">{providerStatus.pace.label}: {providerStatus.pace.status}</li>
                      <li className="font-mono text-[10px] text-slate-500">{providerStatus.emit.label}: {providerStatus.emit.status}</li>
                      <li className="font-mono text-[10px] text-slate-500">{providerStatus.sentinelLandsat.label}: {providerStatus.sentinelLandsat.status}</li>
                      <li className="font-mono text-[10px] text-slate-500">{providerStatus.drone.label}: {providerStatus.drone.status} ({providerStatus.drone.configured ? 'configured' : 'not configured'})</li>
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

      {providerStatus ? (
        <div className="shrink-0 border-b border-cyan-200 bg-cyan-50/90">
          <div className="mx-auto max-w-[1920px] px-4 py-2 text-[11px] leading-snug text-cyan-950">
            <span className="font-semibold">Next steps: </span>
            PACE/EMIT are connection-ready but stay inactive until you set{' '}
            <span className="font-mono">NASA_EARTHDATA_TOKEN</span> and enable{' '}
            <span className="font-mono">DPAL_PACE_SPECTRAL_ENABLED</span> /{' '}
            <span className="font-mono">DPAL_EMIT_L2A_ENABLED</span> on the API host to retrieve narrow-band CMR granule
            metadata. Drone validation is ready to connect through manual/upload mode or provider API configuration (
            <span className="font-mono">DPAL_DRONE_VALIDATION_ENABLED</span>,{' '}
            <span className="font-mono">DPAL_DRONE_PROVIDER_MODE</span>
            ). No live drone dispatch is implied until a provider confirms.
          </div>
        </div>
      ) : null}

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
                    placeholder="Search location or click map"
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
                Baseline date
                <input
                  type="date"
                  value={baselineDay}
                  onChange={(e) => onBaselineChange(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
              </label>
              <label className="text-[10px] font-medium text-slate-500">
                Current date
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

            <div className="mt-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">Environment type</p>
              <select
                value={environmentType}
                onChange={(e) => setEnvironmentType(e.target.value as PlasticEnvironmentType)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white"
              >
                {ENV_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <PlasticLayerControl layers={layers} onChange={setLayers} />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={isRunning}
                onClick={() => void runManualScan()}
                className="w-full rounded-lg bg-emerald-800 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-50"
              >
                Run scan
              </button>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => void executeWatch()}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-emerald-900 hover:bg-slate-50 disabled:opacity-50"
              >
                Watch DPAL Work
              </button>
              <button
                type="button"
                disabled={droneBusy || isRunning}
                onClick={() => void handlePrepareDroneValidation()}
                className="w-full rounded-lg border border-cyan-300 bg-cyan-50 py-2 text-xs font-semibold text-cyan-950 hover:bg-cyan-100 disabled:opacity-50"
              >
                Prepare Drone Validation
              </button>
              {dronePrepare ? (
                <div className="rounded-lg border border-cyan-200 bg-white p-2 text-[10px] text-slate-700 space-y-1">
                  <p className="font-semibold text-cyan-950">Request {dronePrepare.requestId}</p>
                  <p>
                    Status: <span className="font-mono">{dronePrepare.status}</span> · Mode:{' '}
                    <span className="font-mono">{dronePrepare.mode}</span>
                  </p>
                  <p className="text-slate-600">{dronePrepare.message}</p>
                  <p className="text-slate-500">Dispatched: {String(dronePrepare.dispatched)} (prepare-only endpoint)</p>
                </div>
              ) : null}
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

          {plasticInvestorExplainerEl}

          {!googleMapsFrontendConfigured ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Google Maps key not configured. Use coordinates or fallback map tiles; API keys are never shown in the UI.
            </div>
          ) : null}

          <div className="flex flex-col xl:flex-row gap-3 flex-1 min-h-0">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col flex-1 min-h-[320px] min-w-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-semibold text-slate-800">AOI map</p>
                <p className="text-[10px] text-slate-500">Click map to set center</p>
              </div>
              <div ref={mapWrapRef} className="relative flex-1 min-h-[380px]">
                <div className="h-[min(52vh,520px)] min-h-[380px] w-full">
                  <MapContainer
                    center={[center.lat, center.lng]}
                    zoom={9}
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
                      <li className="text-slate-500">All overlays hidden.</li>
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

            <aside className="w-full shrink-0 xl:w-[300px] xl:max-w-[320px] space-y-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-sm">
                <p className="text-xs font-semibold text-emerald-950">Watch DPAL Work</p>
                <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                  Starts only when you press the button. Opens the step log panel while the workflow runs.
                </p>
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => void executeWatch()}
                  className="mt-2 w-full rounded-lg bg-emerald-800 py-2 text-[11px] font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  Start Watch workflow
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 max-h-[min(52vh,480px)] overflow-y-auto shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Step status</p>
                <ul className="space-y-2">
                  {steps.map((s) => (
                    <li key={s.id} className="flex gap-2 text-[11px] text-slate-700">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${stepTone(s.status)}`} />
                      <span className="leading-snug">
                        <span className="font-semibold text-slate-900">{s.title}</span>
                        <span className="block text-slate-500 mt-0.5">{s.explanation}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>

          <PlasticRiskSummaryCards scan={lastScan} />
          <PaceSatelliteMetadataCard scan={lastScan} />
          <SpectralSignaturePanel scan={lastScan} />
          <PlasticEvidencePacketPanel scan={lastScan} evidence={evidence} />
        </main>
      </div>

      <EnvironmentalDisclaimerBar tone="amber">
        DPAL Hyperspectral Plastic Watch provides evidence-support signals only. Satellite spectral anomalies are not final
        proof of plastic pollution and must be reviewed with field sampling, drone imagery, water-quality context, and
        independent validation.
      </EnvironmentalDisclaimerBar>

      <PlasticWatchAutomationPanel
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

export default HyperspectralPlasticWatchPage;
