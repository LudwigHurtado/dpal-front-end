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
const ALLOWED_INDEX_TYPES = ['NDVI', 'NDWI', 'NDMI', 'NBR'] as const;
const ALLOWED_COLLECTIONS = ['sentinel-2-l2a', 'sentinel-1-grd'] as const;
type AllowedIndexType = (typeof ALLOWED_INDEX_TYPES)[number];
type AllowedCollection = (typeof ALLOWED_COLLECTIONS)[number];

function missingCredentialKeys(): string[] {
  const missing: string[] = [];
  if (!process.env.COPERNICUS_CLIENT_ID?.trim()) missing.push('COPERNICUS_CLIENT_ID');
  if (!process.env.COPERNICUS_CLIENT_SECRET?.trim()) missing.push('COPERNICUS_CLIENT_SECRET');
  return missing;
}

function requireConfigured(): { ok: true } | { ok: false; missing: string[] } {
  const missing = missingCredentialKeys();
  if (missing.length) return { ok: false, missing };
  return { ok: true };
}

function tokenUrl(): string {
  return process.env.COPERNICUS_TOKEN_URL?.trim() || DEFAULT_TOKEN_URL;
}

function sentinelBaseUrl(): string {
  return (process.env.COPERNICUS_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function fetchNewAccessToken(): Promise<{ token: string; expiresInSec: number }> {
  const clientId = process.env.COPERNICUS_CLIENT_ID?.trim() ?? '';
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET?.trim() ?? '';
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
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

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function evalscriptFor(indexType: AllowedIndexType): string {
  if (indexType === 'NDVI') return '(B08-B04)/(B08+B04)';
  if (indexType === 'NDWI') return '(B03-B08)/(B03+B08)';
  if (indexType === 'NDMI') return '(B08-B11)/(B08+B11)';
  return '(B08-B12)/(B08+B12)';
}

function deriveConfidenceScore(args: {
  mean: number | null;
  sampleCount: number;
  noDataCount: number;
  cloudCoverage: number | null;
}): number {
  const cloudPenalty = args.cloudCoverage == null ? 0.15 : Math.min(0.45, Math.max(0, args.cloudCoverage) / 100 * 0.6);
  const nodataRatio = args.sampleCount <= 0 ? 0.7 : Math.min(0.7, args.noDataCount / Math.max(1, args.sampleCount + args.noDataCount));
  const base = args.mean == null ? 0.35 : 0.75;
  return Number(Math.max(0.05, Math.min(0.99, base - cloudPenalty - nodataRatio)).toFixed(3));
}

function normalizeStatisticsPayload(input: any, requestBody: any) {
  const rows = Array.isArray(input?.data) ? input.data : [];
  if (!rows.length) {
    return {
      indexType: String(requestBody?.indexType ?? 'NDVI'),
      mean: null,
      min: null,
      max: null,
      stDev: null,
      sampleCount: 0,
      noDataCount: 0,
      cloudCoverage: null,
      fromDate: String(requestBody?.dateRange?.from ?? ''),
      toDate: String(requestBody?.dateRange?.to ?? ''),
      collection: String(requestBody?.collection ?? 'sentinel-2-l2a'),
      sourceCitation: 'Copernicus Data Space / Sentinel Hub Statistical API',
      confidenceScore: 0.2,
    };
  }

  let sumMean = 0;
  let meanCount = 0;
  let minVal: number | null = null;
  let maxVal: number | null = null;
  let sumStDev = 0;
  let stDevCount = 0;
  let sampleCount = 0;
  let noDataCount = 0;

  for (const row of rows) {
    const stats = row?.outputs?.default?.bands?.B0?.stats ?? row?.outputs?.default?.stats ?? null;
    if (!stats) continue;
    const mean = asNumber(stats.mean);
    const min = asNumber(stats.min);
    const max = asNumber(stats.max);
    const stDev = asNumber(stats.stDev);
    const samples = asNumber(stats.sampleCount);
    const noData = asNumber(stats.noDataCount);
    if (mean != null) {
      sumMean += mean;
      meanCount += 1;
    }
    if (min != null) minVal = minVal == null ? min : Math.min(minVal, min);
    if (max != null) maxVal = maxVal == null ? max : Math.max(maxVal, max);
    if (stDev != null) {
      sumStDev += stDev;
      stDevCount += 1;
    }
    if (samples != null) sampleCount += samples;
    if (noData != null) noDataCount += noData;
  }

  const cloudCoverage = asNumber(requestBody?.cloudCoverage);
  const mean = meanCount > 0 ? Number((sumMean / meanCount).toFixed(6)) : null;
  const stDev = stDevCount > 0 ? Number((sumStDev / stDevCount).toFixed(6)) : null;

  return {
    indexType: String(requestBody?.indexType ?? 'NDVI'),
    mean,
    min: minVal,
    max: maxVal,
    stDev,
    sampleCount,
    noDataCount,
    cloudCoverage,
    fromDate: String(requestBody?.dateRange?.from ?? rows[0]?.interval?.from ?? ''),
    toDate: String(requestBody?.dateRange?.to ?? rows[rows.length - 1]?.interval?.to ?? ''),
    collection: String(requestBody?.collection ?? 'sentinel-2-l2a'),
    sourceCitation: 'Copernicus Data Space / Sentinel Hub Statistical API',
    confidenceScore: deriveConfidenceScore({ mean, sampleCount, noDataCount, cloudCoverage }),
  };
}

function hasValidPolygonAoi(aoi: any): boolean {
  if (!aoi || aoi.type !== 'Polygon' || !Array.isArray(aoi.coordinates) || !aoi.coordinates.length) return false;
  const ring = aoi.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) return false;
  return ring.every((p: any) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

function isValidDateWindow(window: any): boolean {
  if (!window?.fromDate || !window?.toDate) return false;
  const from = new Date(window.fromDate);
  const to = new Date(window.toDate);
  return Number.isFinite(from.getTime()) && Number.isFinite(to.getTime()) && from <= to;
}

function buildStatisticsRequest(args: {
  aoiGeoJson: any;
  indexType: AllowedIndexType;
  collection: AllowedCollection;
  fromDate: string;
  toDate: string;
}): any {
  return {
    input: {
      bounds: { geometry: args.aoiGeoJson },
      data: [
        {
          type: args.collection,
          dataFilter: {
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
      aggregationInterval: { of: 'P1M' },
      evalscript: `//VERSION=3
function setup(){return {input:["B03","B04","B08","B11","B12"], output:{bands:1,sampleType:"FLOAT32"}}}
function evaluatePixel(sample){return [${evalscriptFor(args.indexType)}];}`,
    },
    calculations: { default: { statistics: { default: { percentiles: { k: [50] } } } } },
  };
}

function buildWarnings(args: {
  before: any;
  after: any;
  deltaPercent: number | null;
  indexType: AllowedIndexType;
}): string[] {
  const warnings: string[] = [];
  if ((args.before.cloudCoverage ?? 0) > 35 || (args.after.cloudCoverage ?? 0) > 35) warnings.push('High cloud coverage may reduce reliability.');
  if ((args.before.sampleCount ?? 0) < 500 || (args.after.sampleCount ?? 0) < 500) warnings.push('Low sample count detected for AOI/time window.');
  if ((args.before.noDataCount ?? 0) > (args.before.sampleCount ?? 0) || (args.after.noDataCount ?? 0) > (args.after.sampleCount ?? 0)) warnings.push('High noDataCount detected.');
  if (args.deltaPercent != null && Math.abs(args.deltaPercent) < 1) warnings.push('Weak before/after delta.');
  const confidence = Math.min(args.before.confidenceScore ?? 0, args.after.confidenceScore ?? 0);
  if (confidence < 0.55) warnings.push('Insufficient confidence for VIU estimate.');
  if (args.indexType === 'NBR') warnings.push('Index mismatch risk: NBR is best for burn disturbance context.');
  return warnings;
}

function interpretation(indexType: AllowedIndexType, deltaPercent: number | null): string {
  if (deltaPercent == null) return 'No valid delta available.';
  const direction = deltaPercent > 0 ? 'increase' : deltaPercent < 0 ? 'decrease' : 'no_change';
  if (indexType === 'NDVI') return direction === 'increase' ? 'Vegetation condition appears improved.' : 'Vegetation condition may be declining.';
  if (indexType === 'NDWI') return direction === 'increase' ? 'Water presence appears to increase.' : 'Water presence appears to decrease.';
  if (indexType === 'NDMI') return direction === 'increase' ? 'Moisture condition appears improved.' : 'Moisture stress may be increasing.';
  return direction === 'increase' ? 'Burn/disturbance signal may be increasing.' : 'Burn/disturbance signal may be stabilizing or reducing.';
}

async function proxyToSentinel(path: string, body: unknown): Promise<{ status: number; payload: any }> {
  const token = await getServerToken();
  const response = await fetch(`${sentinelBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

router.get('/status', (_req, res) => {
  const configured = missingCredentialKeys().length === 0;
  return res.json({
    ok: true,
    configured,
    missing: missingCredentialKeys(),
    enabled: process.env.COPERNICUS_ENABLED === 'true' || configured,
    source: 'backend_proxy',
    message: configured
      ? 'Copernicus backend proxy is configured.'
      : 'Copernicus backend not configured.',
  });
});

router.post('/catalog/search', async (req, res) => {
  const cfg = requireConfigured();
  if (!cfg.ok) return res.status(503).json({ ok: false, error: 'Missing Copernicus credentials', missing: cfg.missing });
  try {
    const { status, payload } = await proxyToSentinel('/api/v1/catalog/1.0.0/search', req.body ?? {});
    if (status >= 400) return res.status(status).json({ ok: false, error: 'Copernicus catalog error', details: payload });
    return res.json({ ok: true, sourceCitation: 'Copernicus Catalog/STAC API', ...payload });
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Catalog proxy failed' });
  }
});

router.post('/process', async (req, res) => {
  const cfg = requireConfigured();
  if (!cfg.ok) return res.status(503).json({ ok: false, error: 'Missing Copernicus credentials', missing: cfg.missing });
  try {
    const { status, payload } = await proxyToSentinel('/api/v1/process', req.body ?? {});
    if (status >= 400) return res.status(status).json({ ok: false, error: 'Copernicus process error', details: payload });
    return res.json({ ok: true, sourceCitation: 'Copernicus Process API', payload });
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Process proxy failed' });
  }
});

router.post('/statistics', async (req, res) => {
  const cfg = requireConfigured();
  if (!cfg.ok) return res.status(503).json({ ok: false, error: 'Missing Copernicus credentials', missing: cfg.missing });
  const body = req.body ?? {};
  if (!hasValidPolygonAoi(body.aoiGeoJson)) return res.status(400).json({ ok: false, error: 'valid GeoJSON polygon required' });
  if (!isValidDateWindow(body.before) || !isValidDateWindow(body.after)) return res.status(400).json({ ok: false, error: 'before and after date ranges required' });
  if (!ALLOWED_INDEX_TYPES.includes(body.indexType)) return res.status(400).json({ ok: false, error: 'indexType must be one of NDVI, NDWI, NDMI, NBR' });
  if (!ALLOWED_COLLECTIONS.includes(body.collection)) return res.status(400).json({ ok: false, error: 'unsupported collection' });
  if (body.before.fromDate === body.after.fromDate && body.before.toDate === body.after.toDate) {
    return res.status(400).json({ ok: false, error: 'before and after ranges cannot be identical' });
  }
  try {
    const beforeReq = buildStatisticsRequest({
      aoiGeoJson: body.aoiGeoJson,
      indexType: body.indexType,
      collection: body.collection,
      fromDate: body.before.fromDate,
      toDate: body.before.toDate,
    });
    const afterReq = buildStatisticsRequest({
      aoiGeoJson: body.aoiGeoJson,
      indexType: body.indexType,
      collection: body.collection,
      fromDate: body.after.fromDate,
      toDate: body.after.toDate,
    });
    const [beforeResult, afterResult] = await Promise.all([
      proxyToSentinel('/api/v1/statistics', beforeReq),
      proxyToSentinel('/api/v1/statistics', afterReq),
    ]);
    if (beforeResult.status >= 400 || afterResult.status >= 400) {
      return res.status(Math.max(beforeResult.status, afterResult.status)).json({
        ok: false,
        error: 'Copernicus statistics error',
        details: { before: beforeResult.payload, after: afterResult.payload },
      });
    }
    const before = normalizeStatisticsPayload(beforeResult.payload, {
      indexType: body.indexType,
      collection: body.collection,
      dateRange: { from: body.before.fromDate, to: body.before.toDate },
      cloudCoverage: body.before.cloudCoverage ?? null,
    });
    const after = normalizeStatisticsPayload(afterResult.payload, {
      indexType: body.indexType,
      collection: body.collection,
      dateRange: { from: body.after.fromDate, to: body.after.toDate },
      cloudCoverage: body.after.cloudCoverage ?? null,
    });
    const absoluteChange = before.mean != null && after.mean != null ? Number((after.mean - before.mean).toFixed(6)) : null;
    const percentChange = before.mean != null && before.mean !== 0 && after.mean != null
      ? Number((((after.mean - before.mean) / Math.abs(before.mean)) * 100).toFixed(2))
      : null;
    const warnings = buildWarnings({ before, after, deltaPercent: percentChange, indexType: body.indexType });
    const confidenceScore = Number((((before.confidenceScore ?? 0) + (after.confidenceScore ?? 0)) / 2).toFixed(3));
    const response = {
      indexType: body.indexType,
      collection: body.collection,
      aoiGeoJson: body.aoiGeoJson,
      before: {
        mean: before.mean,
        min: before.min,
        max: before.max,
        stDev: before.stDev,
        sampleCount: before.sampleCount,
        noDataCount: before.noDataCount,
        cloudCoverage: before.cloudCoverage,
        fromDate: body.before.fromDate,
        toDate: body.before.toDate,
        confidenceScore: before.confidenceScore,
      },
      after: {
        mean: after.mean,
        min: after.min,
        max: after.max,
        stDev: after.stDev,
        sampleCount: after.sampleCount,
        noDataCount: after.noDataCount,
        cloudCoverage: after.cloudCoverage,
        fromDate: body.after.fromDate,
        toDate: body.after.toDate,
        confidenceScore: after.confidenceScore,
      },
      delta: {
        absoluteChange,
        percentChange,
        direction: percentChange == null ? 'unknown' : percentChange > 0 ? 'increase' : percentChange < 0 ? 'decrease' : 'no_change',
        interpretation: interpretation(body.indexType, percentChange),
      },
      confidenceScore,
      warnings,
      sourceCitation: 'Copernicus Data Space / Sentinel Hub Statistical API',
      generatedAt: new Date().toISOString(),
    };
    return res.json({ ok: true, comparison: response });
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Statistics proxy failed' });
  }
});

router.post('/evidence-packet', (req, res) => {
  const body = req.body ?? {};
  const required = ['projectId', 'projectName', 'indexType', 'satelliteCollection', 'acquisitionDate'];
  const missing = required.filter((key) => !body[key]);
  if (missing.length) return res.status(400).json({ ok: false, error: `Missing required evidence fields: ${missing.join(', ')}` });
  return res.json({
    ok: true,
    packet: {
      ...body,
      generatedAt: body.generatedAt || new Date().toISOString(),
      assumptions: Array.isArray(body.assumptions) ? body.assumptions : ['Satellite-derived index values are indicative and require contextual validation.'],
      limitations: Array.isArray(body.limitations) ? body.limitations : ['Not a certified carbon credit claim.'],
    },
  });
});

export default router;
