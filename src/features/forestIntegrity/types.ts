export type ForestProviderState =
  | 'available'
  | 'unavailable'
  | 'not_configured'
  | 'failed'
  | 'cached'
  | 'auth_error'
  | 'rate_limited';

export type ForestIntegrityProviderBlock = {
  status: ForestProviderState;
  message: string;
  sceneDate?: string | null;
  alerts?: number | null;
  activeFires?: number | null;
  biomassEstimateMgPerHa?: number | null;
  integratedAlerts?: number | null;
  disturbanceAlerts?: number | null;
  datasetVersionsUsed?: string[];
  queriedAt?: string | null;
  limitations?: string[];
};

export type ForestIntegrityIndices = {
  ndvi: number | null;
  ndmi: number | null;
  nbr: number | null;
  ndviChange: number | null;
  ndmiChange: number | null;
  nbrChange: number | null;
};

export type ForestIntegrityScanResponse = {
  ok: true;
  scanId: string;
  label: string;
  aoi: {
    lat: number;
    lng: number;
    radiusKm: number;
    polygon?: unknown;
    baselineDate: string;
    currentDate: string;
  };
  providers: {
    sentinel: ForestIntegrityProviderBlock;
    gfw: ForestIntegrityProviderBlock;
    firms: ForestIntegrityProviderBlock;
    gedi: ForestIntegrityProviderBlock;
  };
  indices: ForestIntegrityIndices;
  forestIntegrityScore: number | null;
  riskLevel: string;
  evidenceItems: string[];
  limitations: string[];
  generatedAt: string;
  earthObservation?: Record<string, unknown>;
};

export type ForestProviderStatusResponse = {
  ok: true;
  generatedAt: string;
  earthObservationLive: boolean;
  nasaFirmsConfigured: boolean;
  gfwConfigured: boolean;
  gediImplemented: boolean;
  copernicusConfigured: boolean;
  notes: string[];
};

export type ForestEvidencePacketResponse = {
  ok: true;
  integrityHash: string;
  qrPayloadPreview: {
    type: string;
    integrityHash: string;
    scanId: unknown;
    label: unknown;
    generatedAt: string;
    gfwProviderStatus?: string;
    gfwAlertsCount?: number | null;
  };
  packet: {
    kind?: string;
    generatedAt?: string;
    scan?: Record<string, unknown>;
    gfw?: {
      gfwProviderStatus: string;
      gfwAlertsCount: number | null;
      gfwIntegratedAlertsCount: number | null;
      gfwDisturbanceAlertsCount: number | null;
      gfwDatasetVersionsUsed: string[];
      gfwQueriedAt: string | null;
      gfwLimitations: string[];
      gfwMessage: string;
    };
    disclaimer?: string;
  } & Record<string, unknown>;
};

export type WatchStepStatus = 'pending' | 'running' | 'complete' | 'warning' | 'failed' | 'skipped';

export type ForestWatchStep = {
  id: string;
  title: string;
  status: WatchStepStatus;
  provider?: string;
  explanation: string;
  detail?: string;
  at?: string;
};
