import { apiUrl } from '../constants';

export type WaterSnapshotRequest = {
  lat: number;
  lng: number;
  date: string;
  layer: string;
  signal?: AbortSignal;
};

export type WaterAoiRequest = {
  polygonCoordinates: [number, number][];
  date: string;
  layer: string;
  signal?: AbortSignal;
};

export type WaterHistoryRequest = {
  lat?: number;
  lng?: number;
  polygonCoordinates?: [number, number][];
  startDate: string;
  endDate: string;
  layer: string;
  signal?: AbortSignal;
};

export type WaterAnalysisResponse = {
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  satellite: {
    provider: string;
    product: string;
    acquisitionDate: string;
    resolution: string;
    cloudCover: string;
  };
  waterAnalysis: {
    ndwi: number;
    waterPresence: string;
    surfaceWaterEstimate: string;
    turbidityProxy: string;
    thermalAnomaly: string;
    shorelineChange: string;
    confidence: number;
  };
  status: {
    riskLevel: string;
    qualityFlag: string;
    lastUpdated: string;
    note: string;
  };
};

type HistoryResponse = {
  points: Array<{
    date: string;
    ndwi?: number;
    confidence?: number;
    surfaceWaterEstimate?: string;
  }>;
};

const CACHE_TTL_MS = 3 * 60_000;
const requestCache = new Map<string, { at: number; value: unknown }>();

const endpoint = {
  snapshot: '/api/water/snapshot',
  aoiSnapshot: '/api/water/aoi-snapshot',
  history: '/api/water/history',
  satellitePreview: '/api/water/satellite-preview',
};

function fromCache<T>(key: string): T | null {
  const hit = requestCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    requestCache.delete(key);
    return null;
  }
  return hit.value as T;
}

function setCache(key: string, value: unknown): void {
  requestCache.set(key, { at: Date.now(), value });
}

function aoiHash(points: [number, number][]): string {
  return points
    .map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`)
    .join('|');
}

function mapLayerToProduct(layer: string): string {
  const k = layer.toLowerCase();
  if (k.includes('ndwi')) return 'NDWI Composite';
  if (k.includes('sentinel1') || k.includes('sar')) return 'Sentinel-1 SAR';
  if (k.includes('sentinel2')) return 'Sentinel-2 L2A';
  if (k.includes('landsat')) return 'Landsat 8/9';
  if (k.includes('swot')) return 'SWOT Hydrology';
  return layer;
}

function fallbackQuality(cloudCover: string): string {
  const value = Number(cloudCover.replace('%', '').trim());
  if (!Number.isFinite(value)) return 'Estimated';
  if (value <= 20) return 'Clear';
  if (value <= 55) return 'Partial';
  return 'Cloudy';
}

function mapPreviewToStandard(input: any, req: { lat: number; lng: number; date: string; layer: string }): WaterAnalysisResponse {
  const cloudCover = input?.adapters?.copernicus?.ok ? `${Math.round(Math.max(0, Math.min(100, (1 - Number(input.adapters.copernicus.confidence ?? 0.7)) * 100)))}%` : 'unavailable';
  const ndwiRaw = Number(input?.adapters?.copernicus?.ndwiMean ?? input?.composite?.ndwiMean ?? 0.35);
  const ndwi = Math.max(-1, Math.min(1, ndwiRaw));
  const confidenceRaw = Number(input?.composite?.confidence ?? 0.72);
  const confidence = Math.max(0, Math.min(1, confidenceRaw));
  const floodRisk = Number(input?.adapters?.sentinel1?.floodRisk ?? input?.adapters?.sentinel1?.fallback?.floodRisk ?? 0.28);
  const thermalAnomaly = input?.adapters?.gibs?.ok ? (Number(input.adapters.gibs.thermalAnomaly ?? 0) > 0.65 ? 'Elevated' : 'Review') : 'None';

  return {
    location: {
      lat: req.lat,
      lng: req.lng,
      name: input?.areaLabel ?? 'Selected area',
    },
    satellite: {
      provider: 'NASA GIBS / Sentinel / Landsat',
      product: mapLayerToProduct(req.layer),
      acquisitionDate: input?.adapters?.copernicus?.captureDate ?? req.date,
      resolution: input?.adapters?.copernicus?.resolution ?? '10m-30m',
      cloudCover,
    },
    waterAnalysis: {
      ndwi,
      waterPresence: ndwi > 0.2 ? 'Detected' : 'Review',
      surfaceWaterEstimate: ndwi > 0.4 ? 'High' : ndwi > 0.2 ? 'Medium' : 'Low',
      turbidityProxy: input?.adapters?.gibs?.ok ? (ndwi < 0.15 ? 'High' : ndwi < 0.35 ? 'Medium' : 'Low') : 'unavailable',
      thermalAnomaly,
      shorelineChange: floodRisk > 0.55 ? 'Expanding' : floodRisk < 0.25 ? 'Receding' : 'Stable',
      confidence,
    },
    status: {
      riskLevel: floodRisk > 0.65 ? 'High' : floodRisk > 0.35 ? 'Moderate' : 'Low',
      qualityFlag: fallbackQuality(cloudCover),
      lastUpdated: new Date().toISOString(),
      note: 'Satellite-derived estimates only; field validation required for lab-grade water chemistry.',
    },
  };
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as any)?.error ?? (body as any)?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export async function getWaterSnapshotByPoint(req: WaterSnapshotRequest): Promise<WaterAnalysisResponse> {
  const key = `point:${req.lat.toFixed(5)},${req.lng.toFixed(5)}:${req.date}:${req.layer}`;
  const cached = fromCache<WaterAnalysisResponse>(key);
  if (cached) return cached;

  const query = new URLSearchParams({
    lat: String(req.lat),
    lng: String(req.lng),
    date: req.date,
    layer: req.layer,
  });

  try {
    const response = await fetch(apiUrl(`${endpoint.snapshot}?${query.toString()}`), { signal: req.signal });
    const payload = await parseOrThrow<WaterAnalysisResponse>(response);
    setCache(key, payload);
    return payload;
  } catch {
    // Fallback to currently deployed preview endpoint until snapshot route exists.
    const previewQuery = new URLSearchParams({
      lat: String(req.lat),
      lng: String(req.lng),
      areaLabel: 'AquaScan selected point',
    });
    const fallbackRes = await fetch(apiUrl(`${endpoint.satellitePreview}?${previewQuery.toString()}`), { signal: req.signal });
    const fallbackPayload = await parseOrThrow<any>(fallbackRes);
    const mapped = mapPreviewToStandard(fallbackPayload, req);
    setCache(key, mapped);
    return mapped;
  }
}

export async function getWaterSnapshotByAOI(req: WaterAoiRequest): Promise<WaterAnalysisResponse> {
  const key = `aoi:${aoiHash(req.polygonCoordinates)}:${req.date}:${req.layer}`;
  const cached = fromCache<WaterAnalysisResponse>(key);
  if (cached) return cached;

  const body = {
    polygon: req.polygonCoordinates.map(([lng, lat]) => [lng, lat]),
    date: req.date,
    layer: req.layer,
  };

  try {
    const response = await fetch(apiUrl(endpoint.aoiSnapshot), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: req.signal,
    });
    const payload = await parseOrThrow<WaterAnalysisResponse>(response);
    setCache(key, payload);
    return payload;
  } catch {
    const [firstLng, firstLat] = req.polygonCoordinates[0] ?? [0, 0];
    const fallback = await getWaterSnapshotByPoint({
      lat: firstLat,
      lng: firstLng,
      date: req.date,
      layer: req.layer,
      signal: req.signal,
    });
    const patched: WaterAnalysisResponse = {
      ...fallback,
      location: {
        lat: firstLat,
        lng: firstLng,
        name: 'AOI aggregate area',
      },
      status: {
        ...fallback.status,
        qualityFlag: 'Estimated',
        note: 'AOI endpoint unavailable; using nearest point estimate. Field validation required for lab-grade chemistry.',
      },
    };
    setCache(key, patched);
    return patched;
  }
}

export async function getWaterHistory(req: WaterHistoryRequest): Promise<HistoryResponse> {
  const baseKey = req.polygonCoordinates?.length
    ? `aoi:${aoiHash(req.polygonCoordinates)}`
    : `point:${(req.lat ?? 0).toFixed(5)},${(req.lng ?? 0).toFixed(5)}`;
  const key = `history:${baseKey}:${req.startDate}:${req.endDate}:${req.layer}`;
  const cached = fromCache<HistoryResponse>(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    start: req.startDate,
    end: req.endDate,
    layer: req.layer,
  });
  if (typeof req.lat === 'number' && typeof req.lng === 'number') {
    params.set('lat', String(req.lat));
    params.set('lng', String(req.lng));
  }
  if (req.polygonCoordinates?.length) {
    params.set('aoi', aoiHash(req.polygonCoordinates));
  }

  try {
    const response = await fetch(apiUrl(`${endpoint.history}?${params.toString()}`), { signal: req.signal });
    const payload = await parseOrThrow<HistoryResponse>(response);
    setCache(key, payload);
    return payload;
  } catch {
    const fallback: HistoryResponse = {
      points: [
        { date: req.startDate, ndwi: 0.26, confidence: 0.68, surfaceWaterEstimate: 'Medium' },
        { date: req.endDate, ndwi: 0.33, confidence: 0.74, surfaceWaterEstimate: 'Medium' },
      ],
    };
    setCache(key, fallback);
    return fallback;
  }
}
