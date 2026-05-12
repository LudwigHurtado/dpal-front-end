import type { Request } from 'express';
import type { PlasticEnvironmentType } from './plasticEnvironment';
import { normalizePlasticEnvironmentType } from './plasticEnvironment';

export type NormalizedPlasticScanRequest = {
  lat: number;
  lng: number;
  label?: string;
  radiusKm: number;
  baselineDate: string;
  currentDate: string;
  environmentType: PlasticEnvironmentType;
  polygon?: unknown;
  quickPreset?: string | null;
  aoiGeoJson?: unknown;
  /** When true and includeFullSceneLinks is false, CMR scenes are returned in compact shape (no link arrays). */
  compactScenes: boolean;
  /** When true, always return full CMR scenes with links (overrides compact). */
  includeFullSceneLinks: boolean;
};

function firstScalar(v: unknown): unknown {
  if (Array.isArray(v)) return v[0];
  return v;
}

function toTrimmedString(v: unknown): string {
  const x = firstScalar(v);
  if (x == null || x === '') return '';
  return String(x).trim();
}

function toFiniteNumber(...candidates: unknown[]): number {
  for (const v of candidates) {
    const x = firstScalar(v);
    if (x == null || x === '') continue;
    if (typeof x === 'number' && Number.isFinite(x)) return x;
    const n = Number.parseFloat(String(x).trim());
    if (Number.isFinite(n)) return n;
  }
  return Number.NaN;
}

function toBool(v: unknown): boolean {
  const x = firstScalar(v);
  if (x === true) return true;
  if (x === false || x == null || x === '') return false;
  const s = String(x).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

/** Treat JSON null / empty as “not provided” for optional GeoJSON fields. */
function optionalGeoField(v: unknown): unknown {
  if (v === undefined) return undefined;
  if (v === null) return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  return v;
}

/**
 * Flatten Express query + JSON body into one record (body wins on key overlap).
 * Used so POST ?compact=true works the same as body.compact.
 */
export function mergeScanRawFromRequest(query: Record<string, unknown>, body: unknown): Record<string, unknown> {
  const q: Record<string, unknown> = { ...query };
  const b =
    body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  return { ...q, ...b };
}

/** Single-string values from Express `req.query` (drops undefined keys). */
export function flattenExpressQuery(query: Request['query']): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!query || typeof query !== 'object') return out;
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    out[k] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}

/**
 * Raw scan fields for parsing: GET uses query only; POST merges query then body (body wins on duplicate keys).
 */
export function buildScanRawFromRequest(req: Request): Record<string, unknown> {
  const q = flattenExpressQuery(req.query);
  if (req.method === 'GET') return q;
  const b =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
  return mergeScanRawFromRequest(q, b);
}

export function parsePlasticWatchScanRaw(
  raw: Record<string, unknown>,
): { ok: true; value: NormalizedPlasticScanRequest } | { ok: false; error: string } {
  const lat = toFiniteNumber(raw.lat);
  const lng = toFiniteNumber(raw.lng, raw.longitude);
  const radiusKm = toFiniteNumber(raw.radiusKm, raw.radius) || 10;

  const label = toTrimmedString(raw.label) || undefined;
  const baselineDate = toTrimmedString(raw.baselineDate);
  const currentDate = toTrimmedString(raw.currentDate);
  const environmentType = normalizePlasticEnvironmentType(toTrimmedString(raw.environmentType) || 'river');
  const quickPresetRaw = optionalGeoField(raw.quickPreset);
  const quickPreset =
    quickPresetRaw === undefined ? null : typeof quickPresetRaw === 'string' ? quickPresetRaw : String(quickPresetRaw);

  const polygonRaw = optionalGeoField(raw.polygon);
  let polygon: unknown = undefined;
  if (polygonRaw !== undefined) {
    if (typeof polygonRaw === 'string') {
      try {
        polygon = JSON.parse(polygonRaw) as unknown;
      } catch {
        return { ok: false, error: 'polygon must be valid JSON when provided as a string' };
      }
    } else {
      polygon = polygonRaw;
    }
  }

  const aoiRaw = optionalGeoField(raw.aoiGeoJson);
  let aoiGeoJson: unknown = undefined;
  if (aoiRaw !== undefined) {
    if (typeof aoiRaw === 'string') {
      try {
        aoiGeoJson = JSON.parse(aoiRaw) as unknown;
      } catch {
        return { ok: false, error: 'aoiGeoJson must be valid JSON when provided as a string' };
      }
    } else {
      aoiGeoJson = aoiRaw;
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'lat and lng (or longitude) are required finite numbers' };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: 'lat/lng out of range' };
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 250) {
    return { ok: false, error: 'radiusKm must be between 0 and 250' };
  }
  if (!baselineDate || !currentDate) {
    return { ok: false, error: 'baselineDate and currentDate are required' };
  }

  const includeFullSceneLinks = toBool(raw.includeLinks);
  const compactScenes = toBool(raw.compact) && !includeFullSceneLinks;

  return {
    ok: true,
    value: {
      lat,
      lng,
      label,
      radiusKm,
      baselineDate,
      currentDate,
      environmentType,
      polygon,
      quickPreset,
      aoiGeoJson,
      compactScenes,
      includeFullSceneLinks,
    },
  };
}
