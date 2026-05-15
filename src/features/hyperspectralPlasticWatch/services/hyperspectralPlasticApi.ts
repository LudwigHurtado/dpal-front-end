import { API_ROUTES, apiUrl } from '../../../../constants';
import type {
  DroneValidationPrepareResponse,
  DroneValidationStatusResponse,
  HyperspectralPlasticProviderStatusResponse,
  HyperspectralPlasticScanResponse,
  PlasticEvidencePacketResponse,
  PlasticEnvironmentType,
} from '../types';
import {
  buildPlasticScanRequestBody,
  normalizePlasticScanResponse,
  parseLocalizedNumber,
} from './plasticScanRequest';

export {
  isPendingPlasticIndexExtraction,
  PENDING_PLASTIC_INDEX_STATUS_MESSAGE,
  parseLocalizedNumber,
  plasticScanPendingStatusMessage,
} from './plasticScanRequest';

type CacheEntry = { expires: number; payload: HyperspectralPlasticScanResponse };
const scanCache = new Map<string, CacheEntry>();
const SCAN_CACHE_TTL_MS = 120_000;

function cacheKey(parts: {
  lat: number | string;
  lng: number | string;
  radiusKm: number | string;
  baselineDate: string;
  currentDate: string;
  environmentType: PlasticEnvironmentType;
}): string {
  const lat = parseLocalizedNumber(parts.lat);
  const lng = parseLocalizedNumber(parts.lng);
  return [
    Number.isFinite(lat) ? lat.toFixed(4) : String(parts.lat),
    Number.isFinite(lng) ? lng.toFixed(4) : String(parts.lng),
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

export async function getDroneValidationStatus(signal?: AbortSignal): Promise<DroneValidationStatusResponse> {
  const url = apiUrl(API_ROUTES.HYPERSPECTRAL_PLASTIC_DRONE_STATUS);
  const res = await fetch(url, { signal, method: 'GET', headers: { Accept: 'application/json' } });
  const body = (await res.json().catch(() => null)) as DroneValidationStatusResponse | null;
  if (!res.ok || !body || body.ok !== true) {
    throw new Error(`Drone status failed (${res.status})`);
  }
  return body;
}

export async function postDroneValidationPrepare(
  body: {
    lat: number;
    lng: number;
    radiusKm: number;
    siteLabel?: string;
    reason?: string;
    requestedValidationTypes?: string[];
  },
  signal?: AbortSignal,
): Promise<DroneValidationPrepareResponse> {
  const url = apiUrl(API_ROUTES.HYPERSPECTRAL_PLASTIC_DRONE_VALIDATION_REQUEST);
  const res = await fetch(url, {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as DroneValidationPrepareResponse | { ok?: false; error?: string } | null;
  if (!res.ok || !json || (json as DroneValidationPrepareResponse).ok !== true) {
    const err = (json as { error?: string } | null)?.error;
    throw new Error(err ?? `Drone validation prepare failed (${res.status})`);
  }
  return json as DroneValidationPrepareResponse;
}

export type PlasticScanParams = {
  lat: number | string;
  lng: number | string;
  label?: string;
  radiusKm: number | string;
  baselineDate: string;
  currentDate: string;
  environmentType: PlasticEnvironmentType;
  polygon?: unknown;
  quickPreset?: string | null;
  aoiGeoJson?: unknown;
  bypassCache?: boolean;
  /** Request smaller scan JSON (PACE/EMIT scenes omit full CMR link arrays). */
  compact?: boolean;
  /** Force full CMR scene link arrays (overrides compact). */
  includeLinks?: boolean;
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

  const url = apiUrl(API_ROUTES.HYPERSPECTRAL_PLASTIC_SCAN);
  const payload = buildPlasticScanRequestBody(params);
  const lat = parseLocalizedNumber(payload.lat as number);
  const lng = parseLocalizedNumber(payload.lng as number);
  const radiusKm = parseLocalizedNumber(payload.radiusKm as number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Enter valid coordinates: latitude -90 to 90, longitude -180 to 180.');
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 250) {
    throw new Error('radiusKm must be between 0 and 250 km.');
  }
  if (!payload.baselineDate || !payload.currentDate) {
    throw new Error('Choose valid baseline and current dates.');
  }

  if (import.meta.env.DEV) {
    console.debug('[PlasticWatch] POST scan payload', payload);
  }

  const res = await fetch(url, {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => null)) as
    | HyperspectralPlasticScanResponse
    | { ok?: false; error?: string }
    | null;

  if (import.meta.env.DEV) {
    console.debug('[PlasticWatch] POST scan response', { status: res.status, body });
  }

  if (!res.ok || !body || (body as HyperspectralPlasticScanResponse).ok !== true) {
    const err = (body as { error?: string } | null)?.error;
    throw new Error(err ?? `Plastic watch scan failed (${res.status})`);
  }

  const data = normalizePlasticScanResponse(body);
  if (!data) {
    throw new Error('Plastic watch scan returned ok:true but the response shape was incomplete.');
  }

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
