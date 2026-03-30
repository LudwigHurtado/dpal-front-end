import type { LatLng } from './mapTypes';

const cache = new Map<string, LatLng>();

export async function geocodeAddress(g: typeof google, address: string): Promise<LatLng | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit) return hit;

  const geocoder = new g.maps.Geocoder();
  const res = await geocoder.geocode({ address });
  const first = res.results?.[0];
  const loc = first?.geometry?.location;
  if (!loc) return null;
  const ll = { lat: loc.lat(), lng: loc.lng() };
  cache.set(key, ll);
  return ll;
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

