export type PlasticProviderState =
  | 'available'
  | 'unavailable'
  | 'not_configured'
  | 'no_scene'
  | 'auth_error'
  | 'rate_limited'
  | 'failed';

export type PlasticSpectralProviderBlock = {
  status: PlasticProviderState;
  message: string;
  sceneDate?: string | null;
  spectralRange?: string | null;
  limitations?: string[];
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
  };
  providers: {
    pace: PlasticSpectralProviderBlock;
    emit: PlasticSpectralProviderBlock;
    sentinelLandsatFallback: PlasticFallbackBlock;
  };
  spectralSignals: PlasticSpectralSignals;
  plasticRiskScore: number;
  riskLevel: string;
  evidenceItems: string[];
  limitations: string[];
  generatedAt: string;
};

export type HyperspectralPlasticProviderStatusResponse = {
  ok: true;
  generatedAt: string;
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
};
