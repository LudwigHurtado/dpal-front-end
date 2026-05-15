export type PlasticProviderState =
  | 'available'
  | 'unavailable'
  | 'not_configured'
  | 'not_enabled'
  | 'needs_credentials'
  | 'ready'
  | 'no_scene'
  | 'auth_error'
  | 'rate_limited'
  | 'failed';

export type DpalHyperspectralScene = {
  provider: 'PACE' | 'EMIT';
  collection: string;
  conceptId: string;
  title: string;
  startTime: string;
  endTime: string;
  cloudCover: number | null;
  spatial: Record<string, unknown>;
  links: Array<{ href: string; rel?: string }>;
  source: 'NASA CMR';
};

/** Compact CMR scene row (optional `compact=true` scan responses). */
export type DpalHyperspectralCompactScene = {
  provider: 'PACE' | 'EMIT';
  collection: string;
  conceptId: string;
  title: string;
  startTime: string;
  endTime: string;
  cloudCover: number | null;
  source: 'NASA CMR';
  browseUrl?: string | null;
  dataUrl?: string | null;
};

export type PlasticSpectralProviderBlock = {
  status: PlasticProviderState;
  message: string;
  sceneDate?: string | null;
  spectralRange?: string | null;
  limitations?: string[];
  scenes?: Array<DpalHyperspectralScene | DpalHyperspectralCompactScene>;
  returnedCount?: number;
  totalHits?: number | null;
  pageSize?: number;
  isPageLimited?: boolean;
  queryShortName?: string;
  boundingBox?: string;
  temporal?: string;
};

export type PlasticDroneProviderBlock = {
  status: string;
  mode: 'manual' | 'upload' | 'api' | 'flight_plan_hook';
  message: string;
};

export type PlasticFallbackBlock = {
  status: PlasticProviderState;
  message: string;
  sceneDate?: string | null;
  limitations?: string[];
};

export type PlasticWaterConfounders = {
  algae: 'low' | 'moderate' | 'high' | 'unknown';
  turbidity: 'low' | 'moderate' | 'high' | 'unknown';
  sediment: 'low' | 'moderate' | 'high' | 'unknown';
  foam: 'unknown';
  cloudsGlint: 'low' | 'moderate' | 'high' | 'unknown';
};

export type PlasticSpectralSignals = {
  plasticRiskSignal: 'none' | 'weak_context' | 'possible_spectral_anomaly' | 'elevated_plastic_risk_signal';
  confidence: number;
  swirAnomaly: number | null;
  visibleAnomaly: number | null;
  waterConfounders: PlasticWaterConfounders;
  notes: string[];
};

export type PlasticEnvironmentType =
  | 'river'
  | 'lake'
  | 'coast'
  | 'ocean'
  | 'landfill_dumping'
  | 'flood_debris';

export type PlasticRiskBlock = {
  score: number | null;
  status: 'not_computed' | 'metadata_only' | 'pending_index_extraction';
  message: string;
};

export type ScanEvidencePacketBlock = {
  status: 'preview';
  claimsLevel: 'metadata_only' | 'narrow_band_metadata';
  limitations: string[];
  nextActions: string[];
};

export type HyperspectralPlasticScanResponse = {
  ok: true;
  scanId: string;
  label: string;
  aoi: {
    lat: number;
    lng: number;
    radiusKm: number;
    label: string;
    baselineDate: string;
    currentDate: string;
    environmentType: PlasticEnvironmentType;
    polygon?: unknown;
    quickPreset?: string | null;
    aoiGeoJson?: unknown;
  };
  providers: {
    pace: PlasticSpectralProviderBlock;
    emit: PlasticSpectralProviderBlock;
    sentinelLandsatFallback: PlasticFallbackBlock;
    drone: PlasticDroneProviderBlock;
  };
  spectralSignals: PlasticSpectralSignals;
  plasticRiskScore: number | null;
  riskLevel: string;
  plasticRisk: PlasticRiskBlock;
  evidencePacket: ScanEvidencePacketBlock;
  evidenceItems: string[];
  limitations: string[];
  generatedAt: string;
};

export type ProviderReadinessCard = {
  enabled: boolean;
  configured: boolean;
  status: string;
  label: string;
  message: string;
};

export type HyperspectralPlasticProviderStatusResponse = {
  ok: true;
  generatedAt: string;
  pace: ProviderReadinessCard;
  emit: ProviderReadinessCard;
  sentinelLandsat: ProviderReadinessCard;
  drone: ProviderReadinessCard;
  paceConfigured: boolean;
  emitConfigured: boolean;
  earthObservationLive: boolean;
  notes: string[];
};

export type PlasticEvidencePacketResponse = {
  ok: true;
  integrityHash: string;
  qrPayloadPreview: {
    type: string;
    integrityHash: string;
    scanId: unknown;
    label: unknown;
    generatedAt: string;
    plasticRiskScore?: unknown;
    plasticRisk?: unknown;
    riskLevel?: unknown;
  };
  packet: {
    kind?: string;
    generatedAt?: string;
    scan?: Record<string, unknown>;
    disclaimer?: string;
  } & Record<string, unknown>;
};

export type WatchStepStatus = 'pending' | 'running' | 'complete' | 'warning' | 'failed' | 'skipped';

export type PlasticWatchTab = 'aoi' | 'results' | 'evidence' | 'workflow';

export type PlasticWatchStep = {
  id: string;
  title: string;
  status: WatchStepStatus;
  provider?: string;
  explanation: string;
  detail?: string;
  at?: string;
};

export type PlasticMapLayers = {
  satellite: boolean;
  labels: boolean;
  aoiCircle: boolean;
  paceOceanColor: boolean;
  emitHyperspectral: boolean;
  plasticRiskAnomaly: boolean;
  turbiditySediment: boolean;
  chlorophyllAlgae: boolean;
  floatingDebrisCandidate: boolean;
  fieldValidationPoints: boolean;
  /** Legend-only until mission pins are wired to live data */
  cleanupMissionPins: boolean;
  /** Legend for drone validation connector (manual / API / hook) */
  droneValidationPoints: boolean;
};

export type DroneValidationPrepareResponse = {
  ok: true;
  status: string;
  mode: PlasticDroneProviderBlock['mode'];
  message: string;
  requestId: string;
  dispatched: false;
  payloadEcho: {
    lat: number;
    lng: number;
    radiusKm: number;
    siteLabel?: string;
    reason?: string;
    requestedValidationTypes?: string[];
  };
};

export type DroneValidationStatusResponse = {
  ok: true;
  generatedAt: string;
  enabled: boolean;
  configured: boolean;
  status: string;
  label: string;
  message: string;
  mode: PlasticDroneProviderBlock['mode'];
};
