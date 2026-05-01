import type { LatLng } from './mapTypes';

const cache = new Map<string, string | null>();

const NOMINATIM_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'User-Agent': 'DPAL-GoodWheels/1.0 (https://github.com/LudwigHurtado/dpal-front-end)',
};

/**
 * Reverse geocode lat/lng to a human address via OpenStreetMap Nominatim.
 * Returns null when no match or the request fails.
 */
export async function nominatimReverseGeocode(point: LatLng, signal?: AbortSignal): Promise<string | null> {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.lat}&lon=${point.lng}&zoom=18&addressdetails=1`;
  try {
    const res = await fetch(url, { signal, headers: NOMINATIM_HEADERS });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const data = (await res.json()) as { display_name?: string };
    const display = typeof data?.display_name === 'string' ? data.display_name.trim() : '';
    if (!display) {
      cache.set(key, null);
      return null;
    }
    cache.set(key, display);
    return display;
  } catch {
    cache.set(key, null);
    return null;
  }
}
