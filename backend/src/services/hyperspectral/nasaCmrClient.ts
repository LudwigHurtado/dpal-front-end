import axios from 'axios';

export type DpalHyperspectralScene = {
  provider: 'PACE' | 'EMIT';
  collection: string;
  conceptId: string;
  title: string;
  startTime: string;
  endTime: string;
  cloudCover: number | null;
  spatial: Record<string, unknown>;
  links: Array<{ href: string; rel?: string }>;
  source: 'NASA CMR';
};

/** Reduced CMR scene payload for large scan responses (no link arrays). */
export type DpalHyperspectralCompactScene = {
  provider: 'PACE' | 'EMIT';
  collection: string;
  conceptId: string;
  title: string;
  startTime: string;
  endTime: string;
  cloudCover: number | null;
  source: 'NASA CMR';
  browseUrl?: string | null;
  dataUrl?: string | null;
};

export function sceneToCompact(s: DpalHyperspectralScene): DpalHyperspectralCompactScene {
  let browseUrl: string | null = null;
  let dataUrl: string | null = null;
  for (const l of s.links) {
    const href = typeof l.href === 'string' ? l.href : '';
    if (!href) continue;
    const rel = (l.rel ?? '').toLowerCase();
    if (!dataUrl && (rel.includes('data#') || rel.includes('/data#') || rel.endsWith('/data'))) {
      dataUrl = href;
    } else if (!browseUrl && (rel.includes('browse') || rel.includes('metadata#'))) {
      browseUrl = href;
    }
  }
  const httpsLinks = s.links
    .map((x) => x.href)
    .filter((h): h is string => typeof h === 'string' && /^https?:\/\//i.test(h));
  if (!dataUrl) dataUrl = httpsLinks[0] ?? null;
  if (!browseUrl) browseUrl = httpsLinks.find((h) => h !== dataUrl) ?? null;

  return {
    provider: s.provider,
    collection: s.collection,
    conceptId: s.conceptId,
    title: s.title,
    startTime: s.startTime,
    endTime: s.endTime,
    cloudCover: s.cloudCover,
    source: s.source,
    browseUrl,
    dataUrl,
  };
}

export function getCmrBaseUrl(): string {
  const raw = process.env.NASA_CMR_BASE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  return 'https://cmr.earthdata.nasa.gov/search';
}

/** Approximate bounding box in CRS84 order: west,south,east,north */
export function boundingBoxFromPoint(lat: number, lng: number, radiusKm: number): string {
  const latDelta = radiusKm / 111.32;
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const lngDelta = radiusKm / (111.32 * cosLat);
  const west = clampLng(lng - lngDelta);
  const east = clampLng(lng + lngDelta);
  const south = clampLat(lat - latDelta);
  const north = clampLat(lat + latDelta);
  return `${west},${south},${east},${north}`;
}

function clampLat(v: number): number {
  return Math.min(90, Math.max(-90, v));
}

function clampLng(v: number): number {
  let x = v;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

export function cmrTemporalRange(start: Date, end: Date): string {
  return `${start.toISOString()},${end.toISOString()}`;
}

function pickLinks(entry: Record<string, unknown>): Array<{ href: string; rel?: string }> {
  const raw = entry.links;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l) => {
      if (!l || typeof l !== 'object') return null;
      const href = (l as { href?: string }).href;
      if (!href) return null;
      const rel = (l as { rel?: string; hreflang?: string }).rel;
      return { href, rel };
    })
    .filter(Boolean) as Array<{ href: string; rel?: string }>;
}

function cloudFromEntry(entry: Record<string, unknown>): number | null {
  const umm = entry.umm as Record<string, unknown> | undefined;
  const qa = umm?.['RelatedUrls'] ?? umm?.['CloudCover'];
  if (typeof entry.cloud_cover === 'number') return entry.cloud_cover;
  if (typeof entry.cloud_cover === 'string') {
    const n = Number.parseFloat(entry.cloud_cover);
    return Number.isFinite(n) ? n : null;
  }
  if (qa && typeof qa === 'object' && 'Value' in (qa as object)) {
    const v = Number.parseFloat(String((qa as { Value?: unknown }).Value));
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

export function normalizeCmrGranule(
  entry: Record<string, unknown>,
  provider: 'PACE' | 'EMIT',
): DpalHyperspectralScene {
  const collection = String(entry.collection_concept_id ?? entry.short_name ?? '');
  const conceptId = String(entry.collection_concept_id ?? '');
  const title = String(entry.title ?? entry.id ?? 'Granule');
  const startTime = String(entry.time_start ?? entry.beginning_date_time ?? '');
  const endTime = String(entry.time_end ?? entry.ending_date_time ?? '');
  const spatial: Record<string, unknown> = {};
  if (Array.isArray(entry.boxes)) spatial.boxes = entry.boxes;
  if (Array.isArray(entry.polygons)) spatial.polygons = entry.polygons;
  if (entry.points) spatial.points = entry.points;

  return {
    provider,
    collection,
    conceptId,
    title,
    startTime,
    endTime,
    cloudCover: cloudFromEntry(entry),
    spatial,
    links: pickLinks(entry),
    source: 'NASA CMR',
  };
}

export type CmrGranuleSearchResult = {
  scenes: DpalHyperspectralScene[];
  httpStatus?: number;
  errorCode?: 'auth_error' | 'failed' | 'rate_limited';
  safeMessage?: string;
};

/**
 * Server-side CMR granule search. Token is optional for many collections but
 * improves access; never logged or returned.
 */
export async function searchCmrGranulesByShortName(args: {
  shortName: string;
  provider: 'PACE' | 'EMIT';
  boundingBox: string;
  temporal: string;
  pageSize?: number;
  token?: string;
}): Promise<CmrGranuleSearchResult> {
  const base = getCmrBaseUrl();
  const url = `${base}/granules.json`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const t = args.token?.trim();
  if (t) headers.Authorization = `Bearer ${t}`;

  try {
    const res = await axios.get(url, {
      params: {
        short_name: args.shortName,
        bounding_box: args.boundingBox,
        temporal: args.temporal,
        sort_key: '-start_date',
        page_size: args.pageSize ?? 20,
      },
      headers,
      timeout: 25_000,
      validateStatus: () => true,
    });

    if (res.status === 401 || res.status === 403) {
      return {
        scenes: [],
        httpStatus: res.status,
        errorCode: 'auth_error',
        safeMessage: 'NASA CMR rejected credentials (check NASA_EARTHDATA_TOKEN).',
      };
    }
    if (res.status === 429) {
      return {
        scenes: [],
        httpStatus: res.status,
        errorCode: 'rate_limited',
        safeMessage: 'NASA CMR rate limited this host. Retry later.',
      };
    }
    if (res.status < 200 || res.status >= 300) {
      return {
        scenes: [],
        httpStatus: res.status,
        errorCode: 'failed',
        safeMessage: `NASA CMR returned HTTP ${res.status}.`,
      };
    }

    const feed = (res.data as { feed?: { entry?: Record<string, unknown>[] } })?.feed;
    const entries = Array.isArray(feed?.entry) ? feed.entry : [];
    const scenes = entries.map((e) => normalizeCmrGranule(e, args.provider));
    return { scenes, httpStatus: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'cmr_request_failed';
    return {
      scenes: [],
      errorCode: 'failed',
      safeMessage: msg.includes('timeout') ? 'NASA CMR request timed out.' : 'NASA CMR request failed.',
    };
  }
}
