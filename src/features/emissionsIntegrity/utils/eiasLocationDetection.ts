import type { CoordinatePoint, Jurisdiction } from '../types/emissionsIntegrity.types';

/** Nominatim [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) requires a valid User-Agent. */
const NOMINATIM_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'User-Agent': 'DPAL-EIAS/1.0 (https://github.com/LudwigHurtado/dpal-front-end)',
};

type NominatimReverse = {
  address?: { state?: string; country?: string };
};

/**
 * Correct common GPS entry mistakes: swapped lat/lng, or positive longitude for the western US.
 */
export function normalizeGpsCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  let a = lat;
  let b = lng;
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    const t = a;
    a = b;
    b = t;
  }
  if (b > 0 && a >= 24 && a <= 50 && b >= 60 && b <= 125) {
    b = -b;
  }
  return { lat: a, lng: b };
}

/** Map full state names from Nominatim (English) to EIAS regulatory buckets. */
export function mapUsStateToJurisdiction(state: string | null | undefined): Jurisdiction | null {
  if (!state) return null;
  const s = state.trim().toLowerCase();
  if (s === 'california' || s === 'ca') return 'California';
  if (s === 'arizona' || s === 'az') return 'Arizona';
  if (s === 'new mexico' || s === 'nm') return 'New Mexico';
  return 'Federal';
}

export async function reverseGeocodeUsState(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<{ state: string | null; country: string | null }> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&zoom=8&addressdetails=1`;
  const res = await fetch(url, { signal, headers: NOMINATIM_HEADERS });
  if (!res.ok) return { state: null, country: null };
  const data = (await res.json()) as NominatimReverse;
  const state = typeof data.address?.state === 'string' ? data.address.state.trim() : null;
  const country = typeof data.address?.country === 'string' ? data.address.country.trim() : null;
  return { state: state || null, country: country || null };
}

/** Rough US-state label when offline / geocoder blocked — ordered so CA does not absorb NV. */
export function guessUsStateLabelFromBBox(point: CoordinatePoint | null): string | null {
  if (!point) return null;
  const { lat, lng } = normalizeGpsCoordinates(point.lat, point.lng);
  if (lat < 24 || lat > 50 || lng > -65 || lng < -130) return null;

  if (lat >= 41.75 && lat <= 46.6 && lng >= -124.75 && lng <= -116.35) return 'Oregon';
  if (lat >= 45.35 && lat <= 49.1 && lng >= -124.85 && lng <= -116.95) return 'Washington';
  if (lat >= 35.0 && lat <= 42.0 && lng >= -120.0 && lng <= -114.05) return 'Nevada';
  if (lat >= 31.2 && lat <= 37.1 && lng >= -114.9 && lng <= -109.0) return 'Arizona';
  if (lat >= 31.3 && lat <= 37.1 && lng >= -109.1 && lng <= -103.0) return 'New Mexico';
  if (lat >= 32.0 && lat <= 42.1 && lng >= -124.6 && lng <= -114.05) return 'California';
  if (lat >= 37.0 && lat <= 42.0 && lng >= -114.1 && lng <= -109.05) return 'Utah';
  if (lat >= 37.0 && lat <= 41.0 && lng >= -109.1 && lng <= -102.0) return 'Colorado';
  if (lat >= 41.9 && lat <= 45.0 && lng >= -117.3 && lng <= -111.0) return 'Idaho';
  return null;
}

/**
 * Regulatory jurisdiction hint from coordinates when reverse geocoding is unavailable.
 * Prefer `mapUsStateToJurisdiction` on Nominatim `state` when online.
 * Nevada (and similar) map to Federal — EIAS presets are CA / AZ / NM / Federal.
 */
export function estimateJurisdictionFromBBox(point: CoordinatePoint | null): Jurisdiction | null {
  if (!point) return null;
  const { lat, lng } = normalizeGpsCoordinates(point.lat, point.lng);
  if (lat < 24 || lat > 50 || lng > -65 || lng < -130) return null;

  if (lat >= 31.2 && lat <= 37.1 && lng >= -114.9 && lng <= -109.0) return 'Arizona';
  if (lat >= 31.3 && lat <= 37.1 && lng >= -109.1 && lng <= -103.0) return 'New Mexico';
  if (lat >= 35.0 && lat <= 42.0 && lng >= -120.0 && lng <= -114.05) return 'Federal';
  if (lat >= 32.0 && lat <= 42.1 && lng >= -124.6 && lng <= -114.0) return 'California';
  return 'Federal';
}
