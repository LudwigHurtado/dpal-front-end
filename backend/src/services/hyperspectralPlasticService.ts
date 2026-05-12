import { createHash } from 'crypto';
import { earthObservationService } from './earthObservationService';

export type PlasticProviderState =
  | 'available'
  | 'not_configured'
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

export type PlasticScanInput = {
  lat: number;
  lng: number;
  label?: string;
  radiusKm: number;
  baselineDate: string;
  currentDate: string;
  environmentType: PlasticEnvironmentType;
  polygon?: unknown;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function newScanId(): string {
  return `hpw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEnv(raw: string): PlasticEnvironmentType {
  const v = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (v === 'river') return 'river';
  if (v === 'lake') return 'lake';
  if (v === 'coast') return 'coast';
  if (v === 'ocean') return 'ocean';
  if (v === 'landfill_dumping' || v === 'landfill' || v === 'dumping_area') return 'landfill_dumping';
  if (v === 'flood_debris' || v === 'flood_debris_zone') return 'flood_debris';
  return 'river';
}

function eoAnalysisForEnv(env: PlasticEnvironmentType): 'water' | 'pollution' | 'flood_fire' {
  if (env === 'flood_debris') return 'flood_fire';
  if (env === 'landfill_dumping') return 'pollution';
  return 'water';
}

function isPaceConfigured(): boolean {
  return process.env.DPAL_PACE_SPECTRAL_ENABLED === 'true' && Boolean(process.env.NASA_EARTHDATA_TOKEN?.trim());
}

function isEmitConfigured(): boolean {
  return process.env.DPAL_EMIT_L2A_ENABLED === 'true' && Boolean(process.env.NASA_EARTHDATA_TOKEN?.trim());
}

/**
 * Evidence-oriented 0–100 score. Does not assert plastic presence.
 * EMIT / PACE lanes are scored only when explicitly enabled on the host.
 */
function computePlasticEvidenceScore(args: {
  pace: PlasticSpectralProviderBlock;
  emit: PlasticSpectralProviderBlock;
  fallback: PlasticFallbackBlock;
  confounderPenalty: number;
  env: PlasticEnvironmentType;
  genericSpectralProxy: number;
}): { score: number; riskLevel: string; signal: PlasticSpectralSignals['plasticRiskSignal']; confidence: number } {
  let spectral = 0;
  if (args.emit.status === 'available') {
    spectral = clamp(Math.round(args.genericSpectralProxy * 30), 0, 30);
  } else {
    spectral = clamp(Math.round(args.genericSpectralProxy * 8), 0, 8);
  }

  let provider = 0;
  if (args.pace.status === 'available') provider += 10;
  else if (args.pace.status === 'no_scene') provider += 4;
  if (args.emit.status === 'available') provider += 10;
  else if (args.emit.status === 'no_scene') provider += 4;
  if (args.fallback.status === 'available') provider += 10;
  else if (args.fallback.status === 'no_scene' || args.fallback.status === 'unavailable') provider += 3;

  let context = 8;
  if (['ocean', 'coast', 'lake', 'river'].includes(args.env)) context = 12;
  if (args.env === 'landfill_dumping') context = 14;
  if (args.env === 'flood_debris') context = 13;
  context = clamp(context, 0, 15);

  const confounder = clamp(15 - args.confounderPenalty, 0, 15);

  const lanesOk = [args.pace.status, args.emit.status, args.fallback.status].filter((s) => s === 'available').length;
  const evidence = clamp(Math.round((lanesOk / 3) * 10), 2, 10);

  const validation = 8;

  const score = clamp(Math.round(spectral + provider + context + confounder + evidence + validation), 0, 100);

  let riskLevel = 'low_confidence_no_clear_signal';
  if (score >= 85) riskLevel = 'strong_candidate_for_review';
  else if (score >= 65) riskLevel = 'elevated_plastic_risk_signal';
  else if (score >= 40) riskLevel = 'watchlist';

  let signal: PlasticSpectralSignals['plasticRiskSignal'] = 'none';
  if (args.emit.status === 'available' && args.genericSpectralProxy > 0.45) signal = 'elevated_plastic_risk_signal';
  else if (args.emit.status === 'available' && args.genericSpectralProxy > 0.2) signal = 'possible_spectral_anomaly';
  else if (args.genericSpectralProxy > 0.08) signal = 'weak_context';

  const confidence = clamp(
    0.15 + (args.emit.status === 'available' ? 0.35 : 0) + (args.fallback.status === 'available' ? 0.25 : 0.08),
    0.05,
    0.85,
  );

  return { score, riskLevel, signal, confidence };
}

export async function getHyperspectralPlasticProviderStatus(): Promise<HyperspectralPlasticProviderStatusResponse> {
  const notes: string[] = [
    'NASA PACE and EMIT product pulls are not enabled unless DPAL_PACE_SPECTRAL_ENABLED / DPAL_EMIT_L2A_ENABLED and NASA_EARTHDATA_TOKEN are configured.',
    'Plastic-risk language is evidence-support only; field validation is required before any enforcement or legal use.',
  ];
  const paceConfigured = isPaceConfigured();
  const emitConfigured = isEmitConfigured();
  const earthObservationLive = process.env.EARTH_OBSERVATION_LIVE_ENABLED === 'true';
  if (!earthObservationLive) {
    notes.push('Landsat / multispectral fallback uses Earth Observation scan when EARTH_OBSERVATION_LIVE_ENABLED=true.');
  }
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    paceConfigured,
    emitConfigured,
    earthObservationLive,
    notes,
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
  const genericSpectralProxy = clamp((absNdwi * 1.4 + absNdvi * 0.9 + absNdmi * 0.8) / 1.6, 0, 1);

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

  const pace: PlasticSpectralProviderBlock = !isPaceConfigured()
    ? {
        status: 'not_configured',
        message:
          'NASA PACE ocean color integration is not enabled on this API host. Set DPAL_PACE_SPECTRAL_ENABLED=true and NASA_EARTHDATA_TOKEN for future wiring.',
        sceneDate: null,
        spectralRange: null,
        limitations: [
          'PACE hyperspectral/ocean-color products are not queried in this build.',
          'Coastal glint and adjacency effects can mimic bright floating materials; requires field validation.',
        ],
      }
    : {
        status: 'unavailable',
        message: 'PACE lane is flagged enabled but reader is not implemented yet.',
        limitations: ['No PACE L2 granule reader is implemented; status reserved for a future adapter.'],
      };

  const emit: PlasticSpectralProviderBlock = !isEmitConfigured()
    ? {
        status: 'not_configured',
        message:
          'NASA EMIT L2A VNIR/SWIR integration is not enabled on this API host. Set DPAL_EMIT_L2A_ENABLED=true and NASA_EARTHDATA_TOKEN for future wiring.',
        sceneDate: null,
        spectralRange: null,
        limitations: [
          'Plastic-relevant SWIR absorption features require EMIT or comparable hyperspectral coverage.',
          'Without EMIT, DPAL does not infer plastic-specific absorption from broadband Landsat alone.',
        ],
      }
    : {
        status: 'unavailable',
        message: 'EMIT lane is flagged enabled but granule reader is not implemented yet.',
        limitations: ['No EMIT granule reader is implemented; status reserved for a future adapter.'],
      };

  const afterDate = eo.afterScene?.acquisitionDate ?? null;
  const sentinelLandsatFallback: PlasticFallbackBlock = !live
    ? {
        status: 'not_configured',
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

  const { score, riskLevel, signal, confidence } = computePlasticEvidenceScore({
    pace,
    emit,
    fallback: sentinelLandsatFallback,
    confounderPenalty,
    env,
    genericSpectralProxy: eoUsable ? genericSpectralProxy : 0,
  });

  const spectralNotes: string[] = [
    'Possible plastic spectral anomaly requires EMIT / comparable hyperspectral coverage plus field validation.',
    'Broadband change metrics below are evidence-support context only, not final proof of plastic pollution.',
  ];
  if (!eoUsable) {
    spectralNotes.push('Insufficient multispectral context from Landsat for this AOI and date window.');
  }

  const spectralSignals: PlasticSpectralSignals = {
    plasticRiskSignal: signal,
    confidence,
    swirAnomaly: null,
    visibleAnomaly: eoUsable ? clamp(genericSpectralProxy * 0.35, 0, 0.25) : null,
    waterConfounders,
    notes: spectralNotes,
  };

  const limitations: string[] = [
    ...eo.limitations,
    'Satellite spectral anomalies are not final proof of plastic pollution.',
    'PACE and EMIT product access is not implemented unless explicitly enabled and wired on this host.',
    'Interpret plastic-risk score as an evidence-support composite, not a legal finding.',
  ];

  const evidenceItems: string[] = [
    `AOI label: ${label}`,
    `Environment type: ${env}`,
    `Center: ${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}; radius ${input.radiusKm} km`,
    `Window: ${start.toISOString()} → ${end.toISOString()}`,
    `PACE status: ${pace.status} — ${pace.message}`,
    `EMIT status: ${emit.status} — ${emit.message}`,
    `Landsat / EO fallback: ${sentinelLandsatFallback.status} — ${sentinelLandsatFallback.message}`,
    `Plastic-risk evidence score (0–100): ${score} (${riskLevel})`,
    `Plastic-risk signal label: ${spectralSignals.plasticRiskSignal}`,
    `Confidence (model): ${confidence.toFixed(2)} (capped; requires field validation)`,
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
    },
    providers: { pace, emit, sentinelLandsatFallback: sentinelLandsatFallback },
    spectralSignals,
    plasticRiskScore: score,
    riskLevel,
    evidenceItems,
    limitations,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizePlasticEnvironmentType(raw: string): PlasticEnvironmentType {
  return normalizeEnv(raw);
}

export function hashPlasticEvidencePayload(payload: unknown): string {
  const json = JSON.stringify(payload);
  return createHash('sha256').update(json).digest('hex');
}
