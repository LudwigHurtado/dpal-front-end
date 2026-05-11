/**
 * Server-side coalescing, cooldowns, and optional per-minute caps for external provider calls.
 */

import {
  getRecentProviderCallEvents,
  getTotalsByProvider,
  getTotalsByStatus,
  recordProviderCallEvent,
  type ProviderCallEvent,
} from "./providerCallMonitor.js";

/** Composite cooldown key in maps */
function compositeKey(providerName: string, requestKey: string): string {
  return `${providerName}::${requestKey}`;
}

export function roundCoord3(n: number): string {
  return Number(n).toFixed(3);
}

/** Stable key from sorted JSON of primitives (no nested objects beyond one level). */
export function buildProviderRequestKey(
  providerName: string,
  operation: string,
  input: Record<string, string | number | boolean | null | undefined>,
): string {
  const keys = Object.keys(input).sort();
  const parts = keys.map((k) => {
    const v = input[k];
    if (v == null) return `${k}=`;
    return `${k}=${String(v)}`;
  });
  return `${providerName}|${operation}|${parts.join("&")}`;
}

const inflight = new Map<string, Promise<unknown>>();
const cooldowns = new Map<string, { until: number; reason: string }>();

/** Sliding window: timestamps of external-call starts per provider (for optional cap). */
const minuteWindows = new Map<string, number[]>();

const DEFAULT_PER_MINUTE = 90;

export const DEFAULT_COOLDOWN_MS = {
  FloodGuard_rate: 15 * 60 * 1000,
  FloodGuard_error: 10 * 60 * 1000,
  USGS_rate: 10 * 60 * 1000,
  USGS_error: 10 * 60 * 1000,
  NWS_rate: 10 * 60 * 1000,
  NWS_error: 10 * 60 * 1000,
  GeoLedger_rate: 5 * 60 * 1000,
  GeoLedger_error: 5 * 60 * 1000,
} as const;

function isRateLimitMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("429") ||
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("daily api request limit exceeded")
  );
}

export function isProviderRateLimitError(err: unknown): boolean {
  return isRateLimitMessage(String(err instanceof Error ? err.message : err ?? ""));
}

export function setProviderCooldown(
  providerName: string,
  requestKey: string,
  reason: string,
  ttlMs: number,
): void {
  const ck = compositeKey(providerName, requestKey);
  cooldowns.set(ck, { until: Date.now() + Math.max(1000, ttlMs), reason });
}

export function getProviderCooldownStatus(
  providerName: string,
  requestKey: string,
): { active: boolean; until: number | null; reason: string | null } {
  const ck = compositeKey(providerName, requestKey);
  const row = cooldowns.get(ck);
  if (!row) return { active: false, until: null, reason: null };
  if (Date.now() >= row.until) {
    cooldowns.delete(ck);
    return { active: false, until: null, reason: null };
  }
  return { active: true, until: row.until, reason: row.reason };
}

function pruneCooldowns(): void {
  const now = Date.now();
  for (const [k, v] of cooldowns) {
    if (now >= v.until) cooldowns.delete(k);
  }
}

function pruneMinuteWindow(providerName: string, now: number): void {
  const arr = minuteWindows.get(providerName) ?? [];
  const cutoff = now - 60_000;
  const next = arr.filter((t) => t > cutoff);
  minuteWindows.set(providerName, next);
}

function overPerMinuteLimit(providerName: string, limit: number): boolean {
  const now = Date.now();
  pruneMinuteWindow(providerName, now);
  const arr = minuteWindows.get(providerName) ?? [];
  return arr.length >= limit;
}

function recordMinuteTick(providerName: string): void {
  const now = Date.now();
  pruneMinuteWindow(providerName, now);
  const arr = minuteWindows.get(providerName) ?? [];
  arr.push(now);
  minuteWindows.set(providerName, arr);
}

export interface RunGuardedProviderCallOptions<T> {
  key: string;
  providerName: string;
  operation: string;
  fn: () => Promise<T>;
  onCooldown: () => Promise<T> | T;
  /** e.g. water_alert_evidence_packet */
  source?: string;
  latRounded3?: string | null;
  lngRounded3?: string | null;
  rateLimitCooldownMs: number;
  errorCooldownMs: number;
  /** Max completed external attempts per provider per rolling 60s (0 = disabled). */
  perMinuteLimit?: number;
}

/**
 * Coalesce identical in-flight work, honor cooldowns, optional per-minute cap.
 */
export async function runGuardedProviderCall<T>(opts: RunGuardedProviderCallOptions<T>): Promise<T> {
  const {
    key,
    providerName,
    operation,
    fn,
    onCooldown,
    source = null,
    latRounded3 = null,
    lngRounded3 = null,
    rateLimitCooldownMs,
    errorCooldownMs,
    perMinuteLimit = DEFAULT_PER_MINUTE,
  } = opts;

  const ck = compositeKey(providerName, key);
  const startedWall = Date.now();
  const startedIso = new Date(startedWall).toISOString();

  pruneCooldowns();
  const cd = cooldowns.get(ck);
  if (cd && Date.now() < cd.until) {
    recordProviderCallEvent({
      providerName,
      operation,
      requestKey: key,
      startedAt: startedIso,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedWall,
      status: "skipped_cooldown",
      errorType: cd.reason,
      source,
      latRounded3,
      lngRounded3,
    });
    return await onCooldown();
  }

  if (perMinuteLimit > 0 && overPerMinuteLimit(providerName, perMinuteLimit)) {
    recordProviderCallEvent({
      providerName,
      operation,
      requestKey: key,
      startedAt: startedIso,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedWall,
      status: "skipped_cooldown",
      errorType: "per_minute_cap",
      source,
      latRounded3,
      lngRounded3,
    });
    return await onCooldown();
  }

  const existing = inflight.get(ck) as Promise<T> | undefined;
  if (existing) {
    recordProviderCallEvent({
      providerName,
      operation,
      requestKey: key,
      startedAt: startedIso,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedWall,
      status: "coalesced",
      errorType: null,
      source,
      latRounded3,
      lngRounded3,
    });
    return await existing;
  }

  recordProviderCallEvent({
    providerName,
    operation,
    requestKey: key,
    startedAt: startedIso,
    completedAt: null,
    durationMs: null,
    status: "started",
    errorType: null,
    source,
    latRounded3,
    lngRounded3,
  });

  const run = (async () => {
    try {
      recordMinuteTick(providerName);
      const out = await fn();
      const done = Date.now();
      recordProviderCallEvent({
        providerName,
        operation,
        requestKey: key,
        startedAt: startedIso,
        completedAt: new Date(done).toISOString(),
        durationMs: done - startedWall,
        status: "completed",
        errorType: null,
        source,
        latRounded3,
        lngRounded3,
      });
      return out;
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err ?? "error");
      const rl = isProviderRateLimitError(err);
      if (rl) {
        setProviderCooldown(providerName, key, "rate_limited", rateLimitCooldownMs);
        recordProviderCallEvent({
          providerName,
          operation,
          requestKey: key,
          startedAt: startedIso,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startedWall,
          status: "rate_limited",
          errorType: "rate_limited",
          source,
          latRounded3,
          lngRounded3,
        });
      } else {
        setProviderCooldown(providerName, key, "provider_error", errorCooldownMs);
        recordProviderCallEvent({
          providerName,
          operation,
          requestKey: key,
          startedAt: startedIso,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startedWall,
          status: "failed",
          errorType: "provider_error",
          source,
          latRounded3,
          lngRounded3,
        });
      }
      throw err;
    } finally {
      inflight.delete(ck);
    }
  })();

  inflight.set(ck, run);
  return await run;
}

export function getActiveInFlightKeys(): string[] {
  return [...inflight.keys()];
}

export function getActiveCooldowns(): Array<{ key: string; until: string; reason: string }> {
  pruneCooldowns();
  const now = Date.now();
  const out: Array<{ key: string; until: string; reason: string }> = [];
  for (const [k, v] of cooldowns) {
    if (v.until > now) out.push({ key: k, until: new Date(v.until).toISOString(), reason: v.reason });
  }
  return out;
}

export function getProviderUsageSummary(): {
  totalsByProvider: Record<string, number>;
  totalsByStatus: Record<string, number>;
  recentEvents: ProviderCallEvent[];
  activeInFlightKeys: string[];
  activeCooldowns: Array<{ key: string; until: string; reason: string }>;
} {
  return {
    totalsByProvider: getTotalsByProvider(),
    totalsByStatus: getTotalsByStatus(),
    recentEvents: getRecentProviderCallEvents().slice(-200),
    activeInFlightKeys: getActiveInFlightKeys(),
    activeCooldowns: getActiveCooldowns(),
  };
}

/** Endpoint-level dedupe key (rounded coords + optional site + trimmed label). */
export function buildWaterAlertPacketRequestKey(input: {
  lat: number;
  lng: number;
  label?: string;
  usgsSite?: string;
}): string {
  const latR = roundCoord3(input.lat);
  const lngR = roundCoord3(input.lng);
  const site = input.usgsSite?.trim() ?? "";
  const label = (input.label ?? "").trim().slice(0, 160);
  return `water_alert_packet|${latR}|${lngR}|site=${site}|label=${label}`;
}

export function clearProviderGuardsForTests(): void {
  inflight.clear();
  cooldowns.clear();
  minuteWindows.clear();
}
