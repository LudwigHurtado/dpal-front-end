import { Router } from 'express';

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
} | null;

type OverlayType =
  | 'ndwi_water_presence'
  | 'water_extent'
  | 'flood_wet'
  | 'risk_zones'
  | 'flow_direction';

type SupportedCollection = 'sentinel-2-l2a' | 'sentinel-1-grd' | 'copernicus-dem';

type OverlayRequestBody = {
  aoiGeoJson?: {
    type?: string;
    coordinates?: number[][][];
  };
  dateRange?: {
    fromDate?: string;
    toDate?: string;
  };
  indexType?: string;
  collection?: string;
  threshold?: number;
};

const router = Router();
let tokenCache: TokenCache = null;

const TOKEN_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const DEFAULT_BASE_URL = 'https://services.sentinel-hub.com';
const GRID_SIZE = 32;
const SUPPORTED_COLLECTIONS: SupportedCollection[] = ['sentinel-2-l2a', 'sentinel-1-grd', 'copernicus-dem'];

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

async function proxyToSentinel(path: string, body: unknown): Promise<{ status: number; payload: unknown }> {
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

function unavailable(
  overlayType: OverlayType,
  reason: string,
  warnings: string[] = [],
): Record<string, unknown> {
  return {
    ok: false,
    overlayType,
    status: 'unavailable',
    reason,
    warnings,
  };
}

function hasValidPolygonAoi(aoi: OverlayRequestBody['aoiGeoJson']): aoi is NonNullable<OverlayRequestBody['aoiGeoJson']> {
  if (!aoi || aoi.type !== 'Polygon' || !Array.isArray(aoi.coordinates) || !aoi.coordinates.length) return false;
  const ring = aoi.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) return false;
  return ring.every((point) => Array.isArray(point) && point.length === 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]));
}

function isValidDateRange(dateRange: OverlayRequestBody['dateRange']): dateRange is NonNullable<OverlayRequestBody['dateRange']> {
  if (!dateRange?.fromDate || !dateRange?.toDate) return false;
  const from = new Date(dateRange.fromDate);
  const to = new Date(dateRange.toDate);
  return Number.isFinite(from.getTime()) && Number.isFinite(to.getTime()) && from <= to;
}

function bboxFromAoi(aoiGeoJson: NonNullable<OverlayRequestBody['aoiGeoJson']>): [number, number, number, number] {
  const ring = aoiGeoJson.coordinates![0];
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [minLng, minLat, maxLng, maxLat];
}

function pointInRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: [number, number], polygon: number[][][]): boolean {
  return pointInRing(point, polygon[0]);
}

function extractNumericGrid(payload: unknown): number[][] | null {
  const visited = new Set<unknown>();

  function walk(value: unknown): number[][] | null {
    if (!value || typeof value !== 'object') return null;
    if (visited.has(value)) return null;
    visited.add(value);
    if (Array.isArray(value) && value.length > 0 && value.every((row) => Array.isArray(row))) {
      const grid = value as unknown[];
      const numericRows = grid.every((row) =>
        Array.isArray(row) && row.every((cell) => typeof cell === 'number' || cell === null),
      );
      if (numericRows) {
        return (value as Array<Array<number | null>>).map((row) => row.map((cell) => (typeof cell === 'number' ? cell : Number.NaN)));
      }
    }
    const entries = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
    for (const next of entries) {
      const result = walk(next);
      if (result) return result;
    }
    return null;
  }

  return walk(payload);
}

function calculateStatistics(values: number[]): {
  mean: number | null;
  min: number | null;
  max: number | null;
  standardDeviation: number | null;
} {
  if (values.length === 0) {
    return { mean: null, min: null, max: null, standardDeviation: null };
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return {
    mean: Number(mean.toFixed(6)),
    min: Number(Math.min(...values).toFixed(6)),
    max: Number(Math.max(...values).toFixed(6)),
    standardDeviation: Number(Math.sqrt(variance).toFixed(6)),
  };
}

function buildFeatureCollection(features: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    type: 'FeatureCollection',
    features,
  };
}

function cellPolygon(
  minLng: number,
  minLat: number,
  cellWidth: number,
  cellHeight: number,
  rowIndex: number,
  colIndex: number,
): number[][][] {
  const x1 = minLng + colIndex * cellWidth;
  const x2 = x1 + cellWidth;
  const y2 = minLat + rowIndex * cellHeight;
  const y1 = y2 + cellHeight;
  return [[
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
    [x1, y1],
  ]];
}

function confidenceFromCounts(sampleCount: number, noDataCount: number): number {
  const total = sampleCount + noDataCount;
  if (total <= 0) return 0;
  return Number(Math.max(0.05, Math.min(0.99, sampleCount / total)).toFixed(3));
}

function buildProcessRequest(args: {
  aoiGeoJson: NonNullable<OverlayRequestBody['aoiGeoJson']>;
  collection: SupportedCollection;
  fromDate: string;
  toDate: string;
  evalscript: string;
}): Record<string, unknown> {
  const [minLng, minLat, maxLng, maxLat] = bboxFromAoi(args.aoiGeoJson);
  return {
    input: {
      bounds: {
        bbox: [minLng, minLat, maxLng, maxLat],
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
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
    output: {
      width: GRID_SIZE,
      height: GRID_SIZE,
      responses: [{ identifier: 'default', format: { type: 'application/json' } }],
    },
    evalscript: args.evalscript,
  };
}

function overlayEvalscript(overlayType: OverlayType, collection: SupportedCollection): string | null {
  if (overlayType === 'flow_direction') {
    if (collection !== 'copernicus-dem') return null;
    return `//VERSION=3
function setup(){return {input:["DEM"], output:{bands:1,sampleType:"FLOAT32"}}}
function evaluatePixel(sample){return [sample.DEM];}`;
  }

  if (collection === 'sentinel-1-grd') {
    return `//VERSION=3
function setup(){return {input:["VV","VH"], output:{bands:1,sampleType:"FLOAT32"}}}
function evaluatePixel(sample){
  const vv = sample.VV;
  const vh = sample.VH;
  const wetness = (-1 * vv) + (-0.5 * vh);
  return [wetness];
}`;
  }

  if (overlayType === 'flood_wet') {
    return `//VERSION=3
function setup(){return {input:["B03","B08","B11"], output:{bands:1,sampleType:"FLOAT32"}}}
function evaluatePixel(sample){
  return [((sample.B03 - sample.B11) / (sample.B03 + sample.B11 + 0.0001))];
}`;
  }

  return `//VERSION=3
function setup(){return {input:["B03","B08"], output:{bands:1,sampleType:"FLOAT32"}}}
function evaluatePixel(sample){
  return [((sample.B03 - sample.B08) / (sample.B03 + sample.B08 + 0.0001))];
}`;
}

function buildAvailableOverlay(args: {
  overlayType: OverlayType;
  body: Required<Pick<OverlayRequestBody, 'dateRange'>> & OverlayRequestBody;
  geometry: Record<string, unknown> | null;
  statistics: Record<string, unknown>;
  confidence: number;
  warnings: string[];
}): Record<string, unknown> {
  return {
    ok: true,
    overlayType: args.overlayType,
    source: 'copernicus_derived',
    sourceName: 'Copernicus Sentinel Hub',
    status: 'available',
    dateRange: args.body.dateRange,
    collection: args.body.collection,
    indexType: args.body.indexType,
    threshold: args.body.threshold,
    geometry: args.geometry,
    rasterTileUrl: null,
    statistics: args.statistics,
    confidence: args.confidence,
    warnings: args.warnings,
    generatedAt: new Date().toISOString(),
  };
}

async function deriveClassificationOverlay(
  overlayType: OverlayType,
  body: OverlayRequestBody,
): Promise<Record<string, unknown>> {
  if (missingCredentialKeys().length) {
    return unavailable(overlayType, 'Copernicus backend not configured.');
  }
  if (!hasValidPolygonAoi(body.aoiGeoJson)) {
    return unavailable(overlayType, 'Valid AOI GeoJSON polygon required.');
  }
  if (!isValidDateRange(body.dateRange)) {
    return unavailable(overlayType, 'Valid date range required.');
  }
  if (!body.collection || !SUPPORTED_COLLECTIONS.includes(body.collection as SupportedCollection)) {
    return unavailable(overlayType, 'Supported collection required.');
  }

  const threshold = typeof body.threshold === 'number' ? body.threshold : 0.2;
  const evalscript = overlayEvalscript(overlayType, body.collection as SupportedCollection);
  if (!evalscript) {
    return unavailable(overlayType, 'No live-derived overlay returned for this AOI/date.');
  }

  const requestBody = buildProcessRequest({
    aoiGeoJson: body.aoiGeoJson,
    collection: body.collection as SupportedCollection,
    fromDate: body.dateRange.fromDate!,
    toDate: body.dateRange.toDate!,
    evalscript,
  });

  const { status, payload } = await proxyToSentinel('/api/v1/process', requestBody);
  if (status >= 400) {
    return unavailable(overlayType, 'No live-derived overlay returned for this AOI/date.');
  }

  const grid = extractNumericGrid(payload);
  if (!grid || grid.length === 0 || grid[0]?.length === 0) {
    return unavailable(overlayType, 'No live-derived overlay returned for this AOI/date.');
  }

  const [minLng, minLat, maxLng, maxLat] = bboxFromAoi(body.aoiGeoJson);
  const aoiCoordinates = body.aoiGeoJson.coordinates!;
  const cellWidth = (maxLng - minLng) / grid[0].length;
  const cellHeight = (maxLat - minLat) / grid.length;
  const features: Array<Record<string, unknown>> = [];
  const validValues: number[] = [];
  let noDataCount = 0;

  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex += 1) {
      const value = grid[rowIndex][colIndex];
      const center: [number, number] = [
        minLng + (colIndex + 0.5) * cellWidth,
        minLat + (rowIndex + 0.5) * cellHeight,
      ];
      if (!pointInPolygon(center, aoiCoordinates)) {
        noDataCount += 1;
        continue;
      }
      if (!Number.isFinite(value)) {
        noDataCount += 1;
        continue;
      }
      validValues.push(value);

      const includeFeature = overlayType === 'risk_zones'
        ? value >= threshold * 1.25
        : overlayType === 'water_extent'
          ? value >= threshold + 0.08
          : value >= threshold;

      if (!includeFeature) continue;

      features.push({
        type: 'Feature',
        properties: {
          overlayType,
          value: Number(value.toFixed(6)),
          threshold,
        },
        geometry: {
          type: 'Polygon',
          coordinates: cellPolygon(minLng, minLat, cellWidth, cellHeight, rowIndex, colIndex),
        },
      });
    }
  }

  if (overlayType === 'flow_direction') {
    if (validValues.length < 2) {
      return unavailable(overlayType, 'No live-derived overlay returned for this AOI/date.');
    }

    let highest: { value: number; point: [number, number] } | null = null;
    let lowest: { value: number; point: [number, number] } | null = null;
    for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
      for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex += 1) {
        const value = grid[rowIndex][colIndex];
        const center: [number, number] = [
          minLng + (colIndex + 0.5) * cellWidth,
          minLat + (rowIndex + 0.5) * cellHeight,
        ];
        if (!pointInPolygon(center, aoiCoordinates) || !Number.isFinite(value)) continue;
        if (!highest || value > highest.value) highest = { value, point: center };
        if (!lowest || value < lowest.value) lowest = { value, point: center };
      }
    }
    if (!highest || !lowest) {
      return unavailable(overlayType, 'No live-derived overlay returned for this AOI/date.');
    }
    const flowGeometry = buildFeatureCollection([
      {
        type: 'Feature',
        properties: {
          overlayType,
          direction: 'derived_dem_gradient',
          fromElevation: Number(highest.value.toFixed(3)),
          toElevation: Number(lowest.value.toFixed(3)),
        },
        geometry: {
          type: 'LineString',
          coordinates: [highest.point, lowest.point],
        },
      },
    ]);
    const stats = calculateStatistics(validValues);
    const confidence = confidenceFromCounts(validValues.length, noDataCount);
    return buildAvailableOverlay({
      overlayType,
      body: { ...body, dateRange: body.dateRange! },
      geometry: flowGeometry,
      statistics: {
        ...stats,
        sampleCount: validValues.length,
        noDataCount,
        cloudCover: null,
        confidence,
        resolutionMeters: null,
      },
      confidence,
      warnings: ['Resolution unavailable.'],
    });
  }

  if (features.length === 0) {
    return unavailable(overlayType, 'No live-derived overlay returned for this AOI/date.');
  }

  const stats = calculateStatistics(validValues);
  const confidence = confidenceFromCounts(validValues.length, noDataCount);
  const warnings: string[] = [];
  if (confidence < 0.55) warnings.push('Low confidence for current AOI/date coverage.');
  if (overlayType === 'risk_zones') warnings.push('Risk zones are screening indicators derived from live satellite classification.');

  return buildAvailableOverlay({
    overlayType,
    body: { ...body, dateRange: body.dateRange! },
    geometry: buildFeatureCollection(features),
    statistics: {
      ...stats,
      sampleCount: validValues.length,
      noDataCount,
      cloudCover: null,
      confidence,
      resolutionMeters: null,
    },
    confidence,
    warnings,
  });
}

router.post('/overlays/ndwi', async (req, res) => {
  res.json(await deriveClassificationOverlay('ndwi_water_presence', req.body ?? {}));
});

router.post('/overlays/water-extent', async (req, res) => {
  res.json(await deriveClassificationOverlay('water_extent', req.body ?? {}));
});

router.post('/overlays/flood-wet', async (req, res) => {
  res.json(await deriveClassificationOverlay('flood_wet', req.body ?? {}));
});

router.post('/overlays/risk-zones', async (req, res) => {
  res.json(await deriveClassificationOverlay('risk_zones', req.body ?? {}));
});

router.post('/overlays/flow-direction', async (req, res) => {
  res.json(await deriveClassificationOverlay('flow_direction', req.body ?? {}));
});

export default router;
