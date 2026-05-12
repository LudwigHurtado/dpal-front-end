/**
 * DPAL Forest Integrity — Global Forest Watch (GFW) Data API adapter.
 *
 * Calls live data-api.globalforestwatch.org endpoints from the backend ONLY.
 * The GFW API key is never sent to the frontend.
 *
 * Honest behavior contract:
 *  - No fabricated alert counts.
 *  - Missing key returns `not_configured`, never throws / crashes the scan.
 *  - Auth failures (401/403) return `auth_error`.
 *  - HTTP 429 returns `rate_limited`.
 *  - Metadata / version resolution failure returns `unavailable`.
 *  - Query failure (4xx other than auth/rate, or invalid response shape) returns
 *    `unavailable` (likely schema drift) with a clear explanation.
 *  - Unexpected exceptions / 5xx / network errors return `failed`.
 */

export type GfwProviderStatusState = 'configured' | 'not_configured';

export type GfwProviderStatus = {
  status: GfwProviderStatusState;
  baseUrl: string;
  message: string;
};

export type GfwAlertsLaneState =
  | 'available'
  | 'not_configured'
  | 'auth_error'
  | 'rate_limited'
  | 'unavailable'
  | 'failed';

export type GfwForestAlertsResult = {
  status: GfwAlertsLaneState;
  message: string;
  alerts: number | null;
  integratedAlerts: number | null;
  disturbanceAlerts: number | null;
  datasetVersionsUsed: string[];
  queriedAt: string;
  limitations: string[];
};

type LaneAttempt = {
  datasetId: string;
  laneLabel: string;
  state: 'available' | 'auth_error' | 'rate_limited' | 'unavailable' | 'failed';
  count: number | null;
  version: string | null;
  note: string;
};

const GFW_DEFAULT_BASE = 'https://data-api.globalforestwatch.org';

const GFW_INTEGRATED_DATASET = 'gfw_integrated_alerts';
const GFW_DISTURBANCE_DATASET = 'wur_radd_alerts';
const GFW_FIRE_DATASET = 'nasa_viirs_fire_alerts';

const KNOWN_DATE_COLUMN_HINTS: Record<string, string[]> = {
  [GFW_INTEGRATED_DATASET]: [
    'gfw_integrated_alerts__date',
    'alert__date',
  ],
  [GFW_DISTURBANCE_DATASET]: [
    'wur_radd_alerts__date',
    'alert__date',
  ],
  [GFW_FIRE_DATASET]: [
    'alert__date',
    'nasa_viirs_fire_alerts__date',
  ],
};

function getGfwBaseUrl(): string {
  const raw = process.env.GFW_DATA_API_BASE?.trim();
  if (!raw) return GFW_DEFAULT_BASE;
  return raw.replace(/\/+$/, '');
}

/**
 * Optional Origin / Referer header value matching one of the domains the
 * GFW API key was registered with (see GFW Data API auth — keys have a
 * `domains` allowlist; calls without a matching Origin/Referer can be
 * rejected with 401/403 even when the key itself is valid).
 *
 * Configure with GFW_API_ORIGIN (e.g. https://web-production-a27b.up.railway.app).
 * Backend-only; never sent to or read by the browser.
 */
function getGfwOriginHeader(): string | null {
  const raw = process.env.GFW_API_ORIGIN?.trim();
  if (!raw) return null;
  return raw;
}

function buildGfwHeaders(extra?: Record<string, string>): Record<string, string> {
  const apiKey = getGfwApiKey();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(extra ?? {}),
  };
  if (apiKey) headers['x-api-key'] = apiKey;
  const origin = getGfwOriginHeader();
  if (origin) {
    headers['Origin'] = origin;
    headers['Referer'] = origin;
  }
  return headers;
}

/**
 * Return the GFW API key from either env name (backend-only).
 * Never logged, never returned to the frontend.
 */
export function getGfwApiKey(): string | null {
  const a = process.env.GFW_API_KEY?.trim();
  if (a) return a;
  const b = process.env.GLOBAL_FOREST_WATCH_API_KEY?.trim();
  if (b) return b;
  return null;
}

/**
 * Provider configuration snapshot for `/provider-status` lanes.
 * Does NOT expose the API key.
 */
export function getGlobalForestWatchProviderStatus(): GfwProviderStatus {
  const baseUrl = getGfwBaseUrl();
  const key = getGfwApiKey();
  if (!key) {
    return {
      status: 'not_configured',
      baseUrl,
      message:
        'Global Forest Watch credentials not configured (set GFW_API_KEY or GLOBAL_FOREST_WATCH_API_KEY on the API host).',
    };
  }
  return {
    status: 'configured',
    baseUrl,
    message: 'Global Forest Watch credentials present. Adapter will call the GFW Data API per scan.',
  };
}

type FetchOutcome<T> =
  | { ok: true; status: number; body: T }
  | { ok: false; status: number; body: unknown; lane: GfwAlertsLaneState; note: string };

async function gfwFetch<T>(
  url: string,
  init: RequestInit,
  laneOnNon2xx: GfwAlertsLaneState = 'unavailable',
): Promise<FetchOutcome<T>> {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        status: res.status,
        body: parsed,
        lane: 'auth_error',
        note: `GFW rejected the API key (HTTP ${res.status}).`,
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        body: parsed,
        lane: 'rate_limited',
        note: 'GFW rate limit reached (HTTP 429). Retry later or reduce query frequency.',
      };
    }
    if (res.status >= 500) {
      return {
        ok: false,
        status: res.status,
        body: parsed,
        lane: 'failed',
        note: `GFW upstream error (HTTP ${res.status}).`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        body: parsed,
        lane: laneOnNon2xx,
        note: `GFW response not ok (HTTP ${res.status}).`,
      };
    }
    return { ok: true, status: res.status, body: parsed as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'GFW network error';
    return {
      ok: false,
      status: 0,
      body: null,
      lane: 'failed',
      note: `GFW request failed before response: ${msg}`,
    };
  }
}

/**
 * GFW `GET /dataset/{datasetId}` response. The `versions` field can be
 * either an array of version strings (e.g. ["v20231016", "latest"]) or an
 * array of version objects with `version` + `is_latest`. The resolver
 * below handles both shapes defensively.
 */
type DatasetVersionEntry =
  | string
  | {
      version?: string;
      is_latest?: boolean;
    };

type DatasetMetadataResponse = {
  data?: {
    dataset?: string;
    versions?: DatasetVersionEntry[];
    is_downloadable?: boolean;
  };
  status?: string;
};

/**
 * Fetch raw dataset metadata from
 *   GET {GFW_DATA_API_BASE}/dataset/{datasetId}
 * Returns the parsed JSON body on 2xx, or a structured failure with the
 * lane state to surface in the scan limitations array.
 */
export async function fetchGfwDatasetMetadata(
  datasetId: string,
): Promise<FetchOutcome<DatasetMetadataResponse>> {
  if (!getGfwApiKey()) {
    return {
      ok: false,
      status: 0,
      body: null,
      lane: 'not_configured',
      note: 'GFW API key not configured on backend.',
    };
  }
  const url = `${getGfwBaseUrl()}/dataset/${encodeURIComponent(datasetId)}`;
  return gfwFetch<DatasetMetadataResponse>(
    url,
    {
      method: 'GET',
      headers: buildGfwHeaders(),
    },
    'unavailable',
  );
}

/**
 * Resolve the latest published version for a dataset by reading metadata
 * `data.versions`. If versions cannot be safely determined the function
 * returns null so the caller can mark the lane `unavailable`.
 */
export async function resolveLatestGfwDatasetVersion(
  datasetId: string,
): Promise<{ version: string | null; lane: GfwAlertsLaneState; note: string }> {
  const meta = await fetchGfwDatasetMetadata(datasetId);
  if (!meta.ok) {
    return { version: null, lane: meta.lane, note: meta.note };
  }
  const versions = meta.body?.data?.versions;
  if (!Array.isArray(versions) || versions.length === 0) {
    return {
      version: null,
      lane: 'unavailable',
      note: `GFW metadata for "${datasetId}" did not list any versions.`,
    };
  }
  // GFW returns `versions` as either string entries (e.g. ["v20240115", "latest"])
  // or version objects with { version, is_latest } — handle both.
  const objectMarkedLatest = versions
    .map((v) => (typeof v === 'object' && v ? v : null))
    .find((v): v is { version?: string; is_latest?: boolean } => Boolean(v && v.is_latest && typeof v.version === 'string' && v.version.length > 0));
  if (objectMarkedLatest && objectMarkedLatest.version) {
    return {
      version: objectMarkedLatest.version,
      lane: 'available',
      note: `Resolved GFW dataset version (is_latest=true): ${datasetId}@${objectMarkedLatest.version}`,
    };
  }
  const candidateStrings: string[] = [];
  for (const entry of versions) {
    if (typeof entry === 'string' && entry.length > 0) {
      candidateStrings.push(entry);
    } else if (entry && typeof entry === 'object' && typeof entry.version === 'string' && entry.version.length > 0) {
      candidateStrings.push(entry.version);
    }
  }
  if (candidateStrings.length === 0) {
    return {
      version: null,
      lane: 'unavailable',
      note: `GFW metadata for "${datasetId}" returned no usable version strings.`,
    };
  }
  // Versions follow `^v\d{1,8}(\.\d{1,3}){0,2}?$|^latest$` per the GFW spec.
  // A lexicographic sort over normalized v-prefixed date stamps is stable; we
  // prefer deterministic tags over the floating "latest" alias.
  const sortable = candidateStrings.filter((v) => v !== 'latest');
  const ordered = (sortable.length > 0 ? sortable : candidateStrings).slice().sort();
  const version = ordered[ordered.length - 1];
  if (!version) {
    return {
      version: null,
      lane: 'unavailable',
      note: `GFW metadata for "${datasetId}" produced no resolvable latest version.`,
    };
  }
  return { version, lane: 'available', note: `Resolved GFW dataset version: ${datasetId}@${version}` };
}

type GfwFieldsResponse = {
  data?: Array<{ field_name?: string; name?: string }>;
};

/**
 * Look up the date column for a dataset/version pair by querying
 *   GET {GFW_DATA_API_BASE}/dataset/{datasetId}/{version}/fields
 * Falls back to known column hints when fields cannot be enumerated.
 * Returns null when neither route nor hints yield a usable date column.
 */
async function resolveDateColumn(
  datasetId: string,
  version: string,
): Promise<string | null> {
  if (!getGfwApiKey()) return null;
  const url = `${getGfwBaseUrl()}/dataset/${encodeURIComponent(datasetId)}/${encodeURIComponent(
    version,
  )}/fields`;
  const result = await gfwFetch<GfwFieldsResponse>(url, {
    method: 'GET',
    headers: buildGfwHeaders(),
  });
  const hints = KNOWN_DATE_COLUMN_HINTS[datasetId] ?? [];
  if (result.ok && Array.isArray(result.body?.data)) {
    const fieldNames = result.body!.data!
      .map((f) => (typeof f?.field_name === 'string' ? f.field_name : typeof f?.name === 'string' ? f.name : ''))
      .filter(Boolean);
    for (const hint of hints) {
      if (fieldNames.includes(hint)) return hint;
    }
    const dateLike = fieldNames.find((n) => /__date$|^alert__date$|^date$/.test(n));
    if (dateLike) return dateLike;
  }
  return hints[0] ?? null;
}

type GfwQueryJsonResponse = {
  data?: Array<Record<string, unknown>>;
  status?: string;
};

/**
 * POST a JSON query to:
 *   {GFW_DATA_API_BASE}/dataset/{datasetId}/{version}/query/json
 *
 * Headers:
 *   x-api-key: <backend api key>
 *   Content-Type: application/json
 *
 * Body:
 *   { sql, geometry }
 */
export async function queryGfwDatasetJson(args: {
  datasetId: string;
  version: string;
  sql: string;
  geometry: unknown;
}): Promise<FetchOutcome<GfwQueryJsonResponse>> {
  if (!getGfwApiKey()) {
    return {
      ok: false,
      status: 0,
      body: null,
      lane: 'not_configured',
      note: 'GFW API key not configured on backend.',
    };
  }
  const url = `${getGfwBaseUrl()}/dataset/${encodeURIComponent(args.datasetId)}/${encodeURIComponent(
    args.version,
  )}/query/json`;
  return gfwFetch<GfwQueryJsonResponse>(
    url,
    {
      method: 'POST',
      headers: buildGfwHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ sql: args.sql, geometry: args.geometry }),
    },
    'unavailable',
  );
}

function isoDateOnly(input: string): string {
  const d = new Date(input);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function extractCount(body: GfwQueryJsonResponse | unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const data = (body as GfwQueryJsonResponse).data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0];
  if (!row || typeof row !== 'object') return null;
  for (const v of Object.values(row)) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function aoiToGeometry(args: {
  lat: number;
  lng: number;
  radiusKm: number;
  polygon?: unknown;
}): unknown {
  if (args.polygon && typeof args.polygon === 'object') {
    const p = args.polygon as { type?: string; geometry?: unknown; coordinates?: unknown };
    if (p.type === 'Feature' && p.geometry && typeof p.geometry === 'object') {
      return p.geometry;
    }
    if (typeof p.type === 'string' && p.coordinates != null) {
      return args.polygon;
    }
  }
  const radius = Math.max(0.1, Math.min(args.radiusKm, 250));
  const dLat = radius / 111;
  const cosLat = Math.cos((args.lat * Math.PI) / 180);
  const dLng = radius / (111 * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat));
  const minLng = args.lng - dLng;
  const maxLng = args.lng + dLng;
  const minLat = args.lat - dLat;
  const maxLat = args.lat + dLat;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}

async function attemptLane(args: {
  datasetId: string;
  laneLabel: string;
  geometry: unknown;
  startDateOnly: string;
  endDateOnly: string;
}): Promise<LaneAttempt> {
  const versionRes = await resolveLatestGfwDatasetVersion(args.datasetId);
  if (!versionRes.version) {
    return {
      datasetId: args.datasetId,
      laneLabel: args.laneLabel,
      state: versionRes.lane === 'not_configured' ? 'unavailable' : versionRes.lane,
      count: null,
      version: null,
      note: versionRes.note,
    };
  }
  const dateColumn = await resolveDateColumn(args.datasetId, versionRes.version);
  if (!dateColumn) {
    return {
      datasetId: args.datasetId,
      laneLabel: args.laneLabel,
      state: 'unavailable',
      count: null,
      version: versionRes.version,
      note: `GFW date-column schema could not be confirmed for ${args.datasetId}@${versionRes.version}.`,
    };
  }
  const sql = `SELECT COUNT(*) FROM data WHERE ${dateColumn} >= '${args.startDateOnly}' AND ${dateColumn} <= '${args.endDateOnly}'`;
  const queryRes = await queryGfwDatasetJson({
    datasetId: args.datasetId,
    version: versionRes.version,
    sql,
    geometry: args.geometry,
  });
  if (!queryRes.ok) {
    return {
      datasetId: args.datasetId,
      laneLabel: args.laneLabel,
      state: queryRes.lane === 'not_configured' ? 'unavailable' : queryRes.lane,
      count: null,
      version: versionRes.version,
      note: queryRes.note,
    };
  }
  const count = extractCount(queryRes.body);
  if (count == null) {
    return {
      datasetId: args.datasetId,
      laneLabel: args.laneLabel,
      state: 'unavailable',
      count: null,
      version: versionRes.version,
      note: `GFW query for ${args.datasetId}@${versionRes.version} returned no recognizable count row.`,
    };
  }
  return {
    datasetId: args.datasetId,
    laneLabel: args.laneLabel,
    state: 'available',
    count,
    version: versionRes.version,
    note: `${args.laneLabel}: ${count} alert(s) in ${args.startDateOnly} → ${args.endDateOnly} (column ${dateColumn}).`,
  };
}

function pickWorstLane(states: GfwAlertsLaneState[]): GfwAlertsLaneState {
  if (states.includes('auth_error')) return 'auth_error';
  if (states.includes('rate_limited')) return 'rate_limited';
  if (states.includes('failed')) return 'failed';
  return 'unavailable';
}

/**
 * Main entry point — queries GFW deforestation / disturbance / active-fire
 * lanes for the AOI and date window. Honest about every failure mode.
 */
export async function getGfwForestAlertsForAoi(args: {
  lat: number;
  lng: number;
  radiusKm: number;
  polygon?: unknown;
  startDate: string;
  endDate: string;
}): Promise<GfwForestAlertsResult> {
  const queriedAt = new Date().toISOString();
  const apiKey = getGfwApiKey();
  if (!apiKey) {
    return {
      status: 'not_configured',
      message: 'GFW API key not configured on backend (set GFW_API_KEY or GLOBAL_FOREST_WATCH_API_KEY).',
      alerts: null,
      integratedAlerts: null,
      disturbanceAlerts: null,
      datasetVersionsUsed: [],
      queriedAt,
      limitations: [
        'GFW lane skipped: API key missing on the backend; alert counts are not inferred from placeholders.',
      ],
    };
  }

  const startDateOnly = isoDateOnly(args.startDate);
  const endDateOnly = isoDateOnly(args.endDate);
  if (!startDateOnly || !endDateOnly) {
    return {
      status: 'unavailable',
      message: 'GFW lane skipped: baseline/current date window could not be normalized to ISO date.',
      alerts: null,
      integratedAlerts: null,
      disturbanceAlerts: null,
      datasetVersionsUsed: [],
      queriedAt,
      limitations: ['GFW request not attempted because date window was invalid.'],
    };
  }

  const geometry = aoiToGeometry({
    lat: args.lat,
    lng: args.lng,
    radiusKm: args.radiusKm,
    polygon: args.polygon,
  });

  const [integrated, disturbance, fire] = await Promise.all([
    attemptLane({
      datasetId: GFW_INTEGRATED_DATASET,
      laneLabel: 'Integrated deforestation alerts',
      geometry,
      startDateOnly,
      endDateOnly,
    }),
    attemptLane({
      datasetId: GFW_DISTURBANCE_DATASET,
      laneLabel: 'RADD disturbance alerts',
      geometry,
      startDateOnly,
      endDateOnly,
    }),
    attemptLane({
      datasetId: GFW_FIRE_DATASET,
      laneLabel: 'VIIRS active fire alerts (GFW mirror)',
      geometry,
      startDateOnly,
      endDateOnly,
    }),
  ]);

  const integratedCount = integrated.state === 'available' ? integrated.count : null;
  const disturbanceCount = disturbance.state === 'available' ? disturbance.count : null;
  const fireCount = fire.state === 'available' ? fire.count : null;

  const datasetVersionsUsed: string[] = [];
  if (integrated.version && integrated.state === 'available') {
    datasetVersionsUsed.push(`${integrated.datasetId}@${integrated.version}`);
  }
  if (disturbance.version && disturbance.state === 'available') {
    datasetVersionsUsed.push(`${disturbance.datasetId}@${disturbance.version}`);
  }
  if (fire.version && fire.state === 'available') {
    datasetVersionsUsed.push(`${fire.datasetId}@${fire.version}`);
  }

  const limitations: string[] = [];
  for (const lane of [integrated, disturbance, fire]) {
    if (lane.state !== 'available') {
      limitations.push(`${lane.laneLabel} (${lane.datasetId}) — ${lane.state}: ${lane.note}`);
    } else {
      limitations.push(lane.note);
    }
  }

  const anyAvailable =
    integrated.state === 'available' ||
    disturbance.state === 'available' ||
    fire.state === 'available';

  if (anyAvailable) {
    const alerts =
      integratedCount != null
        ? integratedCount
        : disturbanceCount != null
        ? disturbanceCount
        : fireCount;
    const messageParts: string[] = [];
    if (integratedCount != null) messageParts.push(`integrated=${integratedCount}`);
    if (disturbanceCount != null) messageParts.push(`disturbance=${disturbanceCount}`);
    if (fireCount != null) messageParts.push(`fire=${fireCount}`);
    return {
      status: 'available',
      message: `Global Forest Watch alerts checked (${startDateOnly} → ${endDateOnly}): ${messageParts.join(', ') || 'no lanes returned counts'}.`,
      alerts: alerts ?? null,
      integratedAlerts: integratedCount,
      disturbanceAlerts: disturbanceCount,
      datasetVersionsUsed,
      queriedAt,
      limitations,
    };
  }

  const worst = pickWorstLane([
    integrated.state as GfwAlertsLaneState,
    disturbance.state as GfwAlertsLaneState,
    fire.state as GfwAlertsLaneState,
  ]);

  const headlineMessage =
    worst === 'auth_error'
      ? 'GFW rejected the API key for every attempted dataset.'
      : worst === 'rate_limited'
      ? 'GFW rate limit reached while querying alert datasets.'
      : worst === 'failed'
      ? 'GFW request failed for every attempted dataset (network or upstream error).'
      : 'GFW metadata/query unavailable for every attempted dataset.';

  return {
    status: worst,
    message: headlineMessage,
    alerts: null,
    integratedAlerts: null,
    disturbanceAlerts: null,
    datasetVersionsUsed,
    queriedAt,
    limitations,
  };
}
