import { createHash } from 'crypto';
import { earthObservationService } from './earthObservationService';
import { queryEmitL2aScenes } from './hyperspectral/emitProvider';
import { queryPaceScenes } from './hyperspectral/paceProvider';
import {
  sceneToCompact,
  type DpalHyperspectralCompactScene,
  type DpalHyperspectralScene,
} from './hyperspectral/nasaCmrClient';
import { buildPlasticWatchProviderReadinessPayload, type PlasticWatchProviderReadinessPayload } from './hyperspectral/providerStatus';
import {
  buildDroneValidationAcknowledgment,
  computeDroneReadiness,
  validateDroneRequestBody,
  type DroneProviderMode,
} from './hyperspectral/droneValidationProvider';

export type PlasticProviderState =
  | 'available'
  | 'not_configured'
  | 'not_enabled'
  | 'needs_credentials'
  | 'ready'
  | 'no_scene'
  | 'unavailable'
  | 'auth_error'
  | 'rate_limited'
  | 'failed';

export type PlasticSpectralProviderBlock = {
  status: PlasticProviderState;
  message: string;
  sceneDate?: string | null;
  spectralRange?: string | null;
  limitations?: string[];
  scenes?: Array<DpalHyperspectralScene | DpalHyperspectralCompactScene>;
};

export type PlasticDroneProviderBlock = {
  status: string;
  mode: DroneProviderMode;
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

import type { PlasticEnvironmentType } from './hyperspectral/plasticEnvironment';

export type { PlasticEnvironmentType };

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
  /** @deprecated Use plasticRisk — kept for older UI branches */
  plasticRiskScore: number | null;
  riskLevel: string;
  plasticRisk: PlasticRiskBlock;
  evidencePacket: ScanEvidencePacketBlock;
  evidenceItems: string[];
  limitations: string[];
  generatedAt: string;
};

export type HyperspectralPlasticProviderStatusResponse = PlasticWatchProviderReadinessPayload;

export type PlasticScanInput = {
  lat: number;
  lng: number;
  label?: string;
  radiusKm: number;
  baselineDate: string;
  currentDate: string;
  environmentType: PlasticEnvironmentType;
  polygon?: unknown;
  quickPreset?: string | null;
  aoiGeoJson?: unknown;
  /** When true and includeFullSceneLinks is not true, PACE/EMIT scenes omit full CMR link arrays. */
  compactScenes?: boolean;
  includeFullSceneLinks?: boolean;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function newScanId(): string {
  return `hpw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isFullHyperspectralScene(s: DpalHyperspectralScene | DpalHyperspectralCompactScene): s is DpalHyperspectralScene {
  return Array.isArray((s as DpalHyperspectralScene).links);
}

function compactSpectralBlock(block: PlasticSpectralProviderBlock, useCompact: boolean): PlasticSpectralProviderBlock {
  if (!useCompact || !block.scenes?.length) return block;
  return {
    ...block,
    scenes: block.scenes.map((s) => (isFullHyperspectralScene(s) ? sceneToCompact(s) : s)),
  };
}

function eoAnalysisForEnv(env: PlasticEnvironmentType): 'water' | 'pollution' | 'flood_fire' {
  if (env === 'flood_debris') return 'flood_fire';
  if (env === 'landfill_dumping') return 'pollution';
  return 'water';
}

function paceFeatureEnabled(): boolean {
  return process.env.DPAL_PACE_SPECTRAL_ENABLED === 'true';
}

function emitFeatureEnabled(): boolean {
  return process.env.DPAL_EMIT_L2A_ENABLED === 'true';
}

function earthdataToken(): string {
  return process.env.NASA_EARTHDATA_TOKEN?.trim() ?? '';
}

export async function getHyperspectralPlasticProviderStatus(): Promise<HyperspectralPlasticProviderStatusResponse> {
  return buildPlasticWatchProviderReadinessPayload();
}

async function buildPaceScanBlock(args: {
  lat: number;
  lng: number;
  radiusKm: number;
  start: Date;
  end: Date;
}): Promise<PlasticSpectralProviderBlock> {
  if (!paceFeatureEnabled()) {
    return {
      status: 'not_enabled',
      message:
        'PACE spectral pulls are disabled. Set DPAL_PACE_SPECTRAL_ENABLED=true and NASA_EARTHDATA_TOKEN to retrieve narrow-band ocean-color context from NASA CMR.',
      sceneDate: null,
      spectralRange: null,
      limitations: [
        'PACE lane off — no NASA CMR query was performed for PACE.',
        'Coastal glint and adjacency effects can mimic bright floating materials; field validation remains required.',
      ],
      scenes: [],
    };
  }
  const token = earthdataToken();
  if (!token) {
    return {
      status: 'needs_credentials',
      message: 'PACE is enabled but NASA_EARTHDATA_TOKEN is missing on the API host.',
      sceneDate: null,
      spectralRange: null,
      limitations: ['Add NASA_EARTHDATA_TOKEN server-side, then rerun the scan.'],
      scenes: [],
    };
  }

  const cmr = await queryPaceScenes({
    lat: args.lat,
    lng: args.lng,
    radiusKm: args.radiusKm,
    start: args.start,
    end: args.end,
    token,
  });

  if (cmr.errorCode === 'auth_error') {
    return {
      status: 'auth_error',
      message: cmr.safeMessage ?? 'NASA CMR authentication failed.',
      limitations: ['Verify NASA_EARTHDATA_TOKEN and Earthdata permissions.'],
      scenes: [],
    };
  }
  if (cmr.errorCode === 'rate_limited') {
    return {
      status: 'rate_limited',
      message: cmr.safeMessage ?? 'NASA CMR rate limited.',
      scenes: [],
    };
  }
  if (cmr.errorCode === 'failed') {
    return {
      status: 'failed',
      message: cmr.safeMessage ?? 'NASA CMR request failed.',
      scenes: [],
    };
  }

  if (!cmr.scenes.length) {
    return {
      status: 'no_scene',
      message: 'No matching PACE granules were returned for this AOI and date window (NASA CMR metadata search).',
      sceneDate: null,
      limitations: [
        'Try widening the date window or verifying collection short name (DPAL_PACE_CMR_SHORT_NAME).',
        'Granule listings are metadata only — no spectral plastic indices were computed.',
      ],
      scenes: [],
    };
  }

  const first = cmr.scenes[0];
  return {
    status: 'available',
    message: `NASA CMR returned ${cmr.scenes.length} PACE granule(s) — metadata only (no spectral index extraction in this build).`,
    sceneDate: first.startTime || null,
    spectralRange: 'PACE OCI (narrow-band products — indices not extracted here)',
    limitations: [
      'CMR granule metadata does not prove plastic presence.',
      'Plastic-relevant interpretation requires calibrated narrow-band processing and field validation.',
    ],
    scenes: cmr.scenes,
  };
}

async function buildEmitScanBlock(args: {
  lat: number;
  lng: number;
  radiusKm: number;
  start: Date;
  end: Date;
}): Promise<PlasticSpectralProviderBlock> {
  if (!emitFeatureEnabled()) {
    return {
      status: 'not_enabled',
      message:
        'EMIT L2A pulls are disabled. Set DPAL_EMIT_L2A_ENABLED=true and NASA_EARTHDATA_TOKEN to retrieve EMIT hyperspectral granule metadata from NASA CMR.',
      sceneDate: null,
      spectralRange: null,
      limitations: [
        'EMIT lane off — no NASA CMR query was performed for EMIT.',
        'SWIR plastic-relevant features are not inferred from broadband Landsat alone.',
      ],
      scenes: [],
    };
  }
  const token = earthdataToken();
  if (!token) {
    return {
      status: 'needs_credentials',
      message: 'EMIT is enabled but NASA_EARTHDATA_TOKEN is missing on the API host.',
      sceneDate: null,
      spectralRange: null,
      limitations: ['Add NASA_EARTHDATA_TOKEN server-side, then rerun the scan.'],
      scenes: [],
    };
  }

  const cmr = await queryEmitL2aScenes({
    lat: args.lat,
    lng: args.lng,
    radiusKm: args.radiusKm,
    start: args.start,
    end: args.end,
    token,
  });

  if (cmr.errorCode === 'auth_error') {
    return {
      status: 'auth_error',
      message: cmr.safeMessage ?? 'NASA CMR authentication failed.',
      limitations: ['Verify NASA_EARTHDATA_TOKEN and Earthdata permissions.'],
      scenes: [],
    };
  }
  if (cmr.errorCode === 'rate_limited') {
    return {
      status: 'rate_limited',
      message: cmr.safeMessage ?? 'NASA CMR rate limited.',
      scenes: [],
    };
  }
  if (cmr.errorCode === 'failed') {
    return {
      status: 'failed',
      message: cmr.safeMessage ?? 'NASA CMR request failed.',
      scenes: [],
    };
  }

  if (!cmr.scenes.length) {
    return {
      status: 'no_scene',
      message: 'No matching EMIT L2A granules were returned for this AOI and date window (NASA CMR metadata search).',
      sceneDate: null,
      limitations: [
        'Try widening the date window or verifying collection short name (DPAL_EMIT_CMR_SHORT_NAME).',
        'Granule listings are metadata only — no SWIR plastic indices were computed.',
      ],
      scenes: [],
    };
  }

  const first = cmr.scenes[0];
  return {
    status: 'available',
    message: `NASA CMR returned ${cmr.scenes.length} EMIT L2A granule(s) — metadata only (no spectral index extraction in this build).`,
    sceneDate: first.startTime || null,
    spectralRange: 'EMIT VNIR/SWIR (indices not extracted here)',
    limitations: [
      'CMR granule metadata does not prove plastic presence.',
      'Confounders include vegetation, soils, and moisture — independent validation is required.',
    ],
    scenes: cmr.scenes,
  };
}

export async function runHyperspectralPlasticScan(input: PlasticScanInput): Promise<HyperspectralPlasticScanResponse> {
  const scanId = newScanId();
  const label = (input.label ?? 'Plastic Watch AOI').trim() || 'Plastic Watch AOI';
  const env = input.environmentType;
  const start = new Date(input.baselineDate);
  const end = new Date(input.currentDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
    throw new Error('Invalid baselineDate / currentDate range');
  }

  const [pace, emit] = await Promise.all([
    buildPaceScanBlock({
      lat: input.lat,
      lng: input.lng,
      radiusKm: input.radiusKm,
      start,
      end,
    }),
    buildEmitScanBlock({
      lat: input.lat,
      lng: input.lng,
      radiusKm: input.radiusKm,
      start,
      end,
    }),
  ]);

  const narrowBandSceneCount = (pace.scenes?.length ?? 0) + (emit.scenes?.length ?? 0);
  const narrowBandMetadata = narrowBandSceneCount > 0;
  const useCompact = input.compactScenes === true && input.includeFullSceneLinks !== true;
  const paceOut = compactSpectralBlock(pace, useCompact);
  const emitOut = compactSpectralBlock(emit, useCompact);

  const analysisType = eoAnalysisForEnv(env);
  const eo = await earthObservationService.scan({
    analysisType,
    latitude: input.lat,
    longitude: input.lng,
    radiusKm: input.radiusKm,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });

  const live = process.env.EARTH_OBSERVATION_LIVE_ENABLED === 'true';
  const eoUsable = live && eo.sourceMode !== 'UNAVAILABLE' && (eo.metrics.ndwiChange != null || eo.metrics.ndviChange != null);

  const absNdwi = eo.metrics.ndwiChange != null ? Math.abs(eo.metrics.ndwiChange) : 0;
  const absNdvi = eo.metrics.ndviChange != null ? Math.abs(eo.metrics.ndviChange) : 0;
  const absNdmi = eo.metrics.ndmiChange != null ? Math.abs(eo.metrics.ndmiChange) : 0;

  let confounderPenalty = 0;
  if (absNdmi > 0.12) confounderPenalty += 4;
  const cloudCov = eo.metrics.cloudCoverage;
  if (cloudCov != null && cloudCov > 35) confounderPenalty += 5;
  if (eo.riskLevel === 'high') confounderPenalty += 3;

  const waterConfounders: PlasticWaterConfounders = {
    algae: absNdvi > 0.08 ? 'moderate' : 'low',
    turbidity: absNdwi > 0.1 ? 'moderate' : absNdwi > 0.05 ? 'low' : 'unknown',
    sediment: absNdmi > 0.1 ? 'moderate' : 'low',
    foam: 'unknown',
    cloudsGlint: cloudCov != null && cloudCov > 25 ? 'moderate' : 'low',
  };

  const afterDate = eo.afterScene?.acquisitionDate ?? null;
  const sentinelLandsatFallback: PlasticFallbackBlock = !live
    ? {
        status: 'not_enabled',
        message: 'Earth Observation live adapter is disabled (EARTH_OBSERVATION_LIVE_ENABLED).',
        limitations: ['Enable Earth Observation on the API host for Landsat C2 L2 screening context.'],
      }
    : eo.sourceMode === 'UNAVAILABLE'
      ? {
          status: 'unavailable',
          message: eo.summary,
          limitations: eo.limitations,
        }
      : eoUsable
        ? {
            status: 'available',
            message:
              'Landsat Collection 2 Level-2 item statistics returned multispectral context (not plastic-specific).',
            sceneDate: afterDate,
            limitations: [
              ...eo.limitations,
              'Landsat bands do not resolve narrow SWIR plastic absorption features; interpret as environmental context only.',
            ],
          }
        : {
            status: 'no_scene',
            message: eo.summary || 'No usable Landsat scenes for this window.',
            sceneDate: afterDate,
            limitations: eo.limitations,
          };

  const spectralNotes: string[] = [
    'Broadband Landsat change metrics (if present) are environmental context only — not proof of plastic pollution.',
    'Plastic-specific claims require calibrated narrow-band processing plus field and drone validation.',
  ];
  if (!eoUsable) {
    spectralNotes.push('Insufficient multispectral context from Landsat for this AOI and date window.');
  }

  const spectralSignals: PlasticSpectralSignals = {
    plasticRiskSignal: 'none',
    confidence: narrowBandMetadata ? 0.12 : eoUsable ? 0.1 : 0.05,
    swirAnomaly: null,
    visibleAnomaly: null,
    waterConfounders,
    notes: spectralNotes,
  };

  const droneR = computeDroneReadiness();
  const drone: PlasticDroneProviderBlock = {
    status: droneR.status,
    mode: droneR.mode,
    message: droneR.message,
  };

  const plasticRisk: PlasticRiskBlock = narrowBandMetadata
    ? {
        score: null,
        status: 'pending_index_extraction',
        message:
          'Narrow-band product metadata was retrieved from NASA CMR. Plastic-risk scoring is not computed until index extraction and validation logic run against real spectral products.',
      }
    : {
        score: null,
        status: 'not_computed',
        message:
          'Narrow-band plastic anomaly scoring requires configured PACE or EMIT CMR hits (or future product readers). No plastic-risk score is emitted from broadband context alone.',
      };

  const evidencePacket: ScanEvidencePacketBlock = narrowBandMetadata
    ? {
        status: 'preview',
        claimsLevel: 'narrow_band_metadata',
        limitations: [
          'Narrow-band granule metadata was retrieved; this packet is not a confirmed plastic detection.',
          'Index extraction, radiometric QA, and field validation are still required before escalation.',
          'Drone and field validation remain mandatory for enforcement-grade evidence.',
        ],
        nextActions: [
          'Run field sampling and independent lab ID where appropriate.',
          'Prepare drone validation using manual/upload mode or connect DPAL_DRONE_PROVIDER_API_URL when ready.',
          'Complete narrow-band index extraction in a future pipeline release before interpreting plastic-risk scores.',
        ],
      }
    : {
        status: 'preview',
        claimsLevel: 'metadata_only',
        limitations: [
          'No PACE/EMIT spectral products with usable granule metadata were retrieved for this AOI and window.',
          'Plastic-risk score remains unavailable until narrow-band provider data and processing are connected.',
          'Field or drone validation is required before escalation.',
        ],
        nextActions: [
          'Enable DPAL_PACE_SPECTRAL_ENABLED / DPAL_EMIT_L2A_ENABLED and NASA_EARTHDATA_TOKEN, then rerun the scan.',
          'Widen the date window if CMR returned zero granules.',
          'Enable EARTH_OBSERVATION_LIVE_ENABLED for Landsat broadband context while hyperspectral lanes are brought online.',
        ],
      };

  const limitations: string[] = [
    ...eo.limitations,
    ...evidencePacket.limitations,
    'Satellite data are evidence-support only; they are not final proof of plastic pollution.',
  ];

  const evidenceItems: string[] = [
    `AOI label: ${label}`,
    `Environment type: ${env}`,
    `Center: ${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}; radius ${input.radiusKm} km`,
    `Window: ${start.toISOString()} → ${end.toISOString()}`,
    `PACE status: ${paceOut.status} — ${paceOut.message}`,
    `EMIT status: ${emitOut.status} — ${emitOut.message}`,
    `Landsat / EO fallback: ${sentinelLandsatFallback.status} — ${sentinelLandsatFallback.message}`,
    `Drone validation connector: ${drone.status} (${drone.mode}) — ${drone.message}`,
    `Plastic-risk score: not computed (narrow-band indices not extracted in this build)`,
    `Evidence claims level: ${evidencePacket.claimsLevel}`,
    eo.metrics.ndwiChange != null ? `NDWI change (context): ${eo.metrics.ndwiChange}` : 'NDWI change: unavailable',
    eo.metrics.ndviChange != null ? `NDVI change (context): ${eo.metrics.ndviChange}` : 'NDVI change: unavailable',
    'Field validation recommendation: collect grab samples, drone close-ups, and lab ID where appropriate.',
  ];

  return {
    ok: true,
    scanId,
    label,
    aoi: {
      lat: input.lat,
      lng: input.lng,
      radiusKm: input.radiusKm,
      label,
      baselineDate: start.toISOString(),
      currentDate: end.toISOString(),
      environmentType: env,
      polygon: input.polygon,
      quickPreset: input.quickPreset ?? null,
      aoiGeoJson: input.aoiGeoJson ?? null,
    },
    providers: { pace: paceOut, emit: emitOut, sentinelLandsatFallback, drone },
    spectralSignals,
    plasticRiskScore: null,
    riskLevel: plasticRisk.status,
    plasticRisk,
    evidencePacket,
    evidenceItems,
    limitations,
    generatedAt: new Date().toISOString(),
  };
}

export { normalizePlasticEnvironmentType } from './hyperspectral/plasticEnvironment';

export function hashPlasticEvidencePayload(payload: unknown): string {
  const json = JSON.stringify(payload);
  return createHash('sha256').update(json).digest('hex');
}

export function getDroneValidationStatusPayload(): {
  ok: true;
  generatedAt: string;
} & ReturnType<typeof computeDroneReadiness> {
  const d = computeDroneReadiness();
  return { ok: true, generatedAt: new Date().toISOString(), ...d };
}

export function postDroneValidationRequestParsed(body: unknown) {
  const parsed = validateDroneRequestBody(body);
  if (!parsed.ok) return { ok: false as const, error: parsed.error };
  return { ok: true as const, body: buildDroneValidationAcknowledgment(parsed.value) };
}
