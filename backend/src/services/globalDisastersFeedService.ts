/**
 * Live global hazard feeds — USGS earthquakes (M4.5+, 7d) + NASA EONET open events (7d).
 * Optional OpenAQ high-readings when OPENAQ_API_KEY is set.
 */

const USGS_FEED_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';
const EONET_EVENTS_URL =
  'https://eonet.gsfc.nasa.gov/api/v3/events?days=7&status=open';

export type DisasterEventType =
  | 'earthquake'
  | 'wildfire'
  | 'volcano'
  | 'storm'
  | 'flood'
  | 'sea_and_lake_ice'
  | 'other';

export type DisasterSeverity = 'low' | 'moderate' | 'high' | 'critical';

export interface DisasterEvent {
  id: string;
  source: 'usgs' | 'eonet' | 'openaq';
  type: DisasterEventType;
  title: string;
  place: string;
  severity: DisasterSeverity;
  mag?: number;
  depth?: number;
  alertLevel?: string;
  lat?: number;
  lng?: number;
  time: number;
  url?: string;
  category?: string;
}

const FEED_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent': 'DPAL-GlobalSignals/1.0 (dpal-front-end backend)',
};

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 14_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { ...FEED_HEADERS, ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}${body ? ` — ${body.slice(0, 120)}` : ''}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function magToSeverity(mag: number): DisasterSeverity {
  if (mag >= 6.5) return 'critical';
  if (mag >= 5.5) return 'high';
  if (mag >= 4.5) return 'moderate';
  return 'low';
}

function eonetCategoryToType(categoryId: string): DisasterEventType {
  const id = categoryId.toLowerCase();
  if (id.includes('wildfire') || id.includes('fire')) return 'wildfire';
  if (id.includes('volcano')) return 'volcano';
  if (id.includes('storm') || id.includes('cyclone') || id.includes('hurricane')) return 'storm';
  if (id.includes('flood') || id.includes('water')) return 'flood';
  if (id.includes('ice') || id.includes('sea')) return 'sea_and_lake_ice';
  return 'other';
}

function eonetTypeToSeverity(type: DisasterEventType): DisasterSeverity {
  if (type === 'volcano' || type === 'wildfire') return 'high';
  if (type === 'storm' || type === 'flood') return 'moderate';
  return 'moderate';
}

type UsgsFeature = {
  id?: string;
  properties?: {
    mag?: number;
    place?: string;
    time?: number;
    url?: string;
    alert?: string;
    tsunami?: number;
  };
  geometry?: { coordinates?: [number, number, number?] };
};

export async function fetchUsgsEarthquakes(): Promise<DisasterEvent[]> {
  const data = await fetchJson<{ features?: UsgsFeature[] }>(USGS_FEED_URL);
  const features = Array.isArray(data.features) ? data.features : [];
  const out: DisasterEvent[] = [];

  for (const f of features) {
    const mag = Number(f.properties?.mag);
    if (!Number.isFinite(mag)) continue;
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lng, lat, depth] = coords;
    const time = Number(f.properties?.time);
    if (!Number.isFinite(time)) continue;

    const id = String(f.id ?? `usgs-${time}-${lat}-${lng}`);
    let severity = magToSeverity(mag);
    const alert = String(f.properties?.alert ?? '').toLowerCase();
    if (alert === 'red') severity = 'critical';
    else if (alert === 'orange' && severity !== 'critical') severity = 'high';
    if (f.properties?.tsunami === 1 && severity !== 'critical') severity = 'high';

    out.push({
      id: `usgs-${id}`,
      source: 'usgs',
      type: 'earthquake',
      title: `M${mag.toFixed(1)} earthquake — ${f.properties?.place ?? 'Unknown location'}`,
      place: f.properties?.place ?? 'Unknown',
      severity,
      mag,
      depth: depth != null ? Number(depth) : undefined,
      alertLevel: f.properties?.alert,
      lat,
      lng,
      time,
      url: f.properties?.url,
      category: 'earthquake',
    });
  }

  return out;
}

type EonetEvent = {
  id?: string | number;
  title?: string;
  categories?: { id?: string; title?: string }[];
  link?: string;
  geometry?: { date?: string; type?: string; coordinates?: number[] }[];
};

export async function fetchEonetEvents(): Promise<DisasterEvent[]> {
  const data = await fetchJson<{ events?: EonetEvent[] }>(EONET_EVENTS_URL);
  const events = Array.isArray(data.events) ? data.events : [];
  const out: DisasterEvent[] = [];

  for (const ev of events) {
    const catId = ev.categories?.[0]?.id ?? 'other';
    const type = eonetCategoryToType(String(catId));
    const severity = eonetTypeToSeverity(type);

    const geom = [...(ev.geometry ?? [])].reverse().find(
      (g) => g.type === 'Point' && Array.isArray(g.coordinates) && g.coordinates.length >= 2,
    );
    const coords = geom?.coordinates;
    const lat = coords && coords.length >= 2 ? Number(coords[1]) : undefined;
    const lng = coords && coords.length >= 2 ? Number(coords[0]) : undefined;
    const timeIso = geom?.date ?? ev.geometry?.[0]?.date;
    const time = timeIso ? new Date(timeIso).getTime() : Date.now();
    if (!Number.isFinite(time)) continue;

    const eventId = String(ev.id ?? `eonet-${time}`);
    out.push({
      id: `eonet-${eventId}`,
      source: 'eonet',
      type,
      title: ev.title ?? `EONET ${type} event`,
      place: ev.categories?.[0]?.title ?? String(catId),
      severity,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      time,
      url: ev.link ?? `https://eonet.gsfc.nasa.gov/api/v3/events/${eventId}`,
      category: ev.categories?.[0]?.title ?? String(catId),
    });
  }

  return out;
}

/** Global cities with known poor air quality — screened when OpenAQ key is set. */
const OPENAQ_WATCHPOINTS: { lat: number; lng: number; city: string; country: string }[] = [
  { lat: 28.6139, lng: 77.209, city: 'Delhi', country: 'India' },
  { lat: 39.9042, lng: 116.4074, city: 'Beijing', country: 'China' },
  { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', country: 'USA' },
  { lat: 19.4326, lng: -99.1332, city: 'Mexico City', country: 'Mexico' },
  { lat: 41.0082, lng: 28.9784, city: 'Istanbul', country: 'Turkey' },
];

export async function fetchOpenAqWatchpointSignals(): Promise<DisasterEvent[]> {
  const apiKey = process.env.OPENAQ_API_KEY?.trim();
  if (!apiKey) return [];

  const out: DisasterEvent[] = [];
  const { getAirQuality } = await import('./publicApiAdapters');

  for (const wp of OPENAQ_WATCHPOINTS) {
    try {
      const aq = await getAirQuality({ lat: wp.lat, lng: wp.lng });
      const pm25 = aq.pm25 as { value?: number } | null | undefined;
      const value = Number(pm25?.value);
      if (!Number.isFinite(value) || value < 75) continue;

      const severity: DisasterSeverity =
        value >= 150 ? 'critical' : value >= 100 ? 'high' : 'moderate';

      out.push({
        id: `openaq-${wp.city.toLowerCase().replace(/\s+/g, '-')}-${Math.round(value)}`,
        source: 'openaq',
        type: 'other',
        title: `Elevated PM2.5 near ${wp.city} (${Math.round(value)} µg/m³)`,
        place: `${wp.city}, ${wp.country}`,
        severity,
        lat: wp.lat,
        lng: wp.lng,
        time: Date.now(),
        url: 'https://openaq.org/',
        category: 'air_quality',
      });
    } catch {
      // skip failed watchpoint
    }
  }

  return out;
}

export async function fetchGlobalDisasterEvents(): Promise<DisasterEvent[]> {
  const [usgs, eonet, aq] = await Promise.all([
    fetchUsgsEarthquakes().catch((err) => {
      console.warn('[disasters] USGS feed failed:', err instanceof Error ? err.message : err);
      return [] as DisasterEvent[];
    }),
    fetchEonetEvents().catch((err) => {
      console.warn('[disasters] EONET feed failed:', err instanceof Error ? err.message : err);
      return [] as DisasterEvent[];
    }),
    fetchOpenAqWatchpointSignals().catch((err) => {
      console.warn('[disasters] OpenAQ watchpoints failed:', err instanceof Error ? err.message : err);
      return [] as DisasterEvent[];
    }),
  ]);

  const byId = new Map<string, DisasterEvent>();
  for (const e of [...usgs, ...eonet, ...aq]) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }

  return [...byId.values()].sort((a, b) => b.time - a.time);
}
