import { apiUrl, API_ROUTES } from '../../constants';
import {
  type CopernicusAoiGeoJson,
  type CopernicusCollection,
  type CopernicusIndexResult,
  type CopernicusIndexType,
  type CopernicusLatLng,
  type CopernicusSetupState,
} from './types';

function evalscriptFor(index: CopernicusIndexType): string {
  if (index === 'NDVI') return 'return [(B08-B04)/(B08+B04)];';
  if (index === 'NDWI') return 'return [(B03-B08)/(B03+B08)];';
  if (index === 'NDMI') return 'return [(B08-B11)/(B08+B11)];';
  return 'return [(B08-B12)/(B08+B12)];';
}

export function getCopernicusSetupState(): CopernicusSetupState {
  const enabled = String((import.meta as any).env?.VITE_COPERNICUS_ENABLED ?? 'true') === 'true';
  return {
    configured: false,
    missing: [],
    enabled,
    source: 'backend_proxy',
    message: enabled
      ? 'Checking Copernicus backend proxy status...'
      : 'Copernicus integration disabled by client configuration.',
  };
}

export async function fetchCopernicusSetupState(signal?: AbortSignal): Promise<CopernicusSetupState> {
  const enabled = String((import.meta as any).env?.VITE_COPERNICUS_ENABLED ?? 'true') === 'true';
  if (!enabled) {
    return {
      configured: false,
      missing: ['VITE_COPERNICUS_ENABLED=false'],
      enabled: false,
      source: 'backend_proxy',
      message: 'Copernicus integration disabled by client configuration.',
    };
  }
  const res = await fetch(apiUrl(API_ROUTES.COPERNICUS_STATUS), { signal });
  const payload = (await res.json().catch(() => ({}))) as {
    configured?: boolean;
    missing?: string[];
    message?: string;
    source?: 'backend_proxy';
    enabled?: boolean;
  };
  if (!res.ok) {
    return {
      configured: false,
      missing: payload.missing ?? ['backend_status_unavailable'],
      enabled,
      source: 'backend_proxy',
      message: payload.message ?? 'Copernicus backend status unavailable.',
    };
  }
  return {
    configured: Boolean(payload.configured),
    missing: Array.isArray(payload.missing) ? payload.missing : [],
    enabled: payload.enabled ?? enabled,
    source: payload.source ?? 'backend_proxy',
    message: payload.message ?? 'Copernicus backend status received.',
  };
}

export async function fetchProcessIndex(params: {
  center: CopernicusLatLng;
  collection: CopernicusCollection;
  indexType: CopernicusIndexType;
  date: string;
  aoiGeoJson?: CopernicusAoiGeoJson | null;
  signal?: AbortSignal;
}): Promise<CopernicusIndexResult> {
  const body = {
    input: {
      bounds: params.aoiGeoJson
        ? { geometry: params.aoiGeoJson }
        : {
            bbox: [params.center.lng - 0.01, params.center.lat - 0.01, params.center.lng + 0.01, params.center.lat + 0.01],
            properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
          },
      data: [{ type: params.collection, dataFilter: { timeRange: { from: `${params.date}T00:00:00Z`, to: `${params.date}T23:59:59Z` } } }],
    },
    output: { width: 64, height: 64, responses: [{ identifier: 'default', format: { type: 'application/json' } }] },
    evalscript: `//VERSION=3
function setup(){return {input:["B03","B04","B08","B11","B12"], output:{bands:1,sampleType:"FLOAT32"}}}
function evaluatePixel(sample){${evalscriptFor(params.indexType)}}`,
  };

  const response = await fetch(apiUrl(API_ROUTES.COPERNICUS_PROCESS), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: params.signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({} as { error?: string }));
    return {
      indexType: params.indexType,
      value: null,
      quality: 'unavailable',
      source: err.error ?? `Process API error ${response.status}`,
    };
  }

  const payload = await response.json().catch(() => ({} as { sourceCitation?: string }));
  return {
    indexType: params.indexType,
    value: null,
    quality: 'live_api',
    source: payload.sourceCitation ?? 'Copernicus Process API',
  };
}
