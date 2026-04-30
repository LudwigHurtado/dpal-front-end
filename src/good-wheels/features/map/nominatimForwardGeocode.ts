import type { LatLng } from './mapTypes';

const cache = new Map<string, LatLng | null>();

/** Nominatim usage policy: identify the app; throttle bulk requests on the caller. */
const NOMINATIM_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'User-Agent': 'DPAL-GoodWheels/1.0 (https://github.com/LudwigHurtado/dpal-front-end)',
};

/**
 * Forward geocode a single free-text address via OpenStreetMap Nominatim (no Google).
 * Returns null when nothing matches or the request fails.
 */
export async function nominatimForwardGeocode(address: string, signal?: AbortSignal): Promise<LatLng | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address.trim())}`;
  try {
    const res = await fetch(url, { signal, headers: NOMINATIM_HEADERS });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) {
      cache.set(key, null);
      return null;
    }
    const lat = Number.parseFloat(first.lat);
    const lng = Number.parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      cache.set(key, null);
      return null;
    }
    const ll = { lat, lng };
    cache.set(key, ll);
    return ll;
  } catch {
    cache.set(key, null);
    return null;
  }
}
