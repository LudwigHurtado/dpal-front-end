/**
 * DPAL FloodGuard — water level / river gauge adapter (Stage 12E).
 *
 * Pluggable chain:
 *   - `FLOODGUARD_LIVE_WATER_LEVEL_ENABLED=true` + a non-synthetic provider id can
 *     later attach municipal/USGS/etc. connectors (none shipped here).
 *   - Until then, any "live" request without a real connector returns
 *     `unavailable` on metadata while still attaching deterministic gauge rows
 *     so the risk engine and UI never break.
 *
 * Always resolves; never throws.
 *
 * Env:
 *   FLOODGUARD_LIVE_WATER_LEVEL_ENABLED=true|false
 *   FLOODGUARD_WATER_LEVEL_PROVIDER=synthetic|municipal|... (extensible)
 */

import type {
  FloodWaterLevelGaugeType,
  FloodWaterLevelIntegrationStatus,
  FloodWaterLevelMeta,
  FloodWaterLevelTrend,
  FloodWeatherSignal,
  FloodZone,
} from './floodGuardTypes';

const LEGAL =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on', 'enabled']);

const GAUGE_TYPES: FloodWaterLevelGaugeType[] = [
  'river',
  'canal',
  'drainage_channel',
  'retention_basin',
  'reservoir',
  'bridge_underpass_marker',
  'manual_field_reading',
  'synthetic_fallback',
];

function isLiveWaterLevelEnabled(): boolean {
  const raw = (process.env.FLOODGUARD_LIVE_WATER_LEVEL_ENABLED ?? '').trim().toLowerCase();
  return TRUE_VALUES.has(raw);
}

function configuredProviderId(): string {
  return (process.env.FLOODGUARD_WATER_LEVEL_PROVIDER ?? 'synthetic').trim().toLowerCase() || 'synthetic';
}

function zoneSeed01(zoneId: string): number {
  let h = 2166136261;
  for (let i = 0; i < zoneId.length; i += 1) {
    h ^= zoneId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function pickGaugeType(zoneId: string): FloodWaterLevelGaugeType {
  const s = zoneSeed01(zoneId + ':gauge');
  const idx = Math.floor(s * GAUGE_TYPES.length) % GAUGE_TYPES.length;
  return GAUGE_TYPES[idx]!;
}

function pickTrend(seed: number): FloodWaterLevelTrend {
  if (seed < 0.33) return 'rising';
  if (seed < 0.66) return 'stable';
  return 'falling';
}

export interface WaterLevelAdapterHealth {
  liveEnabled: boolean;
  provider: string;
  providerLabel: string;
  message: string;
  /** Top-level integration status for dashboards. */
  status: FloodWaterLevelIntegrationStatus;
}

export function waterLevelAdapterHealth(): WaterLevelAdapterHealth {
  const liveEnabled = isLiveWaterLevelEnabled();
  const pid = configuredProviderId();
  if (!liveEnabled) {
    return {
      liveEnabled: false,
      provider: 'synthetic_fallback',
      providerLabel: 'DPAL synthetic water-level gauge',
      status: 'fallback',
      message: `Live water-level adapter disabled (set FLOODGUARD_LIVE_WATER_LEVEL_ENABLED=true). ${LEGAL}`,
    };
  }
  if (pid === 'synthetic') {
    return {
      liveEnabled: true,
      provider: 'synthetic',
      providerLabel: 'Synthetic gauge (deterministic)',
      status: 'fallback',
      message: `Live flag on with provider=synthetic — using deterministic gauge rows (no external gauge API). ${LEGAL}`,
    };
  }
  return {
    liveEnabled: true,
    provider: pid,
    providerLabel: `Configured provider "${pid}" (no HTTP connector in this build)`,
    status: 'unavailable',
    message: `FLOODGUARD_WATER_LEVEL_PROVIDER=${pid} has no live connector yet; using deterministic fallback readings. ${LEGAL}`,
  };
}

export interface WaterLevelSampleResult {
  ok: true;
  meta: FloodWaterLevelMeta;
}

function buildDeterministicMeta(
  zone: FloodZone,
  asOf: Date,
  integrationStatus: FloodWaterLevelIntegrationStatus,
  isLive: boolean,
  provider: string,
  providerLabel: string,
  message?: string,
): FloodWaterLevelMeta {
  const s0 = zoneSeed01(zone.zoneId);
  const s1 = zoneSeed01(`${zone.zoneId}:wl1`);
  const s2 = zoneSeed01(`${zone.zoneId}:wl2`);
  const gaugeType = pickGaugeType(zone.zoneId);
  const criticalLevelMeters = 2.2 + s0 * 2.8;
  const normalLevelMeters = Math.round(criticalLevelMeters * (0.48 + s1 * 0.12) * 100) / 100;
  const warningLevelMeters = Math.round(criticalLevelMeters * (0.72 + s1 * 0.1) * 100) / 100;

  const stageFrac = 0.35 + s2 * 0.55;
  const waterLevelMeters = Math.round(normalLevelMeters + (criticalLevelMeters - normalLevelMeters) * stageFrac * 100) / 100;
  const levelPercentOfCritical = Math.round((waterLevelMeters / Math.max(0.01, criticalLevelMeters)) * 1000) / 10;

  const trend = pickTrend(zoneSeed01(`${zone.zoneId}:trend`));
  const trendDeltaMeters =
    trend === 'rising'
      ? Math.round((0.04 + s1 * 0.22) * 100) / 100
      : trend === 'falling'
        ? -Math.round((0.02 + s2 * 0.12) * 100) / 100
        : Math.round((s2 - 0.5) * 0.04 * 100) / 100;

  const fetchedAt = asOf.toISOString();
  const gaugeId = `DPAL-WL-${zone.zoneId.slice(-8)}`;
  const gaugeName =
    gaugeType === 'river'
      ? `River stage · ${zone.name.slice(0, 48)}`
      : gaugeType === 'drainage_channel'
        ? `Drainage channel · ${zone.name.slice(0, 40)}`
        : gaugeType === 'bridge_underpass_marker'
          ? `Underpass flood marker · ${zone.name.slice(0, 40)}`
          : `DPAL gauge · ${zone.name.slice(0, 44)}`;

  return {
    zoneId: zone.zoneId,
    gaugeId,
    gaugeName,
    gaugeType,
    waterLevelMeters,
    normalLevelMeters,
    warningLevelMeters,
    criticalLevelMeters,
    levelPercentOfCritical,
    trend,
    trendDeltaMeters,
    readingTimestamp: fetchedAt,
    status: integrationStatus,
    provider,
    providerLabel,
    isLive,
    fetchedAt,
    message: message ?? LEGAL,
    attribution: isLive ? undefined : 'DPAL FloodGuard deterministic synthetic gauge for continuity testing.',
  };
}

/**
 * Returns a water-level row for the zone. Never throws.
 */
export async function getWaterLevelSample(
  zone: FloodZone,
  _existing: FloodWeatherSignal | null,
  asOf: Date,
): Promise<WaterLevelSampleResult> {
  const liveEnabled = isLiveWaterLevelEnabled();
  const pid = configuredProviderId();

  if (!liveEnabled) {
    const meta = buildDeterministicMeta(zone, asOf, 'fallback', false, 'synthetic_fallback', 'DPAL synthetic water-level gauge');
    return { ok: true, meta };
  }

  if (pid === 'synthetic') {
    const meta = buildDeterministicMeta(
      zone,
      asOf,
      'fallback',
      false,
      'synthetic',
      'Synthetic gauge (deterministic)',
      `FLOODGUARD_LIVE_WATER_LEVEL_ENABLED with provider=synthetic. ${LEGAL}`,
    );
    return { ok: true, meta };
  }

  const health = waterLevelAdapterHealth();
  const meta = buildDeterministicMeta(
    zone,
    asOf,
    'unavailable',
    false,
    'synthetic_fallback',
    health.providerLabel,
    health.message,
  );
  return { ok: true, meta };
}
