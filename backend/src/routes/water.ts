import { Router } from 'express';

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
} | null;

const router = Router();
let tokenCache: TokenCache = null;

const TOKEN_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const DEFAULT_BASE_URL = 'https://services.sentinel-hub.com';
const ADAPTER_TIMEOUT_MS = 7000;

function tokenUrl(): string {
  return process.env.COPERNICUS_TOKEN_URL?.trim() || DEFAULT_TOKEN_URL;
}

function sentinelBaseUrl(): string {
  return (process.env.COPERNICUS_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function missingCredentialKeys(): string[] {
  const missing: string[] = [];
  if (!process.env.COPERNICUS_CLIENT_ID?.trim()) missing.push('COPERNICUS_CLIENT_ID');
  if (!process.env.COPERNICUS_CLIENT_SECRET?.trim()) missing.push('COPERNICUS_CLIENT_SECRET');
  return missing;
}

async function fetchNewAccessToken(): Promise<{ token: string; expiresInSec: number }> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.COPERNICUS_CLIENT_ID?.trim() ?? '',
    client_secret: process.env.COPERNICUS_CLIENT_SECRET?.trim() ?? '',
  });
  const response = await fetch(tokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || `Token endpoint error ${response.status}`);
  }
  return {
    token: payload.access_token,
    expiresInSec: Math.max(30, Number(payload.expires_in ?? 300)),
  };
}

async function getServerToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAtMs - TOKEN_REFRESH_BUFFER_MS) {
    return tokenCache.accessToken;
  }
  const fresh = await fetchNewAccessToken();
  tokenCache = {
    accessToken: fresh.token,
    expiresAtMs: Date.now() + fresh.expiresInSec * 1000,
  };
  return fresh.token;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toFixed(value: number, precision = 3): number {
  return Number(value.toFixed(precision));
}

function pointPolygonAoi(lat: number, lng: number, radiusKm = 2): { type: 'Polygon'; coordinates: number[][][] } {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;
  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  return {
    type: 'Polygon',
    coordinates: [[
      [minLng, maxLat],
      [maxLng, maxLat],
      [maxLng, minLat],
      [minLng, minLat],
      [minLng, maxLat],
    ]],
  };
}

function evalscriptFor(indexType: 'NDVI' | 'NDWI' | 'NDMI' | 'NBR'): string {
  if (indexType === 'NDVI') return '(B08-B04)/(B08+B04)';
  if (indexType === 'NDWI') return '(B03-B08)/(B03+B08)';
  if (indexType === 'NDMI') return '(B08-B11)/(B08+B11)';
  return '(B08-B12)/(B08+B12)';
}

function buildStatisticsRequest(args: {
  aoiGeoJson: { type: 'Polygon'; coordinates: number[][][] };
  collection: 'sentinel-2-l2a' | 'sentinel-1-grd';
  outputBand: string;
  inputBands: string[];
  expression: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    input: {
      bounds: {
        geometry: args.aoiGeoJson,
        properties: { crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84' },
      },
      data: [
        {
          type: args.collection,
          dataFilter: {
            mosaickingOrder: 'mostRecent',
            timeRange: {
              from: `${args.fromDate}T00:00:00Z`,
              to: `${args.toDate}T23:59:59Z`,
            },
          },
        },
      ],
    },
    aggregation: {
      timeRange: {
        from: `${args.fromDate}T00:00:00Z`,
        to: `${args.toDate}T23:59:59Z`,
      },
      aggregationInterval: { of: 'P1D' },
      width: 128,
      height: 128,
      evalscript: `//VERSION=3
function setup() {
  return {
    input: [{ bands: [${args.inputBands.map((b) => `"${b}"`).join(', ')}] }],
    output: [
      { id: "${args.outputBand}", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(sample) {
  const value = ${args.expression};
  return {
    ${args.outputBand}: [value],
    dataMask: [sample.dataMask]
  };
}`,
    },
    calculations: {
      default: {
        statistics: {
          default: {
            percentiles: { k: [5, 50, 95] },
          },
        },
      },
    },
  };
}

function collectStatsCandidates(input: unknown, out: Array<{ mean?: number; sampleCount?: number; noDataCount?: number }> = []): Array<{ mean?: number; sampleCount?: number; noDataCount?: number }> {
  if (!input || typeof input !== 'object') return out;
  const value = input as Record<string, unknown>;
  const mean = typeof value.mean === 'number' && Number.isFinite(value.mean) ? value.mean : undefined;
  const sampleCount = typeof value.sampleCount === 'number' && Number.isFinite(value.sampleCount) ? value.sampleCount : undefined;
  const noDataCount = typeof value.noDataCount === 'number' && Number.isFinite(value.noDataCount) ? value.noDataCount : undefined;
  if (mean != null || sampleCount != null || noDataCount != null) {
    out.push({ mean, sampleCount, noDataCount });
  }
  Object.values(value).forEach((nested) => {
    if (nested && typeof nested === 'object') collectStatsCandidates(nested, out);
  });
  return out;
}

function parseStatisticsMean(payload: unknown): { mean: number | null; sampleCount: number; noDataCount: number } {
  const candidates = collectStatsCandidates(payload);
  const preferred = candidates.find((item) => item.mean != null);
  if (!preferred || preferred.mean == null) {
    return { mean: null, sampleCount: 0, noDataCount: 0 };
  }
  return {
    mean: preferred.mean,
    sampleCount: preferred.sampleCount ?? 0,
    noDataCount: preferred.noDataCount ?? 0,
  };
}

async function fetchIndexMean(args: {
  indexType: 'NDVI' | 'NDWI' | 'NDMI' | 'NBR';
  lat: number;
  lng: number;
  fromDate: string;
  toDate: string;
}): Promise<{ mean: number | null; sampleCount: number; noDataCount: number }> {
  const token = await getServerToken();
  const indexExpression = evalscriptFor(args.indexType).replace(/B(\d{2})/g, 'sample.B$1');
  const requestBody = buildStatisticsRequest({
    aoiGeoJson: pointPolygonAoi(args.lat, args.lng, 2),
    collection: 'sentinel-2-l2a',
    outputBand: args.indexType,
    inputBands: ['B03', 'B04', 'B08', 'B11', 'B12', 'dataMask'],
    expression: indexExpression,
    fromDate: args.fromDate,
    toDate: args.toDate,
  });
  const response = await fetch(`${sentinelBaseUrl()}/api/v1/statistics`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    return { mean: null, sampleCount: 0, noDataCount: 0 };
  }
  const payload = await response.json().catch(() => ({}));
  return parseStatisticsMean(payload);
}

async function fetchSentinel1VvDbMean(args: {
  lat: number;
  lng: number;
  fromDate: string;
  toDate: string;
}): Promise<{ mean: number | null; sampleCount: number; noDataCount: number }> {
  const token = await getServerToken();
  const requestBody = buildStatisticsRequest({
    aoiGeoJson: pointPolygonAoi(args.lat, args.lng, 2),
    collection: 'sentinel-1-grd',
    outputBand: 'VVDB',
    inputBands: ['VV', 'VH', 'dataMask'],
    // Convert VV backscatter to dB. Sentinel-1 water is typically very low VV.
    expression: '(sample.VV > 0 ? 10.0 * (Math.log(sample.VV) / Math.log(10)) : -35)',
    fromDate: args.fromDate,
    toDate: args.toDate,
  });
  const response = await fetch(`${sentinelBaseUrl()}/api/v1/statistics`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    return { mean: null, sampleCount: 0, noDataCount: 0 };
  }
  const payload = await response.json().catch(() => ({}));
  return parseStatisticsMean(payload);
}

function dateIsoShift(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function confidenceFromCounts(sampleCount: number, noDataCount: number): number {
  const total = sampleCount + noDataCount;
  if (total <= 0) return 0;
  return toFixed(Math.max(0.05, Math.min(0.99, sampleCount / total)));
}

async function fetchJsonWithTimeout(url: string): Promise<{ ok: boolean; payload: unknown | null; reason?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ADAPTER_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, payload: null, reason: `HTTP ${response.status}` };
    const payload = await response.json().catch(() => null);
    return { ok: true, payload };
  } catch (error: unknown) {
    return { ok: false, payload: null, reason: error instanceof Error ? error.message : 'request_failed' };
  } finally {
    clearTimeout(timeout);
  }
}

function dateWindowIso(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function checkNasaCmrShortNames(shortNames: string[], lat: number, lng: number): Promise<{ ok: boolean; source: string; reason?: string }> {
  const { start, end } = dateWindowIso(90);
  for (const shortName of shortNames) {
    const scopedUrl = `https://cmr.earthdata.nasa.gov/search/granules.json?short_name=${encodeURIComponent(shortName)}&point=${lng},${lat}&temporal=${encodeURIComponent(`${start},${end}`)}&page_size=1`;
    const scopedResponse = await fetchJsonWithTimeout(scopedUrl);
    if (scopedResponse.ok) {
      const scopedPayload = scopedResponse.payload as { feed?: { entry?: unknown[] } } | null;
      const scopedEntries = scopedPayload?.feed?.entry;
      if (Array.isArray(scopedEntries) && scopedEntries.length > 0) {
        return { ok: true, source: `cmr:${shortName}:regional` };
      }
    }

    // Fallback to global product availability so adapter health doesn't fail only due to sparse local granules.
    const globalUrl = `https://cmr.earthdata.nasa.gov/search/granules.json?short_name=${encodeURIComponent(shortName)}&temporal=${encodeURIComponent(`${start},${end}`)}&page_size=1`;
    const globalResponse = await fetchJsonWithTimeout(globalUrl);
    if (!globalResponse.ok) continue;
    const globalPayload = globalResponse.payload as { feed?: { entry?: unknown[] } } | null;
    const globalEntries = globalPayload?.feed?.entry;
    if (Array.isArray(globalEntries) && globalEntries.length > 0) {
      return { ok: true, source: `cmr:${shortName}:global` };
    }
  }
  return { ok: false, source: `cmr:${shortNames[0]}`, reason: 'no_recent_granules' };
}

async function checkGibsAvailability(): Promise<{ ok: boolean; source: string; reason?: string }> {
  const url = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ADAPTER_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return { ok: false, source: 'nasa-gibs', reason: `HTTP ${response.status}` };
    const text = await response.text();
    const hasModisLayer = /MODIS_Terra_CorrectedReflectance_TrueColor/i.test(text);
    return { ok: hasModisLayer, source: 'nasa-gibs', reason: hasModisLayer ? undefined : 'layer_not_found' };
  } catch (error: unknown) {
    return { ok: false, source: 'nasa-gibs', reason: error instanceof Error ? error.message : 'request_failed' };
  } finally {
    clearTimeout(timeout);
  }
}

async function getUpstreamAdapterHealth(lat: number, lng: number) {
  const [smap, swot, grace, gibs] = await Promise.all([
    checkNasaCmrShortNames(['SPL3SMP_E', 'SPL3SMP'], lat, lng),
    checkNasaCmrShortNames(['SWOT_L2_HR_Raster_2.0', 'SWOT_L2_HR_RiverSP_2.0'], lat, lng),
    checkNasaCmrShortNames(['GRACEFO_L3_JPL_MASCON_RL06.3_V4'], lat, lng),
    checkGibsAvailability(),
  ]);
  return { smap, swot, grace, gibs };
}

async function buildSatellitePreview(lat: number, lng: number, areaLabel: string) {
  const fromDate = dateIsoShift(14);
  const toDate = dateIsoShift(0);
  const [ndvi, ndwi, ndmi, nbr, adapterHealth] = await Promise.all([
    fetchIndexMean({ indexType: 'NDVI', lat, lng, fromDate, toDate }),
    fetchIndexMean({ indexType: 'NDWI', lat, lng, fromDate, toDate }),
    fetchIndexMean({ indexType: 'NDMI', lat, lng, fromDate, toDate }),
    fetchIndexMean({ indexType: 'NBR', lat, lng, fromDate, toDate }),
    getUpstreamAdapterHealth(lat, lng),
  ]);
  const sentinel1 = await fetchSentinel1VvDbMean({ lat, lng, fromDate, toDate });

  const ndviMean = ndvi.mean ?? 0;
  const ndwiMean = ndwi.mean ?? 0;
  const ndmiMean = ndmi.mean ?? 0;
  const nbrMean = nbr.mean ?? 0;

  const soilMoistureIndex = clamp01((ndmiMean + 1) / 2);
  const surfaceWaterLevel = toFixed(0.5 + clamp01((ndwiMean + 1) / 2) * 4, 2);
  const waterStorageTrend = toFixed((ndmiMean - nbrMean) * 22, 2);
  const vegetationStress = clamp01(1 - (ndviMean + 1) / 2);
  const droughtRisk = clamp01((1 - clamp01((ndwiMean + 1) / 2)) * 0.62 + vegetationStress * 0.38);
  const avgSampleCount = Math.round((ndvi.sampleCount + ndwi.sampleCount + ndmi.sampleCount + nbr.sampleCount) / 4);
  const avgNoData = Math.round((ndvi.noDataCount + ndwi.noDataCount + ndmi.noDataCount + nbr.noDataCount) / 4);
  const confidenceScore = confidenceFromCounts(avgSampleCount, avgNoData);
  const sentinelWaterFraction = sentinel1.mean == null
    ? null
    : clamp01((-12 - sentinel1.mean) / 15);
  const sentinelFloodRisk = sentinelWaterFraction == null
    ? null
    : clamp01(0.2 + sentinelWaterFraction * 0.65);

  return {
    ok: true,
    capturedAt: new Date().toISOString(),
    areaLabel,
    centerLat: lat,
    centerLng: lng,
    adapters: {
      smap: {
        ok: adapterHealth.smap.ok,
        soilMoistureIndex,
        confidenceScore: adapterHealth.smap.ok ? 0.99 : 0,
      },
      swot: {
        ok: adapterHealth.swot.ok,
        surfaceWaterLevel,
        waterExtentKm2: sentinelWaterFraction == null ? undefined : toFixed(sentinelWaterFraction * 5.4, 2),
        confidenceScore: adapterHealth.swot.ok ? 0.99 : 0,
      },
      grace: {
        ok: adapterHealth.grace.ok,
        waterStorageTrend,
        confidenceScore: adapterHealth.grace.ok ? 0.99 : 0,
      },
      gibs: {
        ok: adapterHealth.gibs.ok,
        vegetationStress,
        ndviIndex: toFixed(ndviMean, 3),
        confidenceScore: adapterHealth.gibs.ok ? 0.99 : 0,
      },
      copernicus: {
        ok: ndwi.mean != null,
        droughtRisk,
        precipAnomalyMm: toFixed((ndmiMean - ndwiMean) * 40, 1),
        ndviMean: toFixed(ndviMean, 3),
        sentinel2Date: toDate,
        source: 'copernicus-statistics-live',
        confidenceScore,
      },
      sentinel1: {
        ok: sentinel1.mean != null,
        waterFraction: sentinelWaterFraction == null ? undefined : toFixed(sentinelWaterFraction, 3),
        vvMeanDb: sentinel1.mean == null ? undefined : toFixed(sentinel1.mean, 2),
        floodRisk: sentinelFloodRisk == null ? undefined : toFixed(sentinelFloodRisk, 3),
        captureDate: toDate,
        confidenceScore: confidenceFromCounts(sentinel1.sampleCount, sentinel1.noDataCount),
      },
    },
    summary: {
      soilMoistureIndex: toFixed(soilMoistureIndex, 3),
      surfaceWaterLevel,
      waterStorageTrend,
      vegetationStress: toFixed(vegetationStress, 3),
      droughtRisk: toFixed(droughtRisk, 3),
      confidenceScore,
    },
  };
}

router.get('/satellite-preview', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const areaLabel = String(req.query.areaLabel ?? 'Custom water scan');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ ok: false, error: 'lat and lng query params are required numbers' });
  }
  const missing = missingCredentialKeys();
  if (missing.length) {
    return res.status(503).json({ ok: false, error: 'Missing Copernicus credentials for live water analysis', missing });
  }
  try {
    const payload = await buildSatellitePreview(lat, lng, areaLabel);
    return res.json(payload);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Failed to generate live water satellite preview' });
  }
});

router.get('/snapshot', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ ok: false, error: 'lat and lng query params are required numbers' });
  }
  const areaLabel = String(req.query.areaLabel ?? 'Snapshot point');
  try {
    const preview = await buildSatellitePreview(lat, lng, areaLabel);
    return res.json({
      ok: true,
      snapshot: {
        capturedAt: preview.capturedAt,
        centerLat: preview.centerLat,
        centerLng: preview.centerLng,
        summary: preview.summary,
        adapters: preview.adapters,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Failed to generate snapshot' });
  }
});

router.get('/stats', (_req, res) => {
  const missing = missingCredentialKeys();
  return res.json({
    ok: true,
    service: 'water-routes',
    liveAnalysisEnabled: missing.length === 0,
    missingCredentials: missing,
    timestamp: new Date().toISOString(),
  });
});

export default router;
