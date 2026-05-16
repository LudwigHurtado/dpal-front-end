import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Settings,
} from '../../../components/icons';
import PlasticWatchAutomationPanel from './components/PlasticWatchAutomationPanel';
import { WATCH_DEEP_LINK_HASH } from '../../../utils/appRoutes';
import EnvironmentalDashboardShell from '../environmentalIntelligence/shared/EnvironmentalDashboardShell';
import { CarbonPuraContextBanner } from '../partners/carbonpura/components/CarbonPuraContextBanner';
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
  parseLocalizedNumber,
  plasticScanPendingStatusMessage,
  postDroneValidationPrepare,
  postHyperspectralPlasticEvidencePacket,
} from './services/hyperspectralPlasticApi';
import { mapQuickPresetToApi } from './services/plasticScanRequest';
import type {
  DroneValidationPrepareResponse,
  HyperspectralPlasticProviderStatusResponse,
  HyperspectralPlasticScanResponse,
  PlasticEnvironmentType,
  PlasticEvidencePacketResponse,
  PlasticMapLayers,
  PlasticProviderState,
  PlasticWatchStep,
  PlasticWatchTab,
  ProviderReadinessCard,
} from './types';
import PlasticWatchProjectInfoPanel from './components/PlasticWatchProjectInfoPanel';
import PlasticWatchChatPanel from './components/PlasticWatchChatPanel';
import { PlasticMissionHero } from './components/PlasticMissionHero';
import { PlasticMissionSelector } from './components/PlasticMissionSelector';
import { PlasticMissionStepper } from './components/PlasticMissionStepper';
import { PlasticAoiMapPanel } from './components/PlasticAoiMapPanel';
import { PlasticAiHelperPanel } from './components/PlasticAiHelperPanel';
import { PlasticSatelliteReadinessPanel } from './components/PlasticSatelliteReadinessPanel';
import { PlasticScanResultsPanel } from './components/PlasticScanResultsPanel';
import { PlasticPageExplainer } from './components/PlasticPageExplainer';
import PlasticEvidencePacketPanel from './components/PlasticEvidencePacketPanel';
import type { PlasticMissionTypeId } from './data/plasticMissionTypes';
import { getPlasticMissionType } from './data/plasticMissionTypes';
import {
  computeBoundingRadiusKm,
  computePolygonCentroid,
  parseManualPolygonJson,
  toPolygonGeoJSON,
  type LatLngPoint,
} from './utils/plasticAoiUtils';
import { computeMissionWorkflowSteps } from './utils/plasticMissionWorkflow';
import { PlasticWatchValueStrip } from './components/PlasticWatchValueStrip';

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

function plasticWatchSetupBannerBody(ps: HyperspectralPlasticProviderStatusResponse): React.ReactNode {
  const mono = (name: string) => <span className="font-mono">{name}</span>;

  const spectralSentence = (() => {
    if (ps.paceConfigured && ps.emitConfigured) return null;

    const needPace = !ps.paceConfigured;
    const needEmit = !ps.emitConfigured;

    if (needPace && needEmit) {
      if (ps.pace.status === 'needs_credentials' && ps.emit.status === 'needs_credentials') {
        return (
          <>
            PACE and EMIT are enabled on the API host but cannot query NASA CMR until you add {mono('NASA_EARTHDATA_TOKEN')}.
          </>
        );
      }
      return (
        <>
          PACE and EMIT stay inactive until you set {mono('NASA_EARTHDATA_TOKEN')} on the API host and enable{' '}
          {mono('DPAL_PACE_SPECTRAL_ENABLED')} and/or {mono('DPAL_EMIT_L2A_ENABLED')} so scans can retrieve narrow-band CMR granule metadata.
        </>
      );
    }

    if (needPace) {
      if (ps.pace.status === 'needs_credentials') {
        return (
          <>
            PACE lane is enabled — add {mono('NASA_EARTHDATA_TOKEN')} on the API host before narrow-band granule metadata can load.
          </>
        );
      }
      if (ps.emitConfigured) {
        return (
          <>
            Enable {mono('DPAL_PACE_SPECTRAL_ENABLED')} on the API host (Earthdata credentials are already configured) so PACE can retrieve narrow-band CMR granule metadata.
          </>
        );
      }
      return (
        <>
          Enable {mono('DPAL_PACE_SPECTRAL_ENABLED')} and {mono('NASA_EARTHDATA_TOKEN')} on the API host before PACE can retrieve narrow-band CMR granule metadata.
        </>
      );
    }

    if (needEmit) {
      if (ps.emit.status === 'needs_credentials') {
        return (
          <>
            EMIT lane is enabled — add {mono('NASA_EARTHDATA_TOKEN')} on the API host before EMIT L2A granule metadata can load.
          </>
        );
      }
      if (ps.paceConfigured) {
        return (
          <>
            Enable {mono('DPAL_EMIT_L2A_ENABLED')} on the API host (Earthdata credentials are already configured) so EMIT hyperspectral granule metadata can load via NASA CMR.
          </>
        );
      }
      return (
        <>
          Enable {mono('DPAL_EMIT_L2A_ENABLED')} and {mono('NASA_EARTHDATA_TOKEN')} on the API host before EMIT can retrieve hyperspectral granule metadata.
        </>
      );
    }

    return null;
  })();

  const droneSentence = ps.drone.configured ? (
    <>
      Drone validation connects through manual workflows, uploads, optional provider APIs, or flight-plan hooks (configure{' '}
      {mono('DPAL_DRONE_PROVIDER_MODE')} on the API host). Runs are prepare-only: no live drone dispatch until your provider confirms a flight or mission.
    </>
  ) : (
    <>
      Enable {mono('DPAL_DRONE_VALIDATION_ENABLED')} and set {mono('DPAL_DRONE_PROVIDER_MODE')} on the API host (
      <span className="font-mono">manual</span>, <span className="font-mono">upload</span>, <span className="font-mono">api</span>, or{' '}
      <span className="font-mono">flight_plan_hook</span>). For <span className="font-mono">api</span> mode, add provider URL and key server-side; dispatch still waits on provider confirmation — DPAL never implies an automated flight queue.
    </>
  );

  if (spectralSentence !== null) {
    return (
      <>
        {spectralSentence} {droneSentence}
      </>
    );
  }

  return droneSentence;
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

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
  const [activeTab, setActiveTab] = useState<PlasticWatchTab>('overview');
  const [missionTypeId, setMissionTypeId] = useState<PlasticMissionTypeId>('ocean_floating');
  const [drawingPolygon, setDrawingPolygon] = useState(false);
  const [polygonDraftPoints, setPolygonDraftPoints] = useState<LatLngPoint[]>([]);
  const [savedPolygonPoints, setSavedPolygonPoints] = useState<LatLngPoint[]>([]);
  const [manualPolygonJson, setManualPolygonJson] = useState('');
  const [manualPolygonError, setManualPolygonError] = useState<string | null>(null);
  const [showPageExplainer, setShowPageExplainer] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<string | null>(null);

  const hasSavedAoi = savedPolygonPoints.length >= 3;
  const polygonCentroid = useMemo(
    () => computePolygonCentroid(savedPolygonPoints) ?? center,
    [savedPolygonPoints, center],
  );
  const effectiveRadiusKm = useMemo(
    () => (hasSavedAoi ? computeBoundingRadiusKm(savedPolygonPoints) : radiusKm),
    [hasSavedAoi, radiusKm, savedPolygonPoints],
  );

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
    const paceReturned = pace?.returnedCount ?? pace?.scenes?.length ?? 0;
    const paceTotal = pace?.totalHits;
    const pacePageLimited = pace?.isPageLimited === true;

    const whatYouAreSeeing = afterScan
      ? `Live scan response loaded (${lastScan.scanId}). PACE lane reports ${pace?.status ?? '—'}. ${
          paceReturned > 0
            ? paceTotal != null && paceTotal > paceReturned
              ? `NASA CMR returned ${paceReturned} of ${paceTotal} matching PACE granule metadata record(s) for this AOI — not plastic classification.`
              : pacePageLimited
                ? `NASA CMR returned the first ${paceReturned} matching PACE granule(s) on this page — page-limited; more observations may exist in the catalog.`
                : `NASA CMR returned ${paceReturned} matching PACE granule metadata record(s) for this AOI — satellite observations found, not plastic classification.`
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
      <PlasticWatchProjectInfoPanel
        title={scenario.title}
        subtitle={scenario.locationLabel}
        defaultOpen
      >
        <InvestorDemoExplainer
          title={scenario.title}
          moduleLabel={scenario.moduleLabel}
          whatYouAreSeeing={whatYouAreSeeing}
          whyItMatters={scenario.investorExplanation}
          honestyNote={scenario.limitationNote}
          nextAction={scenario.recommendedNextAction}
          accent={scenario.accent}
          className="border-0 shadow-none rounded-none"
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
      </PlasticWatchProjectInfoPanel>
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
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [settingsOpen]);

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

  const scanParams = useMemo(() => {
    const geo = hasSavedAoi ? toPolygonGeoJSON(savedPolygonPoints) : null;
    return {
      lat: polygonCentroid.lat,
      lng: polygonCentroid.lng,
      label,
      radiusKm: effectiveRadiusKm,
      baselineDate: baselineDay,
      currentDate: currentDay,
      environmentType,
      quickPreset: mapQuickPresetToApi(activePreset),
      polygon: hasSavedAoi ? savedPolygonPoints.map((p) => [p.lng, p.lat]) : null,
      aoiGeoJson: geo,
    };
  }, [
    activePreset,
    baselineDay,
    currentDay,
    effectiveRadiusKm,
    environmentType,
    hasSavedAoi,
    label,
    polygonCentroid.lat,
    polygonCentroid.lng,
    savedPolygonPoints,
  ]);

  const workflowSteps = useMemo(
    () =>
      computeMissionWorkflowSteps({
        missionTypeSelected: true,
        savedPolygon: savedPolygonPoints,
        drawingPolygon,
        providerStatus,
        providerStatusError,
        isRunning,
        lastScan,
        evidence,
        lastError,
      }),
    [
      savedPolygonPoints,
      drawingPolygon,
      providerStatus,
      providerStatusError,
      isRunning,
      lastScan,
      evidence,
      lastError,
    ],
  );

  const plasticScanPendingNotice = useMemo(
    () => (lastScan ? plasticScanPendingStatusMessage(lastScan) : null),
    [lastScan],
  );

  const runManualScan = useCallback(async () => {
    if (!hasSavedAoi) {
      setLastError('Save a valid AOI polygon (at least 3 points) before running a scan.');
      return;
    }
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
      setActiveTab('results');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scan failed';
      if ((e as Error).name === 'AbortError') return;
      setLastError(msg);
    }
  }, [hasSavedAoi, scanParams]);

  const executeWatch = useCallback(async () => {
    if (!hasSavedAoi) {
      setLastError('Save a valid AOI polygon (at least 3 points) before Watch DPAL Work.');
      return;
    }
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
      setActiveTab('results');
      pushLog('Hyperspectral plastic watch scan response received from API (POST).');

      const p = data.providers.pace;
      const paceReturned = p.returnedCount ?? p.scenes?.length ?? 0;
      const paceTotal = p.totalHits;
      patchStep('pace', {
        status: providerStepStatus(p.status),
        explanation: p.message,
        detail:
          paceReturned > 0
            ? paceTotal != null && paceTotal > paceReturned
              ? `CMR returned=${paceReturned} of ${paceTotal} total (metadata only; pageSize=${p.pageSize ?? 20})`
              : p.isPageLimited
                ? `CMR returned=${paceReturned} on page (page-limited; pageSize=${p.pageSize ?? 20})`
                : `CMR returned=${paceReturned} granule(s) (metadata only)`
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
      const pendingIndex = data.riskLevel === 'pending_index_extraction' || pr.status === 'pending_index_extraction';
      patchStep('score', {
        status: pendingIndex || pr.score == null ? 'warning' : 'complete',
        explanation: pendingIndex
          ? plasticScanPendingStatusMessage(data) ?? pr.message
          : pr.score == null
            ? `${pr.message} (${pr.status})`
            : `Plastic-risk score ${pr.score} — ${data.riskLevel.replace(/_/g, ' ')}`,
        at: new Date().toISOString(),
      });
      pushLog(
        pendingIndex
          ? `Plastic-risk: metadata retrieved — index extraction pending (not a failed scan).`
          : `Plastic-risk: ${pr.status} — ${pr.message}`,
      );

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
  }, [baselineIso, center.lat, center.lng, currentIso, environmentType, hasSavedAoi, label, patchStep, pushLog, radiusKm, resetSteps, scanParams]);

  useEffect(() => {
    const mission = getPlasticMissionType(missionTypeId);
    setEnvironmentType(mission.environmentType);
  }, [missionTypeId]);

  const loadDemoMission = useCallback(() => {
    const scenario = getDemoScenarioById('demo-plastic-manila-bay');
    setMissionTypeId('beach_coastal');
    setLabel(scenario?.locationLabel ?? 'Manila Bay demo AOI');
    setCenter({ lat: 14.5995, lng: 120.9842 });
    setSavedPolygonPoints([
      { lat: 14.62, lng: 120.95 },
      { lat: 14.62, lng: 121.02 },
      { lat: 14.56, lng: 121.02 },
      { lat: 14.56, lng: 120.95 },
    ]);
    setPolygonDraftPoints([]);
    setDrawingPolygon(false);
    setActivePreset('6m');
    setLastScan(null);
    setEvidence(null);
    clearHyperspectralPlasticScanCache();
  }, []);

  const applyManualPolygon = useCallback(() => {
    const { points, error } = parseManualPolygonJson(manualPolygonJson);
    if (error) {
      setManualPolygonError(error);
      return;
    }
    setManualPolygonError(null);
    setSavedPolygonPoints(points);
    setPolygonDraftPoints([]);
    setDrawingPolygon(false);
    const c = computePolygonCentroid(points);
    if (c) setCenter(c);
  }, [manualPolygonJson]);

  const handleSavedPolygonChange = useCallback((points: LatLngPoint[]) => {
    setSavedPolygonPoints(points);
    setLastScan(null);
    setEvidence(null);
    clearHyperspectralPlasticScanCache();
    const c = computePolygonCentroid(points);
    if (c) setCenter(c);
    setRadiusKm(computeBoundingRadiusKm(points));
  }, []);

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

  const leafletLayoutKey = useMemo(
    () =>
      JSON.stringify({
        lat: center.lat,
        lng: center.lng,
        radiusKm,
        satellite: layers.satellite,
        labels: layers.labels,
        aoiCircle: layers.aoiCircle,
        scanId: lastScan?.scanId ?? '',
        isRunning,
        watchOpen,
        settingsOpen,
        lastError: lastError ?? '',
        cacheNotice: cacheNotice ?? '',
        evidence: evidence !== null,
        providerBanner: Boolean(providerStatus),
      }),
    [
      center.lat,
      center.lng,
      radiusKm,
      layers.satellite,
      layers.labels,
      layers.aoiCircle,
      lastScan?.scanId,
      isRunning,
      watchOpen,
      settingsOpen,
      lastError,
      cacheNotice,
      evidence,
      providerStatus,
    ],
  );

  const legendRows = useMemo(() => {
    const rows: { key: keyof PlasticMapLayers; label: string; color: string }[] = [
      { key: 'aoiCircle', label: 'AOI', color: 'bg-emerald-600' },
      { key: 'paceOceanColor', label: 'PACE (legend only)', color: 'bg-sky-500' },
      { key: 'emitHyperspectral', label: 'EMIT (legend only)', color: 'bg-violet-500' },
      { key: 'plasticRiskAnomaly', label: 'Plastic-risk (legend)', color: 'bg-fuchsia-500' },
      { key: 'turbiditySediment', label: 'Turbidity (legend)', color: 'bg-amber-600' },
      { key: 'chlorophyllAlgae', label: 'Chlorophyll (legend)', color: 'bg-lime-600' },
      { key: 'floatingDebrisCandidate', label: 'Debris candidate (legend)', color: 'bg-orange-500' },
      { key: 'fieldValidationPoints', label: 'Field validation (legend)', color: 'bg-emerald-700' },
      { key: 'cleanupMissionPins', label: 'Cleanup pins (legend)', color: 'bg-teal-600' },
      { key: 'droneValidationPoints', label: 'Drone validation (legend)', color: 'bg-slate-500' },
      { key: 'satellite', label: 'Satellite base', color: 'bg-slate-600' },
    ];
    return rows.filter((row) => (row.key === 'aoiCircle' ? layers.aoiCircle : layers[row.key]));
  }, [layers]);

  return (
    <EnvironmentalDashboardShell>
      <div className="mx-auto max-w-[1920px] px-4 pt-2 pb-0">
        <CarbonPuraContextBanner moduleLabel="Hyperspectral Plastic Watch / PACE Intelligence" />
      </div>
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
            <span className="font-semibold">Operator setup: </span>
            <span className="text-slate-700">
              Optional server configuration for live PACE/EMIT lanes — scans still run with honest fallback messages when
              lanes are off.{' '}
            </span>
            {plasticWatchSetupBannerBody(providerStatus)}
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-[1920px] flex-1 grid-cols-1 gap-4 px-4 py-3 xl:grid-cols-12">
        <aside className="space-y-3 xl:col-span-3">
          <PlasticMissionStepper
            steps={workflowSteps}
            activeStepId={activeWorkflowStep}
            onStepClick={setActiveWorkflowStep}
          />
          <PlasticMissionSelector selectedId={missionTypeId} onSelect={setMissionTypeId} />
          <MissionDateControls
            baselineDay={baselineDay}
            currentDay={currentDay}
            activePreset={activePreset}
            onBaselineChange={onBaselineChange}
            onCurrentChange={onCurrentChange}
            onApplyPreset={applyPreset}
          />
          <MissionScanActions
            hasSavedAoi={hasSavedAoi}
            isRunning={isRunning}
            droneBusy={droneBusy}
            onWatch={() => void executeWatch()}
            onScan={() => void runManualScan()}
            onDrone={() => void handlePrepareDroneValidation()}
            dronePrepare={dronePrepare}
          />
          {plasticInvestorExplainerEl}
        </aside>

        <main className="min-w-0 space-y-3 xl:col-span-6">
          <PlasticAoiMapPanel
            center={center}
            onCenterChange={setCenter}
            layers={layers}
            onLayersChange={setLayers}
            drawingPolygon={drawingPolygon}
            onDrawingPolygonChange={setDrawingPolygon}
            draftPoints={polygonDraftPoints}
            onDraftPointsChange={setPolygonDraftPoints}
            savedPoints={savedPolygonPoints}
            onSavedPointsChange={handleSavedPolygonChange}
            aoiLabel={label}
            onAoiLabelChange={setLabel}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBusy={searchBusy}
            searchNotice={searchNotice}
            onSearch={() => void submitSearch()}
            manualPolygonJson={manualPolygonJson}
            onManualPolygonJsonChange={setManualPolygonJson}
            manualPolygonError={manualPolygonError}
            onApplyManualPolygon={applyManualPolygon}
            scanDisabled={!hasSavedAoi || isRunning}
            scanBusy={isRunning}
            onRunScan={() => void runManualScan()}
            layoutKey={leafletLayoutKey}
          />
          <MissionAlerts
            lastError={lastError}
            cacheNotice={cacheNotice}
            plasticScanPendingNotice={plasticScanPendingNotice}
            googleMapsConfigured={googleMapsFrontendConfigured}
          />
          <PlasticSatelliteReadinessPanel
            missionTypeId={missionTypeId}
            hasSavedAoi={hasSavedAoi}
            baselineDay={baselineDay}
            currentDay={currentDay}
            providerStatus={providerStatus}
            providerStatusError={providerStatusError}
            lastScan={lastScan}
          />
          <PlasticScanResultsPanel
            scan={lastScan}
            evidence={evidence}
            cacheNotice={cacheNotice}
            onOpenChat={() => setActiveTab('chat')}
          />
          <PlasticEvidencePacketPanel scan={lastScan} evidence={evidence} />
        </main>

        <aside className="space-y-3 xl:col-span-3">
          <PlasticAiHelperPanel
            missionTypeId={missionTypeId}
            scan={lastScan}
            evidence={evidence}
            hasSavedAoi={hasSavedAoi}
          />
          <PlasticWatchChatPanel scan={lastScan} evidence={evidence} aoiLabel={label || undefined} />
        </aside>
      </div>

      <div className="mx-auto max-w-[1920px] space-y-3 px-4 pb-2 pt-2">
        <PlasticMissionHero
          onStartMission={() => {
            setDrawingPolygon(true);
            setPolygonDraftPoints([]);
            setShowPageExplainer(false);
          }}
          onDrawArea={() => {
            setDrawingPolygon(true);
            setPolygonDraftPoints([]);
          }}
          onLoadDemo={() => loadDemoMission()}
          onExplainPage={() => setShowPageExplainer(true)}
        />
        <PlasticWatchValueStrip />
        {showPageExplainer ? <PlasticPageExplainer /> : null}
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

function MissionDateControls({
  baselineDay,
  currentDay,
  activePreset,
  onBaselineChange,
  onCurrentChange,
  onApplyPreset,
}: {
  baselineDay: string;
  currentDay: string;
  activePreset: PresetId | null;
  onBaselineChange: (v: string) => void;
  onCurrentChange: (v: string) => void;
  onApplyPreset: (id: PresetId) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-slate-900">Date range</h3>
      <div className="mt-2 grid grid-cols-1 gap-2">
        <label className="text-[10px] font-medium text-slate-500">
          Baseline
          <input
            type="date"
            value={baselineDay}
            onChange={(e) => onBaselineChange(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
        </label>
        <label className="text-[10px] font-medium text-slate-500">
          Current
          <input
            type="date"
            value={currentDay}
            onChange={(e) => onCurrentChange(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
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
            onClick={() => onApplyPreset(id)}
            className={`rounded-lg px-2 py-1 text-[10px] font-semibold border ${
              activePreset === id
                ? 'border-sky-800 bg-sky-800 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {lab}
          </button>
        ))}
      </div>
    </div>
  );
}

function motionDateGrid({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 grid grid-cols-1 gap-2">{children}</div>;
}

function MissionScanActions({
  hasSavedAoi,
  isRunning,
  droneBusy,
  onWatch,
  onScan,
  onDrone,
  dronePrepare,
}: {
  hasSavedAoi: boolean;
  isRunning: boolean;
  droneBusy: boolean;
  onWatch: () => void;
  onScan: () => void;
  onDrone: () => void;
  dronePrepare: DroneValidationPrepareResponse | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
      <h3 className="text-xs font-semibold text-slate-900">Run mission</h3>
      {!hasSavedAoi ? (
        <p className="text-[10px] text-amber-800">Save a polygon AOI (≥3 points) before scanning.</p>
      ) : null}
      <button
        type="button"
        disabled={!hasSavedAoi || isRunning}
        onClick={onWatch}
        className="w-full rounded-lg bg-sky-800 py-2.5 text-sm font-semibold text-white hover:bg-sky-900 disabled:opacity-50"
      >
        Watch DPAL Work
      </button>
      <button
        type="button"
        disabled={!hasSavedAoi || isRunning}
        onClick={onScan}
        className="w-full rounded-lg border border-slate-300 py-2 text-sm font-semibold text-sky-900 hover:bg-slate-50 disabled:opacity-50"
      >
        Run scan only
      </button>
      <button
        type="button"
        disabled={droneBusy || isRunning}
        onClick={onDrone}
        className="w-full rounded-lg border border-cyan-300 bg-cyan-50 py-2 text-xs font-semibold text-cyan-950 disabled:opacity-50"
      >
        Prepare drone validation
      </button>
      {dronePrepare ? (
        <p className="text-[10px] text-slate-600">
          Drone request {dronePrepare.requestId} — {dronePrepare.status} (prepare-only)
        </p>
      ) : null}
    </div>
  );
}

function MissionAlerts({
  lastError,
  cacheNotice,
  plasticScanPendingNotice,
  googleMapsConfigured,
}: {
  lastError: string | null;
  cacheNotice: string | null;
  plasticScanPendingNotice: string | null;
  googleMapsConfigured: boolean;
}) {
  return (
    <>
      {lastError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{lastError}</div>
      ) : null}
      {cacheNotice ? (
        <div className="rounded-lg border px-3 py-2 text-sm border-cyan-200 bg-cyan-50 text-cyan-900">{cacheNotice}</div>
      ) : null}
      {plasticScanPendingNotice ? (
        <div className="rounded-lg border px-3 py-2 text-sm border-amber-200 bg-amber-50 text-amber-950">{plasticScanPendingNotice}</div>
      ) : null}
      {!googleMapsConfigured ? (
        <div className="rounded-lg border px-3 py-2 text-sm border-amber-200 bg-amber-50 text-amber-950">
          Google Maps key not configured. Fallback map tiles are used; API keys are never shown in the UI.
        </div>
      ) : null}
    </>
  );
}

export default HyperspectralPlasticWatchPage;
