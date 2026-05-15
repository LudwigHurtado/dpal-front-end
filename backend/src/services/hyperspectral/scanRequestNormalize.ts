import type { Request } from 'express';
import type { PlasticEnvironmentType } from './plasticEnvironment';
import { normalizePlasticEnvironmentType } from './plasticEnvironment';
import { DEFAULT_PACE_CMR_PAGE_SIZE, MAX_PACE_CMR_PAGE_SIZE, MIN_PACE_CMR_PAGE_SIZE } from './paceCmrMessaging';

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
  /** NASA CMR granule page size (1–100). */
  pageSize: number;
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
export function mergeScanRawFromRequest(query: Record<string, unknown>, body: Record<string, unknown>): Record<string, unknown> {
  return { ...query, ...body };
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
 * Coerce Express `req.body` into a plain object for POST JSON (and tolerant fallbacks).
 * Arrays are rejected as invalid scan bodies.
 */
export function coerceJsonScanBody(body: unknown): { ok: true; value: Record<string, unknown> } | { ok: false; error: string; details?: string } {
  if (body == null || body === '') {
    return { ok: true, value: {} };
  }
  if (typeof body === 'object' && !Array.isArray(body)) {
    return { ok: true, value: body as Record<string, unknown> };
  }
  if (Array.isArray(body)) {
    return { ok: false, error: 'invalid_body', details: 'JSON body must be an object, not an array.' };
  }
  if (Buffer.isBuffer(body)) {
    return coerceJsonScanBody(body.toString('utf8'));
  }
  if (typeof body === 'string') {
    const t = body.trim();
    if (!t) return { ok: true, value: {} };
    try {
      const parsed = JSON.parse(t) as unknown;
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: 'invalid_body', details: 'JSON body must parse to a non-null object.' };
      }
      return { ok: true, value: parsed as Record<string, unknown> };
    } catch {
      return { ok: false, error: 'invalid_json_body', details: 'Body could not be parsed as JSON.' };
    }
  }
  return { ok: false, error: 'invalid_body', details: 'Unsupported body type for scan request.' };
}

/**
 * Single entry for GET query vs POST merged query+body (body wins). Same fields as GET query params.
 */
export function buildNormalizedPlasticScanRawFromParts(parts: {
  method: string;
  query: Request['query'];
  body: unknown;
}): { ok: true; raw: Record<string, unknown> } | { ok: false; error: string; details?: string } {
  const q = flattenExpressQuery(parts.query);
  if (parts.method === 'GET') {
    return { ok: true, raw: q };
  }
  const coerced = coerceJsonScanBody(parts.body);
  if (!coerced.ok) return coerced;
  return { ok: true, raw: mergeScanRawFromRequest(q, coerced.value) };
}

export function parsePlasticWatchScanRaw(
  raw: Record<string, unknown>,
): { ok: true; value: NormalizedPlasticScanRequest } | { ok: false; error: string; details?: string } {
  const lat = toFiniteNumber(raw.lat);
  const lng = toFiniteNumber(raw.lng, raw.longitude);
  const radiusCandidates: unknown[] = [raw.radiusKm, raw.radius];
  const hasExplicitRadius = radiusCandidates.some((v) => v !== undefined && v !== null && String(v).trim() !== '');
  const radiusParsed = toFiniteNumber(raw.radiusKm, raw.radius);
  if (hasExplicitRadius && (!Number.isFinite(radiusParsed) || radiusParsed <= 0 || radiusParsed > 250)) {
    return {
      ok: false,
      error: 'invalid_radiusKm',
      details: 'radiusKm must be a finite number greater than 0 and at most 250 when provided.',
    };
  }
  const radiusKm = hasExplicitRadius ? radiusParsed : Number.isFinite(radiusParsed) && radiusParsed > 0 ? radiusParsed : 10;

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
        return { ok: false, error: 'polygon must be valid JSON when provided as a string', details: 'polygon string JSON.parse failed' };
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
        return {
          ok: false,
          error: 'aoiGeoJson must be valid JSON when provided as a string',
          details: 'aoiGeoJson string JSON.parse failed',
        };
      }
    } else {
      aoiGeoJson = aoiRaw;
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      ok: false,
      error: 'invalid_coordinates',
      details: 'lat and lng (or longitude) must be finite numbers.',
    };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: 'lat_lng_out_of_range', details: 'lat must be within [-90, 90] and lng within [-180, 180].' };
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 250) {
    return { ok: false, error: 'invalid_radiusKm', details: 'radiusKm must be between 0 and 250 (exclusive of 0).' };
  }
  if (!baselineDate || !currentDate) {
    return { ok: false, error: 'missing_dates', details: 'baselineDate and currentDate are required (ISO date strings).' };
  }

  const includeFullSceneLinks = toBool(raw.includeLinks);
  const compactScenes = toBool(raw.compact) && !includeFullSceneLinks;

  const pageSizeRaw = toFiniteNumber(raw.pageSize);
  const hasExplicitPageSize =
    raw.pageSize !== undefined && raw.pageSize !== null && String(raw.pageSize).trim() !== '';
  if (hasExplicitPageSize) {
    if (!Number.isFinite(pageSizeRaw) || pageSizeRaw < MIN_PACE_CMR_PAGE_SIZE || pageSizeRaw > MAX_PACE_CMR_PAGE_SIZE) {
      return {
        ok: false,
        error: 'invalid_pageSize',
        details: `pageSize must be an integer from ${MIN_PACE_CMR_PAGE_SIZE} to ${MAX_PACE_CMR_PAGE_SIZE} when provided.`,
      };
    }
  }
  const pageSize = hasExplicitPageSize ? Math.floor(pageSizeRaw) : DEFAULT_PACE_CMR_PAGE_SIZE;

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
      pageSize,
    },
  };
}
