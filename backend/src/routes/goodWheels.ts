import { Router, type Request, type Response } from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import {
  calculateGoodWheelsFareSplit,
  fareSplitToPayload,
  type GoodWheelsFareSplitPayload,
} from '../utils/goodWheelsFareSplit';

type BroadcastAudience = 'all' | 'nearby' | 'mission' | 'emergency' | 'community' | 'surge' | 'charity' | 'hazard';
type ChatSenderRole = 'driver' | 'passenger' | 'dispatch' | 'system';

type GoodWheelsBroadcast = {
  id: string;
  audience: BroadcastAudience;
  tripId?: string;
  text: string;
  status?: 'open' | 'accepted' | 'closed';
  createdAt: string;
  senderName: string;
  senderRole: ChatSenderRole;
  acknowledgements: Array<{ driverId: string; at: string }>;
};

type GoodWheelsChatMessage = {
  id: string;
  threadId: string;
  text: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderRole: ChatSenderRole;
};

type GoodWheelsUser = {
  id: string;
  email?: string;
  password?: string;
  role: 'passenger' | 'driver' | 'worker';
  fullName: string;
  phoneMasked: string;
  trust: {
    trustScore: number;
    verifiedUser: 'unverified' | 'pending' | 'verified';
    verifiedDriver?: 'unverified' | 'pending' | 'verified';
    verifiedVehicle?: 'unverified' | 'pending' | 'verified';
  };
  vehicleId?: string;
  isOnline?: boolean;
  earningsCents?: number;
  savedPlaceIds?: string[];
  assistancePreferences?: string[];
  familySafeMode?: boolean;
  organization?: string;
  queueIds?: string[];
};

type GoodWheelsTrip = {
  id: string;
  passengerId: string;
  driverId?: string;
  pickupCategory?: string;
  dropoffCategory?: string;
  driverSnapshot?: {
    id: string;
    fullName: string;
    vehicle?: {
      makeModel?: string;
      plateMasked?: string;
      colorName?: string;
      seats?: number;
      verification?: string;
      vehicleType?: string;
    };
    trust?: {
      verifiedDriver?: 'unverified' | 'pending' | 'verified';
      verifiedVehicle?: 'unverified' | 'pending' | 'verified';
    };
  };
  workerId?: string;
  pickup: { label: string; addressLine: string; point?: { lat: number; lng: number } };
  dropoff: { label: string; addressLine: string; point?: { lat: number; lng: number } };
  purpose: string;
  supportCategoryId?: string;
  status: string;
  safetyStatus?: string;
  createdAtIso: string;
  updatedAtIso: string;
  estimate: {
    etaMinutes: number;
    distanceKm: number;
    totalFareCents?: number;
    currency?: string;
    fareSplit?: GoodWheelsFareSplitPayload;
  };
  timeline: Array<{ id: string; atIso: string; label: string; detail?: string }>;
  routeSummary?: { distanceKm: number; durationMinutes: number; previewSteps?: string[] };
  chatThreadId?: string;
  broadcastId?: string;
  completedAtIso?: string;
  cancelledAtIso?: string;
  cancelReason?: string;
};

const router = Router();

const DATA_DIR = path.resolve(process.cwd(), 'data', 'good-wheels');
const BROADCASTS_FILE = path.join(DATA_DIR, 'broadcasts.json');
const CHAT_FILE = path.join(DATA_DIR, 'chatMessages.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRIPS_FILE = path.join(DATA_DIR, 'trips.json');

let writeQueue: Promise<void> = Promise.resolve();

function mkId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

async function ensureJsonFile(filePath: string, fallback: unknown): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf8');
  }
}

async function ensureStorage(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await Promise.all([
    ensureJsonFile(BROADCASTS_FILE, []),
    ensureJsonFile(CHAT_FILE, []),
    ensureJsonFile(USERS_FILE, []),
    ensureJsonFile(TRIPS_FILE, []),
  ]);
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  await ensureStorage();
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeJsonArray<T>(filePath: string, rows: T[]): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await fs.writeFile(filePath, JSON.stringify(rows, null, 2), 'utf8');
  });
  await writeQueue;
}

function asAudience(value: unknown): BroadcastAudience {
  const raw = String(value || '').trim() as BroadcastAudience;
  const allowed: BroadcastAudience[] = ['all', 'nearby', 'mission', 'emergency', 'community', 'surge', 'charity', 'hazard'];
  return allowed.includes(raw) ? raw : 'all';
}

function asTripStatus(input: unknown): string {
  const raw = String(input || '').trim();
  const allowed = new Set([
    'requested',
    'broadcasted',
    'matched',
    'accepted',
    'driver_en_route',
    'driver_arrived',
    'passenger_onboard',
    'in_progress',
    'completed',
    'cancelled',
    // backward compatibility
    'driver_assigned',
    'driver_arriving',
    'arrived',
    'canceled',
    'support_in_progress',
    'escalated',
  ]);
  return allowed.has(raw) ? raw : 'requested';
}

function normalizeTerminalStatus(status: string): string {
  if (status === 'canceled') return 'cancelled';
  return status;
}

async function seedUsersIfEmpty(): Promise<GoodWheelsUser[]> {
  const users = await readJsonArray<GoodWheelsUser>(USERS_FILE);
  const seeded: GoodWheelsUser[] = [
    {
      id: 'usr-passenger-001',
      email: 'passenger@goodwheels.test',
      password: 'GoodWheels123!',
      role: 'passenger',
      fullName: 'Ariana M.',
      phoneMasked: '(•••) •••-1842',
      trust: { trustScore: 92, verifiedUser: 'verified' },
      savedPlaceIds: ['plc-home-001', 'plc-clinic-001'],
      assistancePreferences: ['Medical Transport', 'Family Safe'],
      familySafeMode: true,
    },
    {
      id: 'usr-driver-001',
      email: 'driver@goodwheels.test',
      password: 'GoodWheels123!',
      role: 'driver',
      fullName: 'Carlos Driver',
      phoneMasked: '(•••) •••-5220',
      trust: { trustScore: 95, verifiedUser: 'verified', verifiedDriver: 'verified', verifiedVehicle: 'verified' },
      vehicleId: 'veh-001',
      isOnline: true,
      earningsCents: 18450,
    },
    {
      id: 'usr-worker-001',
      role: 'worker',
      fullName: 'Samira T.',
      phoneMasked: '(•••) •••-9031',
      trust: { trustScore: 97, verifiedUser: 'verified' },
      organization: 'Community Support Desk',
      queueIds: ['tsk-001', 'tsk-002'],
    },
  ];
  if (users.length > 0) {
    const byId = new Map(users.map((u) => [u.id, u]));
    const merged = users.map((u) => {
      const seed = seeded.find((s) => s.id === u.id);
      return seed ? { ...u, ...seed, trust: { ...u.trust, ...seed.trust } } : u;
    });
    for (const seed of seeded) {
      if (!byId.has(seed.id)) merged.push(seed);
    }
    await writeJsonArray(USERS_FILE, merged);
    return merged;
  }
  await writeJsonArray(USERS_FILE, seeded);
  return seeded;
}

function publicUser(u: GoodWheelsUser): Omit<GoodWheelsUser, 'password'> {
  const { password: _omit, ...rest } = u;
  return rest;
}

async function seedTripsIfEmpty(): Promise<GoodWheelsTrip[]> {
  const trips = await readJsonArray<GoodWheelsTrip>(TRIPS_FILE);
  if (trips.length > 0) return trips;
  const now = new Date().toISOString();
  const seeded: GoodWheelsTrip[] = [
    {
      id: 'trip-q-2001',
      passengerId: 'usr-passenger-001',
      pickup: { label: 'Home', addressLine: '88 Willow Ln' },
      dropoff: { label: 'School', addressLine: 'Ridgeview Elementary' },
      purpose: 'school_transport',
      supportCategoryId: 'school_ride',
      status: 'matched',
      safetyStatus: 'family_safe',
      createdAtIso: now,
      updatedAtIso: now,
      estimate: { etaMinutes: 9, distanceKm: 5.1 },
      timeline: [{ id: 'q1', atIso: now, label: 'Request available', detail: 'Family-safe pickup requested.' }],
      routeSummary: { distanceKm: 5.1, durationMinutes: 14, previewSteps: ['Head east', 'Arrive at school entrance'] },
    },
  ];
  await writeJsonArray(TRIPS_FILE, seeded);
  return seeded;
}

function defaultTotalFareCentsFromDistance(distanceKm: number): number {
  const km = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 4.8;
  const usd = Math.max(5.4, km * 2.9 + 4);
  return Math.round(usd * 100);
}

function enrichTripEstimate(trip: GoodWheelsTrip): GoodWheelsTrip {
  const dist =
    typeof trip.estimate?.distanceKm === 'number' && trip.estimate.distanceKm > 0 ? trip.estimate.distanceKm : 4.8;
  let total =
    typeof trip.estimate?.totalFareCents === 'number' && Number.isFinite(trip.estimate.totalFareCents)
      ? Math.round(trip.estimate.totalFareCents)
      : 0;
  if (total <= 0) {
    total = defaultTotalFareCentsFromDistance(dist);
  }
  const split = calculateGoodWheelsFareSplit(total);
  return {
    ...trip,
    estimate: {
      etaMinutes: typeof trip.estimate?.etaMinutes === 'number' ? trip.estimate.etaMinutes : 8,
      distanceKm: dist,
      totalFareCents: split.totalFareCents,
      currency: trip.estimate?.currency || 'USD',
      fareSplit: fareSplitToPayload(split),
    },
  };
}

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  await ensureStorage();
  res.json({
    ok: true,
    service: 'good-wheels-comms',
    persistence: 'file',
    timestamp: new Date().toISOString(),
  });
});

router.post('/auth/signin', async (req: Request, res: Response): Promise<void> => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();
  const users = await seedUsersIfEmpty();
  let user = users.find((u) => (u.email ?? '').toLowerCase() === email) ?? null;
  if (!user) {
    if (email.includes('driver')) user = users.find((u) => u.role === 'driver') ?? users[0];
    else if (email.includes('worker')) user = users.find((u) => u.role === 'worker') ?? users[0];
    else if (email.includes('passenger')) user = users.find((u) => u.role === 'passenger') ?? users[0];
  }
  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid credentials' });
    return;
  }
  if (user.password && password && user.password !== password) {
    res.status(401).json({ ok: false, error: 'Invalid credentials' });
    return;
  }
  res.json({ ok: true, user: publicUser(user) });
});

router.post('/auth/sign-in', async (req: Request, res: Response): Promise<void> => {
  // Alias for backwards compatibility with old docs/spelling.
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();
  const users = await seedUsersIfEmpty();
  let user = users.find((u) => (u.email ?? '').toLowerCase() === email) ?? null;
  if (!user) {
    if (email.includes('driver')) user = users.find((u) => u.role === 'driver') ?? users[0];
    else if (email.includes('worker')) user = users.find((u) => u.role === 'worker') ?? users[0];
    else if (email.includes('passenger')) user = users.find((u) => u.role === 'passenger') ?? users[0];
  }
  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid credentials' });
    return;
  }
  if (user.password && password && user.password !== password) {
    res.status(401).json({ ok: false, error: 'Invalid credentials' });
    return;
  }
  res.json({ ok: true, user: publicUser(user) });
});

router.post('/auth/switch-role', async (req: Request, res: Response): Promise<void> => {
  const role = String(req.body?.role || '').trim() as GoodWheelsUser['role'];
  const users = await seedUsersIfEmpty();
  const user = users.find((u) => u.role === role);
  if (!user) {
    res.status(404).json({ ok: false, error: 'No user found with that role' });
    return;
  }
  res.json({ ok: true, user: publicUser(user) });
});

router.post('/auth/signout', async (_req: Request, res: Response): Promise<void> => {
  res.json({ ok: true });
});

router.get('/trips/active', async (req: Request, res: Response): Promise<void> => {
  const userId = String(req.query.userId || '').trim();
  const trips = await seedTripsIfEmpty();
  const active = trips
    .filter((t) =>
      (t.passengerId === userId || t.driverId === userId || t.workerId === userId) &&
      !['completed', 'cancelled', 'canceled'].includes(t.status),
    )
    .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso))[0] ?? null;
  res.json({ ok: true, trip: active ? enrichTripEstimate(active) : null });
});

router.get('/trips/history', async (req: Request, res: Response): Promise<void> => {
  const userId = String(req.query.userId || '').trim();
  const trips = await seedTripsIfEmpty();
  const history = trips
    .filter((t) => (t.passengerId === userId || t.driverId === userId || t.workerId === userId) && ['completed', 'cancelled', 'canceled'].includes(t.status))
    .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
  res.json({ ok: true, trips: history.map(enrichTripEstimate) });
});

router.post('/trips/request', async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};
  if (!body.pickup || !body.dropoff) {
    res.status(400).json({ ok: false, error: 'pickup and dropoff are required' });
    return;
  }
  const now = new Date().toISOString();
  const tripId = mkId('trip');
  const chatThreadId = `good-wheels-trip-${tripId}`;
  const estIn = body.estimate && typeof body.estimate === 'object' ? (body.estimate as { etaMinutes?: unknown; distanceKm?: unknown }) : null;
  const etaMinutes =
    typeof estIn?.etaMinutes === 'number' && Number.isFinite(estIn.etaMinutes) ? Math.max(1, Math.round(estIn.etaMinutes)) : 8;
  const distanceKm =
    typeof estIn?.distanceKm === 'number' && Number.isFinite(estIn.distanceKm) ? Math.max(0.1, Number(estIn.distanceKm.toFixed(2))) : 4.8;
  const routeIn = body.routeSummary && typeof body.routeSummary === 'object' ? body.routeSummary : null;
  const routeSummary =
    routeIn && typeof (routeIn as { distanceKm?: unknown }).distanceKm === 'number'
      ? {
          distanceKm: Number((routeIn as { distanceKm: number }).distanceKm.toFixed?.(2) ?? (routeIn as { distanceKm: number }).distanceKm),
          durationMinutes:
            typeof (routeIn as { durationMinutes?: unknown }).durationMinutes === 'number'
              ? Math.max(1, Math.round((routeIn as { durationMinutes: number }).durationMinutes))
              : etaMinutes,
          previewSteps: Array.isArray((routeIn as { previewSteps?: unknown }).previewSteps)
            ? ((routeIn as { previewSteps: string[] }).previewSteps.filter((x) => typeof x === 'string').slice(0, 12) as string[])
            : undefined,
        }
      : undefined;
  const estFareIn =
    body.estimate && typeof body.estimate === 'object'
      ? (body.estimate as { totalFareCents?: unknown; fareUsd?: unknown })
      : null;
  let totalFareCents =
    typeof estFareIn?.totalFareCents === 'number' && Number.isFinite(estFareIn.totalFareCents) && estFareIn.totalFareCents > 0
      ? Math.round(Number(estFareIn.totalFareCents))
      : typeof body.totalFareCents === 'number' && Number.isFinite(body.totalFareCents) && body.totalFareCents > 0
        ? Math.round(Number(body.totalFareCents))
        : typeof body.fareUsd === 'number' && body.fareUsd > 0
          ? Math.round(body.fareUsd * 100)
          : 0;
  if (totalFareCents <= 0) {
    totalFareCents = defaultTotalFareCentsFromDistance(distanceKm);
  }
  const initialFareSplit = calculateGoodWheelsFareSplit(totalFareCents);
  const trip: GoodWheelsTrip = {
    id: tripId,
    passengerId: String(body.passengerId || 'usr-passenger-001'),
    pickup: body.pickup,
    dropoff: body.dropoff,
    pickupCategory: body.pickupCategory ? String(body.pickupCategory) : undefined,
    dropoffCategory: body.dropoffCategory ? String(body.dropoffCategory) : undefined,
    purpose: String(body.purpose || 'normal_ride'),
    supportCategoryId: body.supportCategoryId ? String(body.supportCategoryId) : undefined,
    status: 'broadcasted',
    safetyStatus: body.familySafe ? 'family_safe' : 'standard',
    createdAtIso: now,
    updatedAtIso: now,
    estimate: {
      etaMinutes,
      distanceKm,
      totalFareCents: initialFareSplit.totalFareCents,
      currency: 'USD',
      fareSplit: fareSplitToPayload(initialFareSplit),
    },
    routeSummary,
    timeline: [
      { id: mkId('evt'), atIso: now, label: 'Ride requested', detail: 'Passenger created a new ride request.' },
      { id: mkId('evt'), atIso: now, label: 'Ride broadcasted', detail: 'Dispatch signal posted to driver queue.' },
    ],
    chatThreadId,
  };
  const trips = await seedTripsIfEmpty();
  const broadcast: GoodWheelsBroadcast = {
    id: mkId('gwb'),
    audience: 'nearby',
    tripId: trip.id,
    text: `New Good Wheels ride request. Pickup: ${trip.pickup.addressLine} (${trip.pickupCategory ?? 'unspecified'}). Dropoff: ${trip.dropoff.addressLine} (${trip.dropoffCategory ?? 'unspecified'}). Support category: ${trip.supportCategoryId ?? 'standard'}. Safety status: ${trip.safetyStatus ?? 'standard'}. Estimated distance: ${trip.estimate.distanceKm.toFixed(1)} km. ETA about ${trip.estimate.etaMinutes} minutes.`,
    status: 'open',
    createdAt: now,
    senderName: 'Dispatch',
    senderRole: 'dispatch',
    acknowledgements: [],
  };
  const broadcasts = await readJsonArray<GoodWheelsBroadcast>(BROADCASTS_FILE);
  broadcasts.unshift(broadcast);
  await writeJsonArray(BROADCASTS_FILE, broadcasts.slice(0, 500));
  trip.broadcastId = broadcast.id;
  trips.unshift(trip);
  await writeJsonArray(TRIPS_FILE, trips);
  res.status(201).json({ ok: true, trip: enrichTripEstimate(trip) });
});

router.get('/driver/queue', async (_req: Request, res: Response): Promise<void> => {
  const trips = await seedTripsIfEmpty();
  const queue = trips.filter((t) => ['requested', 'broadcasted', 'matched'].includes(t.status));
  res.json({ ok: true, queue: queue.map(enrichTripEstimate) });
});

router.get('/driver/profile', async (req: Request, res: Response): Promise<void> => {
  const driverId = String(req.query.driverId || 'usr-driver-001');
  const users = await seedUsersIfEmpty();
  const user = users.find((u) => u.id === driverId && u.role === 'driver') ?? users.find((u) => u.role === 'driver');
  if (!user) {
    res.status(404).json({ ok: false, error: 'Driver not found' });
    return;
  }
  res.json({
    ok: true,
    profile: {
      id: user.id,
      fullName: user.fullName,
      isVerifiedDriver: user.trust.verifiedDriver === 'verified',
      isVerifiedVehicle: user.trust.verifiedVehicle === 'verified',
      availability: user.isOnline ? 'online' : 'offline',
    },
  });
});

router.get('/driver/history', async (req: Request, res: Response): Promise<void> => {
  const driverId = String(req.query.driverId || '').trim();
  const trips = await seedTripsIfEmpty();
  const history = trips
    .filter((t) => t.driverId === driverId && ['completed', 'cancelled', 'canceled'].includes(t.status))
    .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
  res.json({ ok: true, history: history.map(enrichTripEstimate) });
});

router.patch('/driver/availability', async (req: Request, res: Response): Promise<void> => {
  const driverId = String(req.body?.driverId || '').trim();
  const status = String(req.body?.status || '').trim();
  if (!driverId || !status) {
    res.status(400).json({ ok: false, error: 'driverId and status are required' });
    return;
  }
  const users = await seedUsersIfEmpty();
  const idx = users.findIndex((u) => u.id === driverId && u.role === 'driver');
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Driver not found' });
    return;
  }
  users[idx] = { ...users[idx], isOnline: status === 'online' || status === 'busy' };
  await writeJsonArray(USERS_FILE, users);
  res.json({ ok: true, availability: status });
});

router.get('/driver/vehicle', async (req: Request, res: Response): Promise<void> => {
  const driverId = String(req.query.driverId || 'usr-driver-001');
  const users = await seedUsersIfEmpty();
  const user = users.find((u) => u.id === driverId && u.role === 'driver') ?? users.find((u) => u.role === 'driver');
  if (!user) {
    res.status(404).json({ ok: false, error: 'Driver not found' });
    return;
  }
  res.json({
    ok: true,
    vehicle: {
      id: user.vehicleId || 'veh-001',
      makeModel: 'Toyota Corolla',
      plateMasked: 'GW-2026',
      seats: 4,
      accessibilityReady: false,
      verification: 'verified',
      color: '#EAB308',
      colorName: 'Yellow',
      vehicleType: 'car',
    },
  });
});

router.get('/driver/performance', async (req: Request, res: Response): Promise<void> => {
  const driverId = String(req.query.driverId || 'usr-driver-001');
  const trips = await seedTripsIfEmpty();
  const completedTrips = trips.filter((t) => t.driverId === driverId && t.status === 'completed').length;
  res.json({
    ok: true,
    performance: {
      rating: 4.9,
      completedTrips,
      responseTimeSeconds: 42,
      trustScore: 95,
      safetyCompliance: 'good',
    },
  });
});

router.post('/trips/:tripId/accept', async (req: Request, res: Response): Promise<void> => {
  const tripId = String(req.params.tripId || '').trim();
  const driverId = String(req.body?.driverId || '').trim();
  if (!tripId || !driverId) {
    res.status(400).json({ ok: false, error: 'tripId and driverId are required' });
    return;
  }
  const users = await seedUsersIfEmpty();
  const driver = users.find((u) => u.id === driverId && u.role === 'driver');
  if (!driver) {
    res.status(404).json({ ok: false, error: 'Driver not found' });
    return;
  }
  const trips = await seedTripsIfEmpty();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Trip not found' });
    return;
  }
  const now = new Date().toISOString();
  const prev = trips[idx];
  const next: GoodWheelsTrip = {
    ...prev,
    driverId: prev.driverId || driverId,
    driverSnapshot: {
      id: driver.id,
      fullName: driver.fullName,
      vehicle: {
        makeModel: 'Toyota Corolla',
        plateMasked: 'GW-2026',
        colorName: 'Yellow',
        seats: 4,
        verification: 'verified',
        vehicleType: 'car',
      },
      trust: {
        verifiedDriver: driver?.trust?.verifiedDriver ?? 'verified',
        verifiedVehicle: driver?.trust?.verifiedVehicle ?? 'verified',
      },
    },
    status: 'accepted',
    updatedAtIso: now,
    chatThreadId: prev.chatThreadId || `good-wheels-trip-${prev.id}`,
    timeline: [
      ...prev.timeline,
      {
        id: mkId('evt'),
        atIso: now,
        label: 'Driver accepted ride',
        detail: `${driver?.fullName ?? 'Driver'} accepted this ride.`,
      },
    ],
  };
  trips[idx] = next;
  await writeJsonArray(TRIPS_FILE, trips);
  if (next.broadcastId) {
    const broadcasts = await readJsonArray<GoodWheelsBroadcast>(BROADCASTS_FILE);
    const bi = broadcasts.findIndex((b) => b.id === next.broadcastId);
    if (bi >= 0) {
      broadcasts[bi] = { ...broadcasts[bi], status: 'accepted' };
      await writeJsonArray(BROADCASTS_FILE, broadcasts);
    }
  }
  res.json({ ok: true, trip: enrichTripEstimate(next) });
});

router.patch('/trips/:tripId/status', async (req: Request, res: Response): Promise<void> => {
  const tripId = String(req.params.tripId || '').trim();
  const status = normalizeTerminalStatus(asTripStatus(req.body?.status));
  const timelineLabel = String(req.body?.timelineLabel || '').trim();
  const timelineDetail = String(req.body?.timelineDetail || '').trim();
  if (!tripId || !status) {
    res.status(400).json({ ok: false, error: 'tripId and status are required' });
    return;
  }
  const trips = await seedTripsIfEmpty();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Trip not found' });
    return;
  }
  const now = new Date().toISOString();
  const prev = trips[idx];
  const next: GoodWheelsTrip = {
    ...prev,
    status,
    updatedAtIso: now,
    chatThreadId: prev.chatThreadId || `good-wheels-trip-${prev.id}`,
    timeline: [
      ...prev.timeline,
      {
        id: mkId('evt'),
        atIso: now,
        label: timelineLabel || `Status updated to ${status.replace(/_/g, ' ')}`,
        detail: timelineDetail || undefined,
      },
    ],
  };
  if (status === 'completed') {
    next.completedAtIso = now;
    next.cancelledAtIso = undefined;
    next.cancelReason = undefined;
  }
  if (status === 'cancelled') {
    next.cancelledAtIso = now;
    next.cancelReason = timelineDetail || 'Cancelled';
    next.completedAtIso = undefined;
  }
  trips[idx] = next;
  await writeJsonArray(TRIPS_FILE, trips);
  if (status === 'completed' || status === 'cancelled') {
    if (next.broadcastId) {
      const broadcasts = await readJsonArray<GoodWheelsBroadcast>(BROADCASTS_FILE);
      const bi = broadcasts.findIndex((b) => b.id === next.broadcastId);
      if (bi >= 0) {
        broadcasts[bi] = { ...broadcasts[bi], status: 'closed' };
        await writeJsonArray(BROADCASTS_FILE, broadcasts);
      }
    }
  }
  res.json({ ok: true, trip: enrichTripEstimate(next) });
});

router.post('/trips/:tripId/cancel', async (req: Request, res: Response): Promise<void> => {
  const tripId = String(req.params.tripId || '').trim();
  const trips = await seedTripsIfEmpty();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Trip not found' });
    return;
  }
  const now = new Date().toISOString();
  const prev = trips[idx];
  const next: GoodWheelsTrip = {
    ...prev,
    status: 'cancelled',
    updatedAtIso: now,
    chatThreadId: prev.chatThreadId || `good-wheels-trip-${prev.id}`,
    timeline: [
      ...prev.timeline,
      {
        id: mkId('evt'),
        atIso: now,
        label: 'Ride cancelled',
        detail: String(req.body?.reason || 'Cancelled by rider/driver'),
      },
    ],
    cancelledAtIso: now,
    cancelReason: String(req.body?.reason || 'Cancelled by rider/driver'),
  };
  trips[idx] = next;
  await writeJsonArray(TRIPS_FILE, trips);
  if (next.broadcastId) {
    const broadcasts = await readJsonArray<GoodWheelsBroadcast>(BROADCASTS_FILE);
    const bi = broadcasts.findIndex((b) => b.id === next.broadcastId);
    if (bi >= 0) {
      broadcasts[bi] = { ...broadcasts[bi], status: 'closed' };
      await writeJsonArray(BROADCASTS_FILE, broadcasts);
    }
  }
  res.json({ ok: true, trip: enrichTripEstimate(next) });
});

router.post('/trips/:tripId/complete', async (req: Request, res: Response): Promise<void> => {
  const tripId = String(req.params.tripId || '').trim();
  const trips = await seedTripsIfEmpty();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Trip not found' });
    return;
  }
  const now = new Date().toISOString();
  const prev = trips[idx];
  const next: GoodWheelsTrip = {
    ...prev,
    status: 'completed',
    updatedAtIso: now,
    chatThreadId: prev.chatThreadId || `good-wheels-trip-${prev.id}`,
    timeline: [
      ...prev.timeline,
      {
        id: mkId('evt'),
        atIso: now,
        label: 'Ride completed',
        detail: String(req.body?.note || 'Trip completed successfully.'),
      },
    ],
    completedAtIso: now,
    cancelledAtIso: undefined,
    cancelReason: undefined,
  };
  trips[idx] = next;
  await writeJsonArray(TRIPS_FILE, trips);
  if (next.broadcastId) {
    const broadcasts = await readJsonArray<GoodWheelsBroadcast>(BROADCASTS_FILE);
    const bi = broadcasts.findIndex((b) => b.id === next.broadcastId);
    if (bi >= 0) {
      broadcasts[bi] = { ...broadcasts[bi], status: 'closed' };
      await writeJsonArray(BROADCASTS_FILE, broadcasts);
    }
  }
  res.json({ ok: true, trip: enrichTripEstimate(next) });
});

router.get('/broadcasts', async (req: Request, res: Response): Promise<void> => {
  const audience = String(req.query.audience || '').trim();
  const limit = Math.max(1, Math.min(Number(req.query.limit || 30), 200));
  const rows = await readJsonArray<GoodWheelsBroadcast>(BROADCASTS_FILE);
  const filtered = rows
    .filter((r) => !audience || audience === 'all' || r.audience === audience || r.audience === 'all')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
  res.json({ ok: true, broadcasts: filtered });
});

router.post('/broadcasts', async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};
  const text = String(body.text || '').trim();
  if (!text) {
    res.status(400).json({ ok: false, error: 'Broadcast text is required' });
    return;
  }
  const senderName = String(body.senderName || 'Dispatch');
  const senderRole = (String(body.senderRole || 'dispatch') as ChatSenderRole);
  const broadcast: GoodWheelsBroadcast = {
    id: mkId('gwb'),
    audience: asAudience(body.audience),
    tripId: typeof body.tripId === 'string' ? body.tripId : undefined,
    text,
    status: 'open',
    createdAt: new Date().toISOString(),
    senderName,
    senderRole,
    acknowledgements: [],
  };
  const rows = await readJsonArray<GoodWheelsBroadcast>(BROADCASTS_FILE);
  rows.unshift(broadcast);
  await writeJsonArray(BROADCASTS_FILE, rows.slice(0, 500));
  res.status(201).json({ ok: true, broadcast });
});

router.post('/broadcasts/:broadcastId/ack', async (req: Request, res: Response): Promise<void> => {
  const broadcastId = String(req.params.broadcastId || '').trim();
  const driverId = String(req.body?.driverId || '').trim();
  if (!broadcastId || !driverId) {
    res.status(400).json({ ok: false, error: 'broadcastId and driverId are required' });
    return;
  }
  const rows = await readJsonArray<GoodWheelsBroadcast>(BROADCASTS_FILE);
  const idx = rows.findIndex((r) => r.id === broadcastId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Broadcast not found' });
    return;
  }
  const already = rows[idx].acknowledgements.some((a) => a.driverId === driverId);
  if (!already) {
    rows[idx].acknowledgements.push({ driverId, at: new Date().toISOString() });
    await writeJsonArray(BROADCASTS_FILE, rows);
  }
  res.json({ ok: true, broadcast: rows[idx] });
});

router.get('/chat/:threadId/messages', async (req: Request, res: Response): Promise<void> => {
  const threadId = String(req.params.threadId || '').trim();
  const limit = Math.max(1, Math.min(Number(req.query.limit || 200), 1000));
  const rows = await readJsonArray<GoodWheelsChatMessage>(CHAT_FILE);
  const messages = rows
    .filter((r) => r.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit);
  res.json({ ok: true, messages });
});

router.post('/chat/:threadId/messages', async (req: Request, res: Response): Promise<void> => {
  const threadId = String(req.params.threadId || '').trim();
  const text = String(req.body?.text || '').trim();
  if (!threadId || !text) {
    res.status(400).json({ ok: false, error: 'threadId and text are required' });
    return;
  }
  const message: GoodWheelsChatMessage = {
    id: mkId('gwm'),
    threadId,
    text,
    senderId: String(req.body?.senderId || 'unknown'),
    senderName: String(req.body?.senderName || 'Good Wheels User'),
    senderRole: (String(req.body?.senderRole || 'passenger') as ChatSenderRole),
    createdAt: new Date().toISOString(),
  };
  const rows = await readJsonArray<GoodWheelsChatMessage>(CHAT_FILE);
  rows.push(message);
  await writeJsonArray(CHAT_FILE, rows.slice(-5000));
  res.status(201).json({ ok: true, message });
});

export default router;
