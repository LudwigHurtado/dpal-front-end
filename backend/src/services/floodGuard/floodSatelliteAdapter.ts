/**
 * DPAL FloodGuard — AquaScan-style satellite water adapter (Stage 12B).
 *
 * Live path: reuses `deriveClassificationOverlay` from the AquaScan overlay
 * service (Copernicus / Sentinel Hub) when `FLOODGUARD_LIVE_SATELLITE_ENABLED`
 * is true and credentials exist. No consumer paid API keys — registration-based
 * Copernicus OAuth only.
 *
 * Fallback: deterministic per-zone NDWI / water extent / expansion so the
 * dashboard and risk engine never break.
 */

import { deriveClassificationOverlay } from '../aquascan/aquascanOverlayService';
import type {
  FloodSatelliteMeta,
  FloodSatelliteIntegrationStatus,
  FloodWeatherSignal,
  FloodZone,
} from './floodGuardTypes';

const LEGAL =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on', 'enabled']);
const GRID_SIZE = 32;
const CACHE_TTL_MS = 15 * 60 * 1000;
const LIVE_TOTAL_TIMEOUT_MS = 55_000;

export interface SatelliteSampleResult {
  ok: true;
  meta: FloodSatelliteMeta;
  /** Mirrors `FloodWeatherSignal.satelliteWaterExpansionPct` for the risk engine. */
  expansionPercent: number;
  message?: string;
}

function isLiveSatelliteEnabled(): boolean {
  const raw = (process.env.FLOODGUARD_LIVE_SATELLITE_ENABLED ?? '').trim().toLowerCase();
  return TRUE_VALUES.has(raw);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function zoneSeed01(zoneId: string): number {
  let h = 2166136261;
  for (let i = 0; i < zoneId.length; i += 1) {
    h ^= zoneId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function gridCellAreaKm2(zone: FloodZone): number {
  const ring = zone.polygon;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const dLatKm = ((maxLat - minLat) / GRID_SIZE) * 111;
  const dLngKm = ((maxLng - minLng) / GRID_SIZE) * 111 * Math.cos(midLatRad);
  return Math.max(1e-9, Math.abs(dLatKm * dLngKm));
}

function overlayFeatureCount(r: Record<string, unknown>): number {
  if (r.ok !== true) return 0;
  const g = r.geometry as { features?: unknown[] } | undefined;
  return Array.isArray(g?.features) ? g.features.length : 0;
}

function overlayMean(r: Record<string, unknown>): number | null {
  if (r.ok !== true) return null;
  const s = r.statistics as Record<string, unknown> | undefined;
  return typeof s?.mean === 'number' && Number.isFinite(s.mean) ? s.mean : null;
}

function overlayConfidence(r: Record<string, unknown>): number {
  if (r.ok !== true) return 0;
  if (typeof r.confidence === 'number' && Number.isFinite(r.confidence)) return r.confidence;
  const s = r.statistics as Record<string, unknown> | undefined;
  if (typeof s?.confidence === 'number' && Number.isFinite(s.confidence)) return s.confidence as number;
  return 0.55;
}

function zoneToAoi(zone: FloodZone): { type: 'Polygon'; coordinates: number[][][] } {
  return { type: 'Polygon', coordinates: [zone.polygon.map(([lng, lat]) => [lng, lat])] };
}

function buildDeterministicMeta(zone: FloodZone, now: Date, status: FloodSatelliteIntegrationStatus, message: string): FloodSatelliteMeta {
  const s = zoneSeed01(zone.zoneId);
  const ndwiMean = Number((0.12 + s * 0.55).toFixed(3));
  const previousWaterExtentSqKm = Number((0.25 + s * 2.8).toFixed(3));
  const waterExtentSqKm = Number((previousWaterExtentSqKm * (1.15 + s * 0.95)).toFixed(3));
  const waterExpansionPercent =
    previousWaterExtentSqKm > 0
      ? Number((((waterExtentSqKm - previousWaterExtentSqKm) / previousWaterExtentSqKm) * 100).toFixed(1))
      : 0;
  const floodWetConfidence = Number((0.42 + s * 0.45).toFixed(3));

  return {
    zoneId: zone.zoneId,
    status,
    ndwiMean,
    waterExtentSqKm,
    previousWaterExtentSqKm,
    waterExpansionPercent,
    floodWetConfidence,
    source: 'satellite',
    provider: 'aquascan-fallback',
    providerLabel: 'DPAL AquaScan synthetic flood-water signal',
    fetchedAt: now.toISOString(),
    isLive: false,
    message: `${message} ${LEGAL}`,
  };
}

interface CacheEntry {
  result: SatelliteSampleResult;
  cachedAtMs: number;
}

const cache = new Map<string, CacheEntry>();

function readCache(zoneId: string): SatelliteSampleResult | null {
  const e = cache.get(zoneId);
  if (!e) return null;
  if (Date.now() - e.cachedAtMs > CACHE_TTL_MS) {
    cache.delete(zoneId);
    return null;
  }
  return e.result;
}

function writeCache(zoneId: string, r: SatelliteSampleResult): void {
  cache.set(zoneId, { result: r, cachedAtMs: Date.now() });
}

export function clearSatelliteCache(): void {
  cache.clear();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve('timeout'), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch(() => {
        clearTimeout(t);
        resolve('timeout');
      });
  });
}

async function fetchLiveCluster(zone: FloodZone, now: Date): Promise<SatelliteSampleResult | 'timeout' | 'failed'> {
  const end = now;
  const start = addDays(end, -6);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -6);

  const aoi = zoneToAoi(zone);
  const baseBody = {
    aoiGeoJson: aoi,
    collection: 'sentinel-2-l2a' as const,
    threshold: 0.2,
  };

  const currentRange = { fromDate: isoDate(start), toDate: isoDate(end) };
  const previousRange = { fromDate: isoDate(prevStart), toDate: isoDate(prevEnd) };

  const [ndwi, floodWet, waterCur, waterPrev] = await Promise.all([
    deriveClassificationOverlay('ndwi_water_presence', { ...baseBody, dateRange: currentRange }),
    deriveClassificationOverlay('flood_wet', { ...baseBody, dateRange: currentRange }),
    deriveClassificationOverlay('water_extent', { ...baseBody, dateRange: currentRange }),
    deriveClassificationOverlay('water_extent', { ...baseBody, dateRange: previousRange }),
  ]);

  const ndwiR = ndwi as Record<string, unknown>;
  const wetR = floodWet as Record<string, unknown>;
  const curR = waterCur as Record<string, unknown>;
  const prevR = waterPrev as Record<string, unknown>;

  if (ndwiR.ok !== true || wetR.ok !== true || curR.ok !== true || prevR.ok !== true) {
    return 'failed';
  }

  const cellKm2 = gridCellAreaKm2(zone);
  const curFeat = overlayFeatureCount(curR);
  const prevFeat = overlayFeatureCount(prevR);
  const waterExtentSqKm = Number((curFeat * cellKm2).toFixed(3));
  const previousWaterExtentSqKm = Number((prevFeat * cellKm2).toFixed(3));

  const ndwiMean = overlayMean(ndwiR) ?? 0;
  const floodWetConfidence = overlayConfidence(wetR);

  const waterExpansionPercent =
    previousWaterExtentSqKm > 0
      ? Number((((waterExtentSqKm - previousWaterExtentSqKm) / previousWaterExtentSqKm) * 100).toFixed(1))
      : waterExtentSqKm > 0
        ? 100
        : 0;

  const expansionPercent = Math.max(0, waterExpansionPercent);

  const upstream =
    (process.env.COPERNICUS_BASE_URL?.trim() || 'https://services.sentinel-hub.com').replace(/\/+$/, '') +
    '/api/v1/process';

  const meta: FloodSatelliteMeta = {
    zoneId: zone.zoneId,
    status: 'live',
    ndwiMean: Number(ndwiMean.toFixed(4)),
    waterExtentSqKm,
    previousWaterExtentSqKm,
    waterExpansionPercent: expansionPercent,
    floodWetConfidence: Number(floodWetConfidence.toFixed(3)),
    source: 'satellite',
    provider: 'aquascan-live',
    providerLabel: 'DPAL AquaScan / Copernicus Sentinel Hub',
    fetchedAt: now.toISOString(),
    isLive: true,
    upstreamUrl: upstream,
    attribution:
      'Contains modified Copernicus Sentinel data processed via DPAL AquaScan overlay routes. Screening-only; not a regulatory flood map.',
    message: `Live NDWI / water extent / flood-wet screening from AquaScan overlay service. ${LEGAL}`,
  };

  return {
    ok: true,
    meta,
    expansionPercent,
    message: meta.message,
  };
}

/**
 * Fetch satellite water signals for `zone`, merge-friendly with rainfall on
 * `FloodWeatherSignal`. Always resolves (never throws).
 */
export async function getSatelliteSample(
  zone: FloodZone,
  _base: FloodWeatherSignal | null,
  now: Date = new Date(),
): Promise<SatelliteSampleResult> {
  const cached = readCache(zone.zoneId);
  if (cached) return cached;

  if (!isLiveSatelliteEnabled()) {
    const meta = buildDeterministicMeta(
      zone,
      now,
      'fallback',
      'Live AquaScan satellite adapter disabled (set FLOODGUARD_LIVE_SATELLITE_ENABLED=true and configure Copernicus credentials).',
    );
    const r: SatelliteSampleResult = {
      ok: true,
      meta,
      expansionPercent: Math.max(0, meta.waterExpansionPercent),
      message: meta.message,
    };
    writeCache(zone.zoneId, r);
    return r;
  }

  const live = await withTimeout(fetchLiveCluster(zone, now), LIVE_TOTAL_TIMEOUT_MS);
  if (live === 'timeout' || live === 'failed') {
    const reason =
      live === 'timeout'
        ? 'AquaScan live satellite cluster timed out; using synthetic flood-water signal.'
        : 'AquaScan live overlays unavailable for this AOI/date window; using synthetic flood-water signal.';
    const meta = buildDeterministicMeta(zone, now, live === 'timeout' ? 'network_error' : 'unavailable', reason);
    const r: SatelliteSampleResult = {
      ok: true,
      meta,
      expansionPercent: Math.max(0, meta.waterExpansionPercent),
      message: meta.message,
    };
    writeCache(zone.zoneId, r);
    return r;
  }

  writeCache(zone.zoneId, live);
  return live;
}

export function satelliteAdapterHealth(): {
  enabled: boolean;
  status: FloodSatelliteIntegrationStatus;
  provider: string;
  providerLabel: string;
  message: string;
  upstreamUrl?: string;
} {
  const flagOn = isLiveSatelliteEnabled();
  const creds =
    Boolean(process.env.COPERNICUS_CLIENT_ID?.trim()) && Boolean(process.env.COPERNICUS_CLIENT_SECRET?.trim());
  const liveReady = flagOn && creds;
  const baseUrl = (process.env.COPERNICUS_BASE_URL?.trim() || 'https://services.sentinel-hub.com').replace(/\/+$/, '');
  return {
    enabled: liveReady,
    status: liveReady ? 'live' : 'fallback',
    provider: liveReady ? 'aquascan-live' : 'aquascan-fallback',
    providerLabel: liveReady
      ? 'DPAL AquaScan / Copernicus Sentinel Hub'
      : 'DPAL AquaScan synthetic flood-water signal',
    message: liveReady
      ? `Live satellite water screening via AquaScan overlay service. ${LEGAL}`
      : flagOn && !creds
        ? `FLOODGUARD_LIVE_SATELLITE_ENABLED is set but Copernicus credentials are missing; using synthetic flood-water signal. ${LEGAL}`
        : `Synthetic satellite water signal (enable live mode + Copernicus credentials for Sentinel-derived overlays). ${LEGAL}`,
    upstreamUrl: liveReady ? `${baseUrl}/api/v1/process` : undefined,
  };
}
