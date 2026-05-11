/**
 * Environmental Intelligence Hub — API connectivity probes with 429 handling,
 * Retry-After / exponential backoff, short TTL cache, and staggered requests.
 */

import { API_ROUTES, apiUrl } from '../../constants';

export type HubAdapterId = 'health' | 'copernicus' | 'carb' | 'signals' | 'ai';

export type HubAdapterDisplayStatus =
  | 'ok'
  | 'degraded'
  | 'offline'
  | 'rate_limited'
  | 'loading'
  | 'unknown';

export interface HubConnectivityRow {
  id: HubAdapterId;
  label: string;
  status: HubAdapterDisplayStatus;
  detail: string;
  lastCheckedAt: Date | null;
  nextRetryAt: Date | null;
  retryAfterSeconds: number | null;
  lastSuccessfulAt: Date | null;
  lastError: string | null;
  usingCachedResult: boolean;
}

const STORAGE_STATE = 'dpal_env_hub_adapter_state_v1';
const STORAGE_CACHE = 'dpal_env_hub_cache_v1';

const MAX_COOLDOWN_SEC = 15 * 60;
const BACKOFF_STEPS_SEC = [60, 120, 300, 900];

/** API host cache TTL — 2 minutes; external adapter probes — 10 minutes */
export const HUB_PROBE_CACHE_TTL_MS: Record<HubAdapterId, number> = {
  health: 120_000,
  copernicus: 600_000,
  carb: 600_000,
  signals: 600_000,
  ai: 600_000,
};

export const HUB_AUTO_REFRESH_MS = 300_000;
export const HUB_PROBE_STAGGER_MS = 450;

interface PersistedAdapter {
  consecutive429: number;
  nextRetryEpochMs: number;
  lastSuccessEpochMs: number | null;
  lastSuccessDetail: string | null;
  lastSuccessStatus: 'ok' | 'degraded';
  lastError: string | null;
}

interface CacheBlob {
  expiresAt: number;
  row: Omit<HubConnectivityRow, 'lastCheckedAt'> & { savedAtEpochMs: number };
}

type PersistedMap = Record<string, PersistedAdapter>;
type CacheMap = Record<string, CacheBlob>;

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadPersisted(): PersistedMap {
  if (typeof localStorage === 'undefined') return {};
  return safeParseJson<PersistedMap>(localStorage.getItem(STORAGE_STATE)) ?? {};
}

function savePersisted(map: PersistedMap) {
  try {
    localStorage.setItem(STORAGE_STATE, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

function loadCache(): CacheMap {
  if (typeof localStorage === 'undefined') return {};
  return safeParseJson<CacheMap>(localStorage.getItem(STORAGE_CACHE)) ?? {};
}

function saveCache(map: CacheMap) {
  try {
    localStorage.setItem(STORAGE_CACHE, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

/** Parse Retry-After as delta-seconds or HTTP-date (RFC 7231). */
export function parseRetryAfterSeconds(headers: Headers, nowMs: number = Date.now()): number | null {
  const raw = headers.get('retry-after')?.trim();
  if (!raw) return null;
  const sec = parseInt(raw, 10);
  if (!Number.isNaN(sec) && String(sec) === raw) {
    return sec > 0 ? sec : null;
  }
  const when = Date.parse(raw);
  if (!Number.isNaN(when)) {
    const delta = Math.ceil((when - nowMs) / 1000);
    return delta > 0 ? delta : null;
  }
  return null;
}

/** Cooldown after 429: honor Retry-After (capped); else exponential steps. */
export function computeCooldownSecondsAfter429(consecutive429: number, retryAfter: number | null): number {
  if (retryAfter != null && retryAfter > 0) {
    return Math.min(Math.max(retryAfter, 1), MAX_COOLDOWN_SEC);
  }
  const idx = Math.min(Math.max(consecutive429 - 1, 0), BACKOFF_STEPS_SEC.length - 1);
  return BACKOFF_STEPS_SEC[idx];
}

async function readJsonUnknown(res: Response): Promise<unknown | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

type InterpretFn = (res: Response, json: unknown) => { status: HubAdapterDisplayStatus; detail: string };

function labels(): Record<HubAdapterId, string> {
  return {
    health: 'API host',
    copernicus: 'Copernicus proxy',
    carb: 'CARB data module',
    signals: 'Global signals API',
    ai: 'Server AI',
  };
}

function buildLoadingRows(): HubConnectivityRow[] {
  const L = labels();
  return (Object.keys(L) as HubAdapterId[]).map((id) => ({
    id,
    label: L[id],
    status: 'loading',
    detail: 'Checking…',
    lastCheckedAt: null,
    nextRetryAt: null,
    retryAfterSeconds: null,
    lastSuccessfulAt: null,
    lastError: null,
    usingCachedResult: false,
  }));
}

function remainingRetrySec(nextRetryEpochMs: number, now: number): number {
  return Math.max(0, Math.ceil((nextRetryEpochMs - now) / 1000));
}

/** Exported for tests — merge 429 into persisted adapter state. */
export function apply429ToPersisted(prev: PersistedAdapter | undefined, retryAfterSec: number | null): PersistedAdapter {
  const p = prev ?? {
    consecutive429: 0,
    nextRetryEpochMs: 0,
    lastSuccessEpochMs: null,
    lastSuccessDetail: null,
    lastSuccessStatus: 'ok' as const,
    lastError: null,
  };
  const nextCount = p.consecutive429 + 1;
  const cool = computeCooldownSecondsAfter429(nextCount, retryAfterSec);
  const now = Date.now();
  return {
    consecutive429: nextCount,
    nextRetryEpochMs: now + cool * 1000,
    lastSuccessEpochMs: p.lastSuccessEpochMs,
    lastSuccessDetail: p.lastSuccessDetail,
    lastSuccessStatus: p.lastSuccessStatus,
    lastError: `HTTP 429 — Retry after ${cool}s`,
  };
}

export function applySuccessToPersisted(
  prev: PersistedAdapter | undefined,
  detail: string,
  status: 'ok' | 'degraded',
): PersistedAdapter {
  const now = Date.now();
  const p = prev ?? {
    consecutive429: 0,
    nextRetryEpochMs: 0,
    lastSuccessEpochMs: null,
    lastSuccessDetail: null,
    lastSuccessStatus: 'ok' as const,
    lastError: null,
  };
  return {
    consecutive429: 0,
    nextRetryEpochMs: 0,
    lastSuccessEpochMs: now,
    lastSuccessDetail: detail,
    lastSuccessStatus: status,
    lastError: null,
  };
}

export interface HubProbeRunMeta {
  skippedCooldownIds: HubAdapterId[];
  refreshNotice: string | null;
}

/**
 * Run staggered probes with cache + cooldown. Mutates localStorage persistence/cache.
 * @param bypassCache User "Refresh now" — refetch adapters that are allowed to probe (skip cached TTL).
 * @param bypassCooldown Dev-only — probe even during cooldown (still records new 429s).
 */
export async function runEnvironmentalHubProbes(options: {
  bypassCache?: boolean;
  bypassCooldown?: boolean;
  signal?: AbortSignal;
}): Promise<{ rows: HubConnectivityRow[]; meta: HubProbeRunMeta }> {
  const bypassCache = options.bypassCache ?? false;
  const bypassCooldown = options.bypassCooldown ?? false;
  const signal = options.signal;
  const now = Date.now();
  const persisted = loadPersisted();
  const cacheMap = loadCache();
  const L = labels();

  const definitions: Array<{ id: HubAdapterId; url: string; interpret: InterpretFn }> = [
    {
      id: 'health',
      url: apiUrl('/health'),
      interpret: (res, json) => {
        if (res.status === 429) return { status: 'rate_limited', detail: `Rate limited HTTP ${res.status}` };
        if (!res.ok) return { status: 'offline', detail: `HTTP ${res.status}` };
        const o = json as { ok?: boolean } | null;
        if (o?.ok === false) return { status: 'degraded', detail: 'Host responded but reports not ready' };
        return { status: 'ok', detail: 'Reachable' };
      },
    },
    {
      id: 'copernicus',
      url: apiUrl(API_ROUTES.COPERNICUS_STATUS),
      interpret: (res, json) => {
        if (res.status === 429) return { status: 'rate_limited', detail: `Rate limited HTTP ${res.status}` };
        if (!res.ok) return { status: 'offline', detail: `HTTP ${res.status}` };
        const o = json as { ok?: boolean; configured?: boolean; message?: string } | null;
        if (o?.ok === false) return { status: 'degraded', detail: o.message ?? 'Proxy error' };
        if (o?.configured === false) {
          return {
            status: 'degraded',
            detail: 'Proxy up — add Copernicus OAuth credentials on the API server for live Sentinel compares',
          };
        }
        return { status: 'ok', detail: o?.message ?? 'Reachable' };
      },
    },
    {
      id: 'carb',
      url: apiUrl(API_ROUTES.CARB_DATA_HEALTH),
      interpret: (res, json) => {
        if (res.status === 429) return { status: 'rate_limited', detail: `Rate limited HTTP ${res.status}` };
        if (!res.ok) return { status: 'offline', detail: `HTTP ${res.status}` };
        const o = json as { ok?: boolean } | null;
        if (o?.ok === false) return { status: 'degraded', detail: 'Module reachable but not healthy' };
        return { status: 'ok', detail: 'Reachable' };
      },
    },
    {
      id: 'signals',
      url: apiUrl(API_ROUTES.SIGNALS_STATS),
      interpret: (res, json) => {
        if (res.status === 429) return { status: 'rate_limited', detail: `Rate limited HTTP ${res.status}` };
        if (!res.ok) return { status: 'offline', detail: `HTTP ${res.status}` };
        const o = json as { ok?: boolean; mode?: string } | null;
        if (o?.ok === false) return { status: 'degraded', detail: 'Signals route error' };
        const stub = o?.mode === 'in_memory_stub';
        return {
          status: 'ok',
          detail: stub ? 'Reachable (demo seed — wire feeds for production)' : 'Reachable',
        };
      },
    },
    {
      id: 'ai',
      url: apiUrl(API_ROUTES.AI_STATUS),
      interpret: (res, json) => {
        if (res.status === 429) return { status: 'rate_limited', detail: `Rate limited HTTP ${res.status}` };
        if (!res.ok) return { status: 'offline', detail: `HTTP ${res.status}` };
        const o = json as { ok?: boolean; gemini?: boolean } | null;
        if (o?.ok === false) return { status: 'degraded', detail: 'AI status unavailable' };
        if (o?.gemini === false) return { status: 'degraded', detail: 'Reachable — GEMINI_API_KEY not set on server' };
        return { status: 'ok', detail: 'Gemini proxy ready' };
      },
    },
  ];

  const rows: HubConnectivityRow[] = [];
  const skippedCooldownIds: HubAdapterId[] = [];
  let refreshNotice: string | null = null;

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    if (signal?.aborted) break;
    if (i > 0) await delay(HUB_PROBE_STAGGER_MS);

    const pid = def.id;
    const pState = persisted[pid];
    const inCooldown = !bypassCooldown && pState && now < pState.nextRetryEpochMs;

    const ttl = HUB_PROBE_CACHE_TTL_MS[pid];
    const cached = cacheMap[pid];
    const cacheFresh = cached && cached.expiresAt > now;

    if (inCooldown) {
      skippedCooldownIds.push(pid);
      const rem = remainingRetrySec(pState!.nextRetryEpochMs, now);
      const useCache = cacheFresh && cached!.row.status !== 'rate_limited';
      const baseDetail = `Rate limited — waiting before retry. Retry after: ${rem}s`;
      const lastOk =
        pState!.lastSuccessEpochMs != null
          ? ` Last successful check: ${new Date(pState!.lastSuccessEpochMs).toLocaleString()}`
          : '';
      rows.push({
        id: pid,
        label: L[pid],
        status: 'rate_limited',
        detail: useCache
          ? `${baseDetail}. Using cached result (${cached!.row.detail.slice(0, 120)}${cached!.row.detail.length > 120 ? '…' : ''}).`
          : `${baseDetail}.${lastOk}`,
        lastCheckedAt: useCache ? new Date(cached!.row.savedAtEpochMs) : new Date(now),
        nextRetryAt: new Date(pState!.nextRetryEpochMs),
        retryAfterSeconds: rem,
        lastSuccessfulAt: pState!.lastSuccessEpochMs ? new Date(pState!.lastSuccessEpochMs) : null,
        lastError: pState!.lastError,
        usingCachedResult: Boolean(useCache),
      });
      continue;
    }

    if (cacheFresh && !bypassCache) {
      const c = cached!;
      rows.push({
        id: pid,
        label: L[pid],
        status: c.row.status,
        detail: `${c.row.detail} (cached; fresh ${Math.round((c.expiresAt - now) / 1000)}s)`,
        lastCheckedAt: new Date(c.row.savedAtEpochMs),
        nextRetryAt: null,
        retryAfterSeconds: null,
        lastSuccessfulAt:
          c.row.status === 'ok' || c.row.status === 'degraded' ? new Date(c.row.savedAtEpochMs) : null,
        lastError: c.row.lastError,
        usingCachedResult: true,
      });
      continue;
    }

    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 14_000);
      const res = await fetch(def.url, {
        signal: signal ?? ctrl.signal,
        headers: { Accept: 'application/json' },
      });
      window.clearTimeout(timer);
      const json = await readJsonUnknown(res);
      const interpreted = def.interpret(res, json);

      if (res.status === 429) {
        const ra = parseRetryAfterSeconds(res.headers, now);
        persisted[pid] = apply429ToPersisted(persisted[pid], ra);
        savePersisted(persisted);
        const cool = remainingRetrySec(persisted[pid].nextRetryEpochMs, now);
        rows.push({
          id: pid,
          label: L[pid],
          status: 'rate_limited',
          detail: `Rate limited HTTP 429 — Retry after: ${cool}s`,
          lastCheckedAt: new Date(now),
          nextRetryAt: new Date(persisted[pid].nextRetryEpochMs),
          retryAfterSeconds: cool,
          lastSuccessfulAt: persisted[pid].lastSuccessEpochMs
            ? new Date(persisted[pid].lastSuccessEpochMs!)
            : null,
          lastError: persisted[pid].lastError,
          usingCachedResult: false,
        });
        continue;
      }

      if (interpreted.status === 'rate_limited') {
        persisted[pid] = apply429ToPersisted(persisted[pid], null);
        savePersisted(persisted);
        rows.push({
          id: pid,
          label: L[pid],
          status: 'rate_limited',
          detail: interpreted.detail,
          lastCheckedAt: new Date(now),
          nextRetryAt: new Date(persisted[pid].nextRetryEpochMs),
          retryAfterSeconds: remainingRetrySec(persisted[pid].nextRetryEpochMs, now),
          lastSuccessfulAt: persisted[pid].lastSuccessEpochMs
            ? new Date(persisted[pid].lastSuccessEpochMs!)
            : null,
          lastError: persisted[pid].lastError,
          usingCachedResult: false,
        });
        continue;
      }

      const okLike = interpreted.status === 'ok' || interpreted.status === 'degraded';
      persisted[pid] = applySuccessToPersisted(persisted[pid], interpreted.detail, interpreted.status as 'ok' | 'degraded');
      savePersisted(persisted);

      cacheMap[pid] = {
        expiresAt: now + ttl,
        row: {
          id: pid,
          label: L[pid],
          status: interpreted.status,
          detail: interpreted.detail,
          nextRetryAt: null,
          retryAfterSeconds: null,
          lastSuccessfulAt: null,
          lastError: null,
          usingCachedResult: false,
          savedAtEpochMs: now,
        },
      };
      saveCache(cacheMap);

      rows.push({
        id: pid,
        label: L[pid],
        status: interpreted.status,
        detail: interpreted.detail,
        lastCheckedAt: new Date(now),
        nextRetryAt: null,
        retryAfterSeconds: null,
        lastSuccessfulAt: okLike ? new Date(now) : null,
        lastError: null,
        usingCachedResult: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unreachable or timed out';
      const prevP =
        persisted[pid] ?? {
          consecutive429: 0,
          nextRetryEpochMs: 0,
          lastSuccessEpochMs: null,
          lastSuccessDetail: null,
          lastSuccessStatus: 'ok' as const,
          lastError: null,
        };
      persisted[pid] = { ...prevP, lastError: msg };
      savePersisted(persisted);
      rows.push({
        id: pid,
        label: L[pid],
        status: 'offline',
        detail: msg,
        lastCheckedAt: new Date(now),
        nextRetryAt: persisted[pid].nextRetryEpochMs ? new Date(persisted[pid].nextRetryEpochMs) : null,
        retryAfterSeconds:
          persisted[pid].nextRetryEpochMs > now
            ? remainingRetrySec(persisted[pid].nextRetryEpochMs, now)
            : null,
        lastSuccessfulAt: persisted[pid].lastSuccessEpochMs
          ? new Date(persisted[pid].lastSuccessEpochMs!)
          : null,
        lastError: msg,
        usingCachedResult: false,
      });
    }
  }

  if (skippedCooldownIds.length > 0 && !bypassCooldown) {
    const nextTimes = skippedCooldownIds
      .map((id) => `${L[id]} @ ${new Date(persisted[id]!.nextRetryEpochMs).toLocaleTimeString()}`)
      .join('; ');
    refreshNotice = `Still cooling down for some adapters — skipped live probe. Next retry: ${nextTimes}`;
  }

  return { rows, meta: { skippedCooldownIds, refreshNotice } };
}

export function getHubConnectivityLoadingRows(): HubConnectivityRow[] {
  return buildLoadingRows();
}

/** True if API host or majority of adapters recently returned 429 (best-effort for scan UI). */
export function isHubConnectivityLikelyRateLimited(rows: HubConnectivityRow[]): boolean {
  const critical = rows.filter((r) => r.id !== 'health');
  const limited = critical.filter((r) => r.status === 'rate_limited').length;
  return limited >= Math.ceil(critical.length / 2) || rows.some((r) => r.id === 'health' && r.status === 'rate_limited');
}

/** Super Agent evidence pillars → Environmental Hub probe ids (shared cooldown/cache). */
export type SuperAgentEvidencePillarKey = 'water' | 'earthObservation' | 'pollution' | 'carbonViu';

export const SUPER_AGENT_PILLAR_HUB_ADAPTERS: Record<SuperAgentEvidencePillarKey, readonly HubAdapterId[]> = {
  /** API host + Copernicus proxy cover AquaScan / server-backed water compares. */
  water: ['health', 'copernicus'],
  earthObservation: ['copernicus'],
  pollution: ['carb'],
  /** Carbon / VIU intelligence uses server AI + global signals feed when live. */
  carbonViu: ['ai', 'signals'],
};

export type PillarRateLimitStatus =
  | 'none'
  | 'rate_limited'
  | 'cooldown'
  | 'cached'
  | 'ok'
  | 'degraded'
  | 'offline'
  | 'loading'
  | 'unknown';

export interface PillarHubAdapterDetail {
  id: HubAdapterId;
  status: HubAdapterDisplayStatus;
  usingCachedResult: boolean;
  nextRetryAt: string | null;
}

/** Fields embedded in Super Agent `analysisSummaries` per pillar for Reviewer Node + UI. */
export interface PillarHubConnectivityReviewFields {
  adapterStatus: string;
  rateLimitStatus: PillarRateLimitStatus;
  nextRetryAt: string | null;
  cachedStatus: boolean;
  hubAdapterDetails: PillarHubAdapterDetail[];
}

export function summarizePillarHubConnectivity(
  pillar: SuperAgentEvidencePillarKey,
  rows: HubConnectivityRow[],
): PillarHubConnectivityReviewFields {
  const ids = SUPER_AGENT_PILLAR_HUB_ADAPTERS[pillar];
  const picked = ids
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is HubConnectivityRow => Boolean(r));

  const hubAdapterDetails: PillarHubAdapterDetail[] = picked.map((r) => ({
    id: r.id,
    status: r.status,
    usingCachedResult: r.usingCachedResult,
    nextRetryAt: r.nextRetryAt ? r.nextRetryAt.toISOString() : null,
  }));

  if (picked.length === 0) {
    return {
      adapterStatus:
        'Environmental Hub connectivity not loaded yet — open Environmental Intelligence Hub or wait for Field OS refresh. Dry Run preview remains available.',
      rateLimitStatus: 'unknown',
      nextRetryAt: null,
      cachedStatus: false,
      hubAdapterDetails: [],
    };
  }

  const isCooldownRow = (r: HubConnectivityRow) =>
    r.status === 'rate_limited' && /waiting before retry/i.test(r.detail);
  const isFresh429Row = (r: HubConnectivityRow) =>
    r.status === 'rate_limited' && !isCooldownRow(r);

  const anyRateLimited = picked.some((r) => r.status === 'rate_limited');
  const anyCooldownOnly = picked.some(isCooldownRow);
  const anyFresh429 = picked.some(isFresh429Row);
  const anyCached = picked.some((r) => r.usingCachedResult);
  const allOk = picked.every((r) => r.status === 'ok');
  const anyOk = picked.some((r) => r.status === 'ok');
  const anyOffline = picked.some((r) => r.status === 'offline');
  const anyDegraded = picked.some((r) => r.status === 'degraded');
  const anyLoading = picked.some((r) => r.status === 'loading');

  const retryTimes = picked
    .map((r) => r.nextRetryAt?.getTime() ?? 0)
    .filter((t) => t > Date.now());
  const soonestRetryMs = retryTimes.length ? Math.min(...retryTimes) : 0;
  const nextRetryAt = soonestRetryMs ? new Date(soonestRetryMs).toISOString() : null;
  const retrySuffix = nextRetryAt ? ` Next retry at ${new Date(nextRetryAt).toLocaleString()}.` : '';

  let rateLimitStatus: PillarRateLimitStatus = 'none';
  if (anyFresh429) rateLimitStatus = 'rate_limited';
  else if (anyCooldownOnly) rateLimitStatus = 'cooldown';
  else if (anyCached) rateLimitStatus = 'cached';
  else if (anyLoading) rateLimitStatus = 'loading';
  else if (allOk) rateLimitStatus = 'ok';
  else if (anyOffline) rateLimitStatus = 'offline';
  else if (anyDegraded) rateLimitStatus = 'degraded';
  else rateLimitStatus = 'unknown';

  let adapterStatus: string;
  if (anyFresh429) {
    adapterStatus = `Rate limited — Dry Run preview available.${retrySuffix}`;
  } else if (anyCooldownOnly && anyOk) {
    const okLabels = picked
      .filter((r) => r.status === 'ok')
      .map((r) => r.label)
      .join(', ');
    adapterStatus = `Partial live: ${okLabels} reachable; other hub adapter(s) in cooldown — Dry Run preview available.${retrySuffix} Defer hub-backed live scans until cooldown ends.`;
  } else if (anyCooldownOnly) {
    adapterStatus = `Adapter in cooldown — Dry Run preview available.${retrySuffix}`;
  } else if (anyCached) {
    adapterStatus = 'Using cached connectivity status — hub strip TTL; Dry Run preview remains available.';
  } else if (allOk) {
    adapterStatus = 'Live adapter reachable.';
  } else if (anyOffline) {
    adapterStatus = 'Pending live service adapter — route unreachable or probe failed; Dry Run preview available.';
  } else if (anyDegraded) {
    adapterStatus = 'Adapters reachable with configuration caveats — see hub probe detail; Dry Run preview still available.';
  } else if (anyLoading) {
    adapterStatus = 'Hub connectivity still loading for this pillar.';
  } else {
    adapterStatus = 'Connectivity mixed — see Environmental Intelligence Hub API strip.';
  }

  return {
    adapterStatus,
    rateLimitStatus,
    nextRetryAt,
    cachedStatus: anyCached,
    hubAdapterDetails,
  };
}
