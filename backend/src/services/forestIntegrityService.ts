import { createHash } from 'crypto';
import { earthObservationService } from './earthObservationService';
import {
  getGfwApiKey,
  getGfwForestAlertsForAoi,
  type GfwForestAlertsResult,
} from './globalForestWatchService';

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

function hasGfwCredentials(): boolean {
  return Boolean(getGfwApiKey());
}

async function fetchFirmsHotspotCount(
  lat: number,
  lng: number,
  radiusKm: number,
  days: number,
): Promise<{ ok: boolean; count: number; message: string }> {
  const mapKey = process.env.NASA_FIRMS_MAP_KEY?.trim();
  if (!mapKey) {
    return { ok: false, count: 0, message: 'NASA_FIRMS_MAP_KEY is not set on the API host.' };
  }
  const d = Math.max(1, Math.min(10, days));
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${lng},${lat},${radiusKm},${d}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { ok: false, count: 0, message: `FIRMS HTTP ${response.status}` };
    }
    const text = await response.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const dataRows = Math.max(0, lines.length - 1);
    return {
      ok: true,
      count: dataRows,
      message:
        dataRows === 0
          ? 'No VIIRS SNPP NRT hotspot rows returned for this AOI and window.'
          : `${dataRows} VIIRS SNPP NRT hotspot row(s) in CSV (review coordinates and date window).`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'FIRMS request failed';
    return { ok: false, count: 0, message: msg };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Transparent 0–100 model (documentation for operators):
 * - Vegetation health (25): NDVI “current” (after scene) mapped toward healthy canopy.
 * - Disturbance / change (25): penalize negative NDVI delta and positive NBR delta (burn/stress proxy).
 * - Fire proximity (20): FIRMS rows present reduce score when provider is available.
 * - Deforestation / alert lane (20): GFW when configured; else EO-derived risk proxy only (no fabricated GFW).
 * - Evidence completeness (10): fraction of sentinel/FIRMS/GFW lanes that returned usable status.
 */
function computeForestIntegrityScore(args: {
  ndviAfter: number | null;
  ndviChange: number | null;
  nbrChange: number | null;
  firmsCount: number | null;
  firmsConfigured: boolean;
  gfwConfigured: boolean;
  gfwAlerts: number | null;
  eoRiskLevel: string;
  sentinelUsable: boolean;
}): { score: number | null; riskLevel: string } {
  const { ndviAfter, ndviChange, nbrChange, firmsCount, firmsConfigured, gfwConfigured, gfwAlerts, eoRiskLevel, sentinelUsable } =
    args;

  if (!sentinelUsable && !firmsConfigured && !gfwConfigured) {
    return { score: null, riskLevel: 'unknown' };
  }

  let veg = 12;
  if (ndviAfter != null) {
    veg = clamp(25 * ((ndviAfter + 0.2) / 1.1), 0, 25);
  }

  let dist = 18;
  if (ndviChange != null) {
    dist -= clamp(Math.abs(Math.min(0, ndviChange)) * 120, 0, 18);
  }
  if (nbrChange != null && nbrChange > 0.04) {
    dist -= clamp((nbrChange - 0.04) * 200, 0, 12);
  }
  dist = clamp(dist, 0, 25);

  let fire = 18;
  if (firmsConfigured && firmsCount != null) {
    fire = firmsCount === 0 ? 20 : clamp(20 - Math.min(20, firmsCount * 4), 0, 20);
  } else {
    fire = 10;
  }

  let defo = 12;
  if (gfwConfigured && gfwAlerts != null) {
    defo = gfwAlerts === 0 ? 20 : clamp(20 - Math.min(20, gfwAlerts * 5), 0, 20);
  } else {
    if (eoRiskLevel === 'high') defo = 4;
    else if (eoRiskLevel === 'moderate') defo = 10;
    else if (eoRiskLevel === 'low') defo = 16;
    else defo = 10;
  }

  let evid = 4;
  let lanes = 0;
  let okLanes = 0;
  if (sentinelUsable) {
    lanes += 1;
    okLanes += 1;
  }
  if (firmsConfigured) {
    lanes += 1;
    if (firmsCount != null) okLanes += 1;
  }
  if (gfwConfigured) {
    lanes += 1;
    if (gfwAlerts != null) okLanes += 1;
  }
  if (lanes > 0) {
    evid = clamp(Math.round(10 * (okLanes / lanes)), 0, 10);
  }

  const total = clamp(Math.round(veg + dist + fire + defo + evid), 0, 100);

  let riskLevel = 'unknown';
  if (total >= 85) riskLevel = 'strong_integrity';
  else if (total >= 65) riskLevel = 'watchlist';
  else if (total >= 40) riskLevel = 'elevated_risk';
  else riskLevel = 'critical_concern';

  return { score: total, riskLevel };
}

function newScanId(): string {
  return `fi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getForestProviderStatus(): Promise<ForestProviderStatusResponse> {
  const notes: string[] = [];
  const earthObservationLive = process.env.EARTH_OBSERVATION_LIVE_ENABLED === 'true';
  if (!earthObservationLive) {
    notes.push('Earth Observation live adapter is off (EARTH_OBSERVATION_LIVE_ENABLED). Landsat/Sentinel-backed indices require enabling it on the API host.');
  }
  const nasaFirmsConfigured = Boolean(process.env.NASA_FIRMS_MAP_KEY?.trim());
  if (!nasaFirmsConfigured) {
    notes.push('NASA FIRMS area CSV API key not set (NASA_FIRMS_MAP_KEY).');
  }
  const gfwConfigured = hasGfwCredentials();
  if (!gfwConfigured) {
    notes.push('Global Forest Watch API credentials not configured (set GFW_API_KEY or GLOBAL_FOREST_WATCH_API_KEY).');
  }
  const copernicusConfigured = Boolean(process.env.COPERNICUS_CLIENT_ID?.trim() && process.env.COPERNICUS_CLIENT_SECRET?.trim());
  if (!copernicusConfigured) {
    notes.push('Copernicus OAuth client not fully configured (optional for catalogue metadata in Earth Observation stack).');
  }
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    earthObservationLive,
    nasaFirmsConfigured,
    gfwConfigured,
    gediImplemented: false,
    copernicusConfigured,
    notes,
  };
}

export type ForestScanInput = {
  lat: number;
  lng: number;
  label?: string;
  radiusKm: number;
  baselineDate: string;
  currentDate: string;
  polygon?: unknown;
};

export async function runForestIntegrityScan(input: ForestScanInput): Promise<ForestIntegrityScanResponse> {
  const scanId = newScanId();
  const label = (input.label ?? 'Forest AOI').trim() || 'Forest AOI';
  const start = new Date(input.baselineDate);
  const end = new Date(input.currentDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
    throw new Error('Invalid baselineDate / currentDate range');
  }

  const eo = await earthObservationService.scan({
    analysisType: 'deforestation',
    latitude: input.lat,
    longitude: input.lng,
    radiusKm: input.radiusKm,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });

  const live = process.env.EARTH_OBSERVATION_LIVE_ENABLED === 'true';
  const eoUnavailable = !live || eo.sourceMode === 'UNAVAILABLE';

  const metrics = eo.metrics;
  const indices: ForestIntegrityIndices = {
    ndvi: metrics.ndviAfter ?? metrics.ndviBefore ?? null,
    ndmi: metrics.ndmiAfter ?? metrics.ndmiBefore ?? null,
    nbr: metrics.nbrAfter ?? metrics.nbrBefore ?? null,
    ndviChange: metrics.ndviChange,
    ndmiChange: metrics.ndmiChange,
    nbrChange: metrics.nbrChange,
  };

  const baselineSceneDate = eo.beforeScene?.acquisitionDate ?? null;
  const currentSceneDate = eo.afterScene?.acquisitionDate ?? null;

  const sentinelBlock: ForestIntegrityProviderBlock = eoUnavailable
    ? {
        status: live ? 'unavailable' : 'unavailable',
        message: live ? eo.summary : 'Earth Observation live stack is disabled on this API host (EARTH_OBSERVATION_LIVE_ENABLED).',
        sceneDate: currentSceneDate,
      }
    : {
        status: metrics.ndviAfter != null || metrics.ndviBefore != null ? 'available' : 'unavailable',
        message:
          metrics.ndviAfter != null || metrics.ndviBefore != null
            ? 'Landsat Collection 2 Level-2 statistics used for NDVI / NDMI / NBR (Planetary Computer item statistics).'
            : eo.summary,
        sceneDate: currentSceneDate,
      };

  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const firmsConfigured = Boolean(process.env.NASA_FIRMS_MAP_KEY?.trim());
  const firmsResult = firmsConfigured ? await fetchFirmsHotspotCount(input.lat, input.lng, input.radiusKm, Math.min(days, 10)) : null;

  const firmsBlock: ForestIntegrityProviderBlock = !firmsConfigured
    ? { status: 'not_configured', message: 'NASA FIRMS MAP key not configured on server (NASA_FIRMS_MAP_KEY).' }
    : firmsResult?.ok
      ? {
          status: 'available',
          message: firmsResult.message,
          activeFires: firmsResult.count,
        }
      : { status: 'failed', message: firmsResult?.message ?? 'FIRMS request failed', activeFires: null };

  const gfwOk = hasGfwCredentials();
  let gfwResult: GfwForestAlertsResult | null = null;
  if (gfwOk) {
    try {
      gfwResult = await getGfwForestAlertsForAoi({
        lat: input.lat,
        lng: input.lng,
        radiusKm: input.radiusKm,
        polygon: input.polygon,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'GFW adapter threw an unexpected error.';
      gfwResult = {
        status: 'failed',
        message: `GFW adapter failed: ${msg}`,
        alerts: null,
        integratedAlerts: null,
        disturbanceAlerts: null,
        datasetVersionsUsed: [],
        queriedAt: new Date().toISOString(),
        limitations: [msg],
      };
    }
  }

  const gfwBlock: ForestIntegrityProviderBlock = !gfwOk
    ? {
        status: 'not_configured',
        message:
          'Global Forest Watch integrated deforestation alerts are not wired on this host. Set GFW_API_KEY or GLOBAL_FOREST_WATCH_API_KEY to enable.',
        alerts: null,
        integratedAlerts: null,
        disturbanceAlerts: null,
        datasetVersionsUsed: [],
        queriedAt: null,
        limitations: [],
      }
    : {
        status: (gfwResult?.status ?? 'failed') as ForestProviderState,
        message: gfwResult?.message ?? 'GFW adapter returned no result.',
        alerts: gfwResult?.alerts ?? null,
        integratedAlerts: gfwResult?.integratedAlerts ?? null,
        disturbanceAlerts: gfwResult?.disturbanceAlerts ?? null,
        datasetVersionsUsed: gfwResult?.datasetVersionsUsed ?? [],
        queriedAt: gfwResult?.queriedAt ?? null,
        limitations: gfwResult?.limitations ?? [],
      };

  const gediBlock: ForestIntegrityProviderBlock = {
    status: 'not_configured',
    message: 'NASA GEDI biomass / canopy structure read is not implemented on this API route yet.',
    biomassEstimateMgPerHa: null,
  };

  const gfwAvailable = gfwBlock.status === 'available';
  const gfwAlertCountForScoring =
    gfwAvailable && typeof gfwBlock.alerts === 'number' ? gfwBlock.alerts : null;

  const { score, riskLevel } = computeForestIntegrityScore({
    ndviAfter: metrics.ndviAfter,
    ndviChange: metrics.ndviChange,
    nbrChange: metrics.nbrChange,
    firmsCount: typeof firmsBlock.activeFires === 'number' ? firmsBlock.activeFires : null,
    firmsConfigured,
    gfwConfigured: gfwOk && gfwAvailable,
    gfwAlerts: gfwAlertCountForScoring,
    eoRiskLevel: eo.riskLevel,
    sentinelUsable: sentinelBlock.status === 'available',
  });

  const gfwLaneLimitations: string[] = [];
  if (gfwOk && !gfwAvailable) {
    gfwLaneLimitations.push(
      `Global Forest Watch lane status: ${gfwBlock.status} — ${gfwBlock.message}`,
    );
  }
  if (gfwBlock.limitations && gfwBlock.limitations.length > 0) {
    for (const line of gfwBlock.limitations) {
      gfwLaneLimitations.push(`GFW · ${line}`);
    }
  }
  if (gfwOk && gfwAvailable && gfwBlock.datasetVersionsUsed && gfwBlock.datasetVersionsUsed.length > 0) {
    gfwLaneLimitations.push(
      `GFW dataset versions used: ${gfwBlock.datasetVersionsUsed.join(', ')}.`,
    );
  }
  if (gfwOk && gfwBlock.queriedAt) {
    gfwLaneLimitations.push(`GFW queriedAt: ${gfwBlock.queriedAt}`);
  }

  const limitations = [
    ...eo.limitations,
    ...gfwLaneLimitations,
    'FIRMS hotspots are satellite-derived thermal anomalies, not ground-truthed fire perimeters.',
    'Indices are scene-level means from item statistics, not parcel polygons, unless a future zonal engine is added.',
  ];

  const evidenceItems: string[] = [
    `AOI label: ${label}`,
    `Center: ${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}; radius ${input.radiusKm} km`,
    `Window: ${start.toISOString()} → ${end.toISOString()}`,
    baselineSceneDate ? `Baseline scene: ${baselineSceneDate}` : 'Baseline scene: not resolved',
    currentSceneDate ? `Current scene: ${currentSceneDate}` : 'Current scene: not resolved',
    indices.ndvi != null ? `NDVI (current/after mean): ${indices.ndvi}` : 'NDVI: unavailable',
    indices.ndmi != null ? `NDMI (current/after mean): ${indices.ndmi}` : 'NDMI: unavailable',
    indices.nbr != null ? `NBR (current/after mean): ${indices.nbr}` : 'NBR: unavailable',
    typeof firmsBlock.activeFires === 'number' ? `FIRMS CSV rows (proxy): ${firmsBlock.activeFires}` : 'FIRMS: not evaluated',
    `GFW lane status: ${gfwBlock.status}`,
    typeof gfwBlock.integratedAlerts === 'number'
      ? `GFW integrated deforestation alerts: ${gfwBlock.integratedAlerts}`
      : 'GFW integrated deforestation alerts: not available',
    typeof gfwBlock.disturbanceAlerts === 'number'
      ? `GFW disturbance alerts: ${gfwBlock.disturbanceAlerts}`
      : 'GFW disturbance alerts: not available',
    gfwBlock.datasetVersionsUsed && gfwBlock.datasetVersionsUsed.length > 0
      ? `GFW dataset versions used: ${gfwBlock.datasetVersionsUsed.join(', ')}`
      : 'GFW dataset versions used: none',
    score != null ? `DPAL Forest Integrity score: ${score} (${riskLevel})` : 'DPAL Forest Integrity score: insufficient configured providers',
  ];

  return {
    ok: true,
    scanId,
    label,
    aoi: {
      lat: input.lat,
      lng: input.lng,
      radiusKm: input.radiusKm,
      polygon: input.polygon,
      baselineDate: start.toISOString(),
      currentDate: end.toISOString(),
    },
    providers: {
      sentinel: sentinelBlock,
      gfw: gfwBlock,
      firms: firmsBlock,
      gedi: gediBlock,
    },
    indices,
    forestIntegrityScore: score,
    riskLevel,
    evidenceItems,
    limitations,
    generatedAt: new Date().toISOString(),
    earthObservation: eo as unknown as Record<string, unknown>,
  };
}

export function hashForestEvidencePayload(payload: unknown): string {
  const json = JSON.stringify(payload);
  return createHash('sha256').update(json).digest('hex');
}
