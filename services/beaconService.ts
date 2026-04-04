import { apiUrl } from '../constants';

/**
 * Community beacons — shared via DPAL API (`getApiBase()`) so other devices and helpers can see active signals.
 *
 * Backend contract (Railway / final endpoint):
 * - `GET /api/beacons?status=active` → `{ beacons: BeaconRecord[] }`
 * - `POST /api/beacons` — body JSON below; creates/updates an active beacon for the report/room
 * - `POST /api/beacons/resolve` — body `{ reportId: string }` — marks resolved (optional route name)
 *
 * If routes are missing (404), the client falls back to localStorage so the UI still lists beacons on this device.
 */

export interface BeaconRecord {
  id: string;
  reportId: string;
  title: string;
  areaLabel: string;
  urgency: string;
  alertKind: string;
  status: 'active' | 'resolved';
  deployedAt: number;
  latitude?: number;
  longitude?: number;
}

const LOCAL_KEY = 'dpal-network-beacons-v1';

function normalizeBeacon(b: any): BeaconRecord {
  return {
    id: String(b?.id || b?.reportId || `beacon-${b?.deployedAt || Date.now()}`),
    reportId: String(b?.reportId || ''),
    title: String(b?.title || 'Coordination'),
    areaLabel: String(b?.areaLabel || b?.area || ''),
    urgency: String(b?.urgency || 'standard'),
    alertKind: String(b?.alertKind || 'community_help'),
    status: b?.status === 'resolved' ? 'resolved' : 'active',
    deployedAt: Number(b?.deployedAt || Date.now()),
    latitude: typeof b?.latitude === 'number' ? b.latitude : undefined,
    longitude: typeof b?.longitude === 'number' ? b.longitude : undefined,
  };
}

function readLocalAll(): BeaconRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data?.beacons) ? data.beacons.map(normalizeBeacon) : [];
  } catch {
    return [];
  }
}

function writeLocal(beacons: BeaconRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ beacons, updatedAt: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

/** Active beacons from network + local fallback merged by reportId (network wins). */
export async function fetchActiveBeacons(): Promise<{ beacons: BeaconRecord[]; source: 'api' | 'local' | 'mixed'; error?: string }> {
  const local = readLocalAll().filter((b) => b.status === 'active');
  try {
    const res = await fetch(apiUrl('/api/beacons?status=active'), { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const remote: BeaconRecord[] = Array.isArray(data?.beacons)
      ? (data.beacons as unknown[])
          .map(normalizeBeacon)
          .filter((b: BeaconRecord) => b.status === 'active')
      : [];
    const byId = new Map<string, BeaconRecord>();
    for (const b of local) byId.set(b.reportId, b);
    for (const b of remote) byId.set(b.reportId, b);
    return { beacons: [...byId.values()].sort((a, b) => b.deployedAt - a.deployedAt), source: remote.length ? 'mixed' : 'local' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { beacons: local, source: 'local', error: msg };
  }
}

export interface PublishBeaconPayload {
  reportId: string;
  title: string;
  areaLabel: string;
  urgency: string;
  alertKind: string;
  latitude?: number;
  longitude?: number;
  deployedAt: number;
}

export async function publishBeacon(payload: PublishBeaconPayload): Promise<{ ok: boolean; error?: string }> {
  const record: BeaconRecord = {
    id: `local-${payload.reportId}`,
    reportId: payload.reportId,
    title: payload.title,
    areaLabel: payload.areaLabel,
    urgency: payload.urgency,
    alertKind: payload.alertKind,
    status: 'active',
    deployedAt: payload.deployedAt,
    latitude: payload.latitude,
    longitude: payload.longitude,
  };

  const locals = readLocalAll().filter((b) => b.reportId !== payload.reportId);
  locals.push(record);
  writeLocal(locals);

  try {
    const res = await fetch(apiUrl('/api/beacons'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId: payload.reportId,
        title: payload.title,
        areaLabel: payload.areaLabel,
        urgency: payload.urgency,
        alertKind: payload.alertKind,
        status: 'active',
        deployedAt: payload.deployedAt,
        latitude: payload.latitude,
        longitude: payload.longitude,
      }),
    });
    if (!res.ok && res.status !== 404) {
      return { ok: true, error: `Server returned ${res.status}; saved locally until sync.` };
    }
    return { ok: true };
  } catch {
    return { ok: true, error: 'Saved on this device; sync when the beacon API is available.' };
  }
}

export async function resolveBeaconOnNetwork(reportId: string): Promise<{ ok: boolean; error?: string }> {
  const locals = readLocalAll().map((b) =>
    b.reportId === reportId ? { ...b, status: 'resolved' as const } : b
  );
  writeLocal(locals);

  try {
    const res = await fetch(apiUrl('/api/beacons/resolve'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId }),
    });
    if (!res.ok && res.status !== 404) {
      return { ok: true, error: `Resolve pending (${res.status}); updated locally.` };
    }
    return { ok: true };
  } catch {
    return { ok: true, error: 'Marked resolved locally; sync when online.' };
  }
}
