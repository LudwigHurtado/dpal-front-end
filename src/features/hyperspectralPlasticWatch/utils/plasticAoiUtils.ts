export type LatLngPoint = { lat: number; lng: number };

/** Leaflet / internal ring: [lat, lng][] */
export type PolygonRing = [number, number][];

export function parseManualPolygonJson(raw: string): { points: LatLngPoint[]; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { points: [], error: 'Paste a JSON array of [longitude, latitude] pairs.' };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return { points: [], error: 'JSON must be an array of coordinate pairs.' };
    const points: LatLngPoint[] = [];
    for (const item of parsed) {
      if (!Array.isArray(item) || item.length < 2) {
        return { points: [], error: 'Each entry must be [longitude, latitude].' };
      }
      const lng = Number(item[0]);
      const lat = Number(item[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { points: [], error: 'Invalid latitude or longitude in polygon JSON.' };
      }
      points.push({ lat, lng });
    }
    if (points.length < 3) return { points: [], error: 'At least 3 coordinate pairs are required.' };
    return { points };
  } catch {
    return { points: [], error: 'Could not parse JSON. Use format: [[lng, lat], [lng, lat], …]' };
  }
}

export function polygonRingFromPoints(points: LatLngPoint[]): PolygonRing {
  return points.map((p) => [p.lat, p.lng] as [number, number]);
}

export function computePolygonCentroid(points: LatLngPoint[]): LatLngPoint | null {
  if (points.length === 0) return null;
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

export function computePolygonAreaKm2(points: LatLngPoint[]): number {
  if (points.length < 3) return 0;
  const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((avgLat * Math.PI) / 180);
  const projected = points.map((point) => ({
    x: point.lng * metersPerDegLng,
    y: point.lat * metersPerDegLat,
  }));
  let area = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index];
    const next = projected[(index + 1) % projected.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area / 2) / 1_000_000;
}

export function computeBoundingRadiusKm(points: LatLngPoint[]): number {
  const center = computePolygonCentroid(points);
  if (!center || points.length === 0) return 10;
  const metersPerDegLat = 111_320;
  let maxM = 0;
  for (const p of points) {
    const dLat = (p.lat - center.lat) * metersPerDegLat;
    const dLng = (p.lng - center.lng) * metersPerDegLat * Math.cos((center.lat * Math.PI) / 180);
    const dist = Math.hypot(dLat, dLng);
    if (dist > maxM) maxM = dist;
  }
  return Math.min(250, Math.max(1, Math.ceil((maxM / 1000) * 1.15)));
}

export type AoiPolygonGeoJSON = { type: 'Polygon'; coordinates: number[][][] };

export function toPolygonGeoJSON(points: LatLngPoint[]): AoiPolygonGeoJSON | null {
  if (points.length < 3) return null;
  const coordinates = points.map((point) => [point.lng, point.lat]);
  const [firstLng, firstLat] = coordinates[0];
  const [lastLng, lastLat] = coordinates[coordinates.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) {
    coordinates.push([firstLng, firstLat]);
  }
  return { type: 'Polygon', coordinates: [coordinates] };
}

export function confidenceBandLabel(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return 'Pending';
  if (score < 40) return 'Low confidence';
  if (score < 70) return 'Medium confidence';
  if (score < 90) return 'High candidate confidence';
  return 'High confidence — validation still recommended';
}
