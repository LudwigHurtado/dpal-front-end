/**
 * DPAL FloodGuard — pluggable rainfall adapter (Stage 12A).
 *
 * Provider chain:
 *   1. Live provider (currently Open-Meteo — free, no key, no paid contract).
 *      Gated behind env flag `FLOODGUARD_LIVE_RAINFALL_ENABLED=true`.
 *   2. Deterministic synthetic fallback used when:
 *        - the live provider is disabled or unreachable, or
 *        - the response cannot be parsed.
 *
 * The adapter NEVER throws; it always returns a `RainfallSampleResult` and
 * surfaces the integration state (`live | fallback | unavailable | http_error
 * | network_error`) on `meta.status` so dashboards / evidence packets can show
 * provenance.
 *
 * Legal positioning carried by the message field:
 *   "DPAL FloodGuard provides verified civic flood intelligence and does not
 *    replace official government emergency alerts."
 */

import type {
  FloodRainfallIntegrationStatus,
  FloodRainfallMeta,
  FloodRainfallProvider,
  FloodWeatherSignal,
  FloodZone,
} from './floodGuardTypes';

// ── Public contract ──────────────────────────────────────────────────────────

export interface RainfallAdapterResult {
  ok: true;
  signal: FloodWeatherSignal;
  /** Convenience copy of `signal.rainfallMeta` for callers that don't need the signal. */
  meta: FloodRainfallMeta;
  message?: string;
}

export interface RainfallProvider {
  id: FloodRainfallProvider;
  label: string;
  fetchSample(zone: FloodZone, signal?: AbortSignal): Promise<RawRainfallSample | null>;
}

interface RawRainfallSample {
  rainfall30mMm: number;
  rainfall24hMm: number;
  upstreamUrl: string;
  attribution?: string;
  status: FloodRainfallIntegrationStatus;
  message?: string;
}

// ── Configuration ────────────────────────────────────────────────────────────

const FALLBACK_LEGAL_MESSAGE =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

const LIVE_TIMEOUT_MS = 4_000;
const CACHE_TTL_MS = 8 * 60 * 1_000; // 8 minutes per zone

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on', 'enabled']);

function isLiveEnabled(): boolean {
  const raw = (process.env.FLOODGUARD_LIVE_RAINFALL_ENABLED ?? '').trim().toLowerCase();
  return TRUE_VALUES.has(raw);
}

function configuredProviderId(): FloodRainfallProvider {
  const raw = (process.env.FLOODGUARD_RAINFALL_PROVIDER ?? 'open-meteo').trim().toLowerCase();
  if (raw === 'open-meteo' || raw === 'synthetic' || raw === 'seeded' || raw === 'none') {
    return raw;
  }
  return 'open-meteo';
}

// ── Open-Meteo provider (free, no API key) ───────────────────────────────────
// API docs: https://open-meteo.com/en/docs — free for non-commercial use.
// We request:
//   - last 1h of 15-minute precipitation totals (sum the most recent 2 buckets ⇒ 30 min)
//   - last 24h of hourly precipitation totals (sum)

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

interface OpenMeteoResponse {
  minutely_15?: { time?: string[]; precipitation?: number[] };
  hourly?: { time?: string[]; precipitation?: number[] };
}

const openMeteoProvider: RainfallProvider = {
  id: 'open-meteo',
  label: 'Open-Meteo (free tier)',
  async fetchSample(zone, signal): Promise<RawRainfallSample | null> {
    const lat = zone.center.lat.toFixed(4);
    const lng = zone.center.lng.toFixed(4);
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      minutely_15: 'precipitation',
      hourly: 'precipitation',
      past_hours: '24',
      past_minutes: '60',
      forecast_hours: '0',
      forecast_minutes: '0',
      timezone: 'UTC',
    });
    const url = `${OPEN_METEO_BASE}?${params.toString()}`;

    let res: Response;
    try {
      res = await fetch(url, { signal });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error contacting Open-Meteo.';
      return {
        rainfall30mMm: 0,
        rainfall24hMm: 0,
        upstreamUrl: url,
        status: 'network_error',
        message,
      };
    }

    if (!res.ok) {
      return {
        rainfall30mMm: 0,
        rainfall24hMm: 0,
        upstreamUrl: url,
        status: 'http_error',
        message: `Open-Meteo responded ${res.status}.`,
      };
    }

    let body: OpenMeteoResponse;
    try {
      body = (await res.json()) as OpenMeteoResponse;
    } catch (err) {
      return {
        rainfall30mMm: 0,
        rainfall24hMm: 0,
        upstreamUrl: url,
        status: 'http_error',
        message: 'Could not parse Open-Meteo response.',
      };
    }

    const minute15 = body.minutely_15?.precipitation ?? [];
    const hourly = body.hourly?.precipitation ?? [];
    const last2Buckets = minute15.slice(-2);
    const last24Buckets = hourly.slice(-24);

    if (!last2Buckets.length && !last24Buckets.length) {
      return {
        rainfall30mMm: 0,
        rainfall24hMm: 0,
        upstreamUrl: url,
        status: 'unavailable',
        message: 'Open-Meteo returned no rainfall samples for this AOI.',
      };
    }

    const rainfall30mMm = roundMm(sum(last2Buckets));
    const rainfall24hMm = roundMm(sum(last24Buckets));

    return {
      rainfall30mMm,
      rainfall24hMm,
      upstreamUrl: url,
      status: 'live',
      attribution: 'Open-Meteo (https://open-meteo.com) — free tier, non-commercial.',
    };
  },
};

const PROVIDERS: Record<FloodRainfallProvider, RainfallProvider | null> = {
  'open-meteo': openMeteoProvider,
  synthetic: null,
  seeded: null,
  none: null,
};

// ── Caching ──────────────────────────────────────────────────────────────────

interface CacheEntry {
  result: RainfallAdapterResult;
  cachedAtMs: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(zoneId: string): string {
  return zoneId;
}

function readCache(zoneId: string): RainfallAdapterResult | null {
  const entry = cache.get(cacheKey(zoneId));
  if (!entry) return null;
  if (Date.now() - entry.cachedAtMs > CACHE_TTL_MS) {
    cache.delete(cacheKey(zoneId));
    return null;
  }
  return entry.result;
}

function writeCache(zoneId: string, result: RainfallAdapterResult): void {
  cache.set(cacheKey(zoneId), { result, cachedAtMs: Date.now() });
}

export function clearRainfallCache(): void {
  cache.clear();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sum(values: Array<number | null | undefined>): number {
  let total = 0;
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) total += Math.max(0, v);
  }
  return total;
}

function roundMm(mm: number): number {
  return Math.round(mm * 10) / 10;
}

function intensityMmPerHr(rainfall30mMm: number): number {
  return Math.round(rainfall30mMm * 2 * 10) / 10;
}

function buildSignal(
  zone: FloodZone,
  rainfall30mMm: number,
  rainfall24hMm: number,
  base: FloodWeatherSignal | null,
  meta: FloodRainfallMeta,
  now: Date,
): FloodWeatherSignal {
  return {
    zoneId: zone.zoneId,
    rainfall30mMm,
    rainfall24hMm,
    riverGaugeMeters: base?.riverGaugeMeters,
    riverDeltaMeters: base?.riverDeltaMeters,
    satelliteWaterExpansionPct: base?.satelliteWaterExpansionPct,
    source: meta.isLive ? 'rain_gauge' : 'weather_feed',
    capturedAt: now.toISOString(),
    rainfallMeta: meta,
  };
}

function buildMeta(args: {
  status: FloodRainfallIntegrationStatus;
  provider: FloodRainfallProvider;
  providerLabel: string;
  zone: FloodZone;
  rainfall30mMm: number;
  rainfall24hMm: number;
  fetchedAt: string;
  upstreamUrl?: string;
  attribution?: string;
  message?: string;
}): FloodRainfallMeta {
  return {
    status: args.status,
    provider: args.provider,
    providerLabel: args.providerLabel,
    fetchedAt: args.fetchedAt,
    message: args.message,
    attribution: args.attribution,
    upstreamUrl: args.upstreamUrl,
    lat: args.zone.center.lat,
    lng: args.zone.center.lng,
    intensityMmPerHr: intensityMmPerHr(args.rainfall30mMm),
    isLive: args.status === 'live',
  };
}

/** Deterministic per-zone synthetic rainfall — keeps demo behaviour identical. */
function buildSyntheticSample(
  zone: FloodZone,
  base: FloodWeatherSignal | null,
  now: Date,
): { rainfall30mMm: number; rainfall24hMm: number } {
  const hour = now.getUTCHours();
  const seasonal = Math.sin((hour / 24) * Math.PI * 2) * 6;
  const catBoost =
    zone.riskCategory === 'critical'
      ? 12
      : zone.riskCategory === 'high'
        ? 8
        : zone.riskCategory === 'moderate'
          ? 4
          : 0;

  const base30 = base?.rainfall30mMm ?? 0;
  const base24 = base?.rainfall24hMm ?? 0;

  return {
    rainfall30mMm: Math.max(0, Math.round(base30 + seasonal + catBoost * 0.35)),
    rainfall24hMm: Math.max(0, Math.round(base24 + seasonal * 1.2 + catBoost)),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a rainfall sample for `zone`. Always succeeds: if live is disabled or
 * fails, returns a synthetic fallback with `meta.status === 'fallback'` (or
 * the upstream error code). Cached per zone for `CACHE_TTL_MS`.
 */
export async function getRainfallSample(
  zone: FloodZone,
  base: FloodWeatherSignal | null = null,
  now: Date = new Date(),
): Promise<RainfallAdapterResult> {
  const cached = readCache(zone.zoneId);
  if (cached) return cached;

  const fetchedAt = now.toISOString();
  const liveEnabled = isLiveEnabled();
  const providerId = configuredProviderId();
  const provider = PROVIDERS[providerId] ?? null;

  // Branch 1 — live disabled by env: return labelled fallback.
  if (!liveEnabled || !provider) {
    const synthetic = buildSyntheticSample(zone, base, now);
    const meta = buildMeta({
      status: liveEnabled ? 'unavailable' : 'fallback',
      provider: 'synthetic',
      providerLabel: 'DPAL synthetic rainfall',
      zone,
      rainfall30mMm: synthetic.rainfall30mMm,
      rainfall24hMm: synthetic.rainfall24hMm,
      fetchedAt,
      message: liveEnabled
        ? `Configured provider "${providerId}" is not implemented; using synthetic fallback. ${FALLBACK_LEGAL_MESSAGE}`
        : `Live rainfall adapter disabled (set FLOODGUARD_LIVE_RAINFALL_ENABLED=true to enable). ${FALLBACK_LEGAL_MESSAGE}`,
    });
    const result: RainfallAdapterResult = {
      ok: true,
      signal: buildSignal(zone, synthetic.rainfall30mMm, synthetic.rainfall24hMm, base, meta, now),
      meta,
      message: meta.message,
    };
    writeCache(zone.zoneId, result);
    return result;
  }

  // Branch 2 — live enabled: try the provider with timeout, fall back on any failure.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);
  let raw: RawRainfallSample | null = null;
  try {
    raw = await provider.fetchSample(zone, controller.signal);
  } catch (err) {
    raw = {
      rainfall30mMm: 0,
      rainfall24hMm: 0,
      upstreamUrl: '',
      status: 'network_error',
      message: err instanceof Error ? err.message : 'Live rainfall provider threw.',
    };
  } finally {
    clearTimeout(timer);
  }

  if (raw && raw.status === 'live') {
    const meta = buildMeta({
      status: 'live',
      provider: provider.id,
      providerLabel: provider.label,
      zone,
      rainfall30mMm: raw.rainfall30mMm,
      rainfall24hMm: raw.rainfall24hMm,
      fetchedAt,
      upstreamUrl: raw.upstreamUrl,
      attribution: raw.attribution,
      message: `Live rainfall sample from ${provider.label}. ${FALLBACK_LEGAL_MESSAGE}`,
    });
    const result: RainfallAdapterResult = {
      ok: true,
      signal: buildSignal(zone, raw.rainfall30mMm, raw.rainfall24hMm, base, meta, now),
      meta,
      message: meta.message,
    };
    writeCache(zone.zoneId, result);
    return result;
  }

  // Live attempt failed — synthesize a fallback but tag it with the upstream status.
  const synthetic = buildSyntheticSample(zone, base, now);
  const upstreamStatus = raw?.status ?? 'unavailable';
  const meta = buildMeta({
    status: upstreamStatus,
    provider: 'synthetic',
    providerLabel: 'DPAL synthetic rainfall (live attempt fell back)',
    zone,
    rainfall30mMm: synthetic.rainfall30mMm,
    rainfall24hMm: synthetic.rainfall24hMm,
    fetchedAt,
    upstreamUrl: raw?.upstreamUrl,
    message:
      raw?.message ??
      `Live rainfall provider "${provider.label}" did not return usable data; using synthetic fallback. ${FALLBACK_LEGAL_MESSAGE}`,
  });
  const result: RainfallAdapterResult = {
    ok: true,
    signal: buildSignal(zone, synthetic.rainfall30mMm, synthetic.rainfall24hMm, base, meta, now),
    meta,
    message: meta.message,
  };
  writeCache(zone.zoneId, result);
  return result;
}

/**
 * Synchronous helper for legacy callers — returns the synthetic sample only.
 * Existing code paths (e.g. seeded weather refresh) can keep using this until
 * they migrate to `getRainfallSample`.
 */
export function buildSyntheticRainfallSignal(
  zone: FloodZone,
  base: FloodWeatherSignal | null,
  now: Date = new Date(),
): RainfallAdapterResult {
  const synthetic = buildSyntheticSample(zone, base, now);
  const meta = buildMeta({
    status: 'fallback',
    provider: 'synthetic',
    providerLabel: 'DPAL synthetic rainfall',
    zone,
    rainfall30mMm: synthetic.rainfall30mMm,
    rainfall24hMm: synthetic.rainfall24hMm,
    fetchedAt: now.toISOString(),
    message: `Synthetic rainfall estimate (no external paid feed on this deployment). ${FALLBACK_LEGAL_MESSAGE}`,
  });
  return {
    ok: true,
    signal: buildSignal(zone, synthetic.rainfall30mMm, synthetic.rainfall24hMm, base, meta, now),
    meta,
    message: meta.message,
  };
}

/** Health snapshot used by route-level integration metadata. */
export function rainfallAdapterHealth(): {
  enabled: boolean;
  provider: FloodRainfallProvider;
  providerLabel: string;
  message: string;
} {
  const providerId = configuredProviderId();
  const provider = PROVIDERS[providerId] ?? null;
  const enabled = isLiveEnabled() && Boolean(provider);
  return {
    enabled,
    provider: enabled && provider ? provider.id : 'synthetic',
    providerLabel: enabled && provider ? provider.label : 'DPAL synthetic rainfall',
    message: enabled
      ? `Live rainfall adapter active via ${provider!.label}. ${FALLBACK_LEGAL_MESSAGE}`
      : `Live rainfall adapter disabled (set FLOODGUARD_LIVE_RAINFALL_ENABLED=true to enable). ${FALLBACK_LEGAL_MESSAGE}`,
  };
}
