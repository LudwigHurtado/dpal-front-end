import { API_ROUTES, apiUrl } from '../../../../constants';
import type {
  HyperspectralPlasticProviderStatusResponse,
  HyperspectralPlasticScanResponse,
  PlasticEvidencePacketResponse,
  PlasticEnvironmentType,
} from '../types';

type CacheEntry = { expires: number; payload: HyperspectralPlasticScanResponse };
const scanCache = new Map<string, CacheEntry>();
const SCAN_CACHE_TTL_MS = 120_000;

function cacheKey(parts: {
  lat: number;
  lng: number;
  radiusKm: number;
  baselineDate: string;
  currentDate: string;
  environmentType: PlasticEnvironmentType;
}): string {
  return [
    parts.lat.toFixed(4),
    parts.lng.toFixed(4),
    String(parts.radiusKm),
    parts.baselineDate,
    parts.currentDate,
    parts.environmentType,
  ].join('|');
}

export function clearHyperspectralPlasticScanCache(): void {
  scanCache.clear();
}

export async function getHyperspectralPlasticProviderStatus(
  signal?: AbortSignal,
): Promise<HyperspectralPlasticProviderStatusResponse> {
  const url = apiUrl(API_ROUTES.HYPERSPECTRAL_PLASTIC_PROVIDER_STATUS);
  const res = await fetch(url, { signal, method: 'GET', headers: { Accept: 'application/json' } });
  const body = (await res.json().catch(() => null)) as HyperspectralPlasticProviderStatusResponse | null;
  if (!res.ok || !body || body.ok !== true) {
    throw new Error(`Provider status failed (${res.status})`);
  }
  return body;
}

export type PlasticScanParams = {
  lat: number;
  lng: number;
  label?: string;
  radiusKm: number;
  baselineDate: string;
  currentDate: string;
  environmentType: PlasticEnvironmentType;
  polygon?: unknown;
  bypassCache?: boolean;
};

export async function getHyperspectralPlasticScan(
  params: PlasticScanParams,
  signal?: AbortSignal,
): Promise<{ data: HyperspectralPlasticScanResponse; fromCache: boolean }> {
  const key = cacheKey(params);
  if (!params.bypassCache) {
    const hit = scanCache.get(key);
    if (hit && Date.now() < hit.expires) {
      return { data: hit.payload, fromCache: true };
    }
  }

  const q = new URLSearchParams();
  q.set('lat', String(params.lat));
  q.set('lng', String(params.lng));
  q.set('radiusKm', String(params.radiusKm));
  q.set('baselineDate', params.baselineDate);
  q.set('currentDate', params.currentDate);
  q.set('environmentType', params.environmentType);
  if (params.label) q.set('label', params.label);
  if (params.polygon != null) q.set('polygon', JSON.stringify(params.polygon));

  const url = `${apiUrl(API_ROUTES.HYPERSPECTRAL_PLASTIC_SCAN)}?${q.toString()}`;
  const res = await fetch(url, { signal, method: 'GET', headers: { Accept: 'application/json' } });
  const body = (await res.json().catch(() => null)) as
    | HyperspectralPlasticScanResponse
    | { ok?: false; error?: string }
    | null;
  if (!res.ok || !body || (body as HyperspectralPlasticScanResponse).ok !== true) {
    const err = (body as { error?: string } | null)?.error;
    throw new Error(err ?? `Plastic watch scan failed (${res.status})`);
  }
  const data = body as HyperspectralPlasticScanResponse;
  scanCache.set(key, { expires: Date.now() + SCAN_CACHE_TTL_MS, payload: data });
  return { data, fromCache: false };
}

export async function postHyperspectralPlasticEvidencePacket(
  scan: HyperspectralPlasticScanResponse,
  signal?: AbortSignal,
): Promise<PlasticEvidencePacketResponse> {
  const url = apiUrl(API_ROUTES.HYPERSPECTRAL_PLASTIC_EVIDENCE_PACKET);
  const res = await fetch(url, {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ scan }),
  });
  const body = (await res.json().catch(() => null)) as PlasticEvidencePacketResponse | { ok?: false; error?: string } | null;
  if (!res.ok || !body || body.ok !== true) {
    const err = (body as { error?: string } | null)?.error;
    throw new Error(err ?? `Evidence packet failed (${res.status})`);
  }
  return body;
}
