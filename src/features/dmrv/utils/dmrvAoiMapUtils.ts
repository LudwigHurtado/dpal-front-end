export {
  type LatLngPoint,
  type PolygonRing,
  parseManualPolygonJson,
  polygonRingFromPoints,
  computePolygonCentroid,
  computePolygonAreaKm2,
  toPolygonGeoJSON,
} from '../../hyperspectralPlasticWatch/utils/plasticAoiUtils';

import type { LatLngPoint } from '../../hyperspectralPlasticWatch/utils/plasticAoiUtils';

/** Restore polygon vertices from stored project context (`points[]` or GeoJSON Polygon). */
export function parseStoredAoiPoints(raw: string): LatLngPoint[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return [];
      const first = parsed[0];
      if (first && typeof first === 'object' && 'lat' in first && 'lng' in first) {
        return parsed
          .map((item) => {
            const p = item as { lat: unknown; lng: unknown };
            const lat = Number(p.lat);
            const lng = Number(p.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return { lat, lng };
          })
          .filter((p): p is LatLngPoint => p !== null);
      }
      if (Array.isArray(first) && first.length >= 2) {
        return parsed
          .map((pair) => {
            const lng = Number((pair as number[])[0]);
            const lat = Number((pair as number[])[1]);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return { lat, lng };
          })
          .filter((p): p is LatLngPoint => p !== null);
      }
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as { type?: string }).type === 'Polygon' &&
      Array.isArray((parsed as { coordinates?: unknown }).coordinates)
    ) {
      const ring = (parsed as { coordinates: number[][][] }).coordinates[0] ?? [];
      return ring
        .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function parseCoordinateStrings(lat: string, lng: string): { lat: number; lng: number } | null {
  const latN = Number(lat.trim());
  const lngN = Number(lng.trim());
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;
  if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) return null;
  return { lat: latN, lng: lngN };
}
