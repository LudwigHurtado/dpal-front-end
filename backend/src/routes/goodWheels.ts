import { Router, type Request, type Response } from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import {
  calculateGoodWheelsFareSplit,
  fareSplitToPayload,
  type GoodWheelsFareSplitPayload,
} from '../utils/goodWheelsFareSplit';
import { listedFareCentsFromRoute } from '../services/goodWheelsListedFareEstimate';

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
  vehicle?: {
    makeModel?: string;
    plateMasked?: string;
    seats?: number;
    accessibilityReady?: boolean;
    color?: string;
    colorName?: string;
    vehicleType?: 'car' | 'moto' | 'truck' | 'van';
  };
  isOnline?: boolean;
  earningsCents?: number;
  savedPlaceIds?: string[];
  assistancePreferences?: string[];
  familySafeMode?: boolean;
  organization?: string;
  queueIds?: string[];
  lastKnownLocation?: { lat: number; lng: number; heading?: number; updatedAtIso: string };
};

type GoodWheelsTripOfferState = {
  passengerOfferCents?: number;
  recommendedFareCents?: number;
  driverCounterOfferCents?: number;
  acceptedFareCents?: number;
  status: 'none' | 'passenger_offered' | 'driver_countered' | 'accepted' | 'rejected' | 'closed' | 'cancelled_by_passenger';
  updatedAtIso: string;
};

type GoodWheelsDriverResponseState = {
  driverId: string;
  status: 'unseen' | 'seen' | 'acknowledged' | 'countered' | 'accepted' | 'rejected' | 'expired';
  lastActionAtIso: string;
};

type GoodWheelsTrip = {
  id: string;
  passengerId: string;
  driverId?: string;
  /** Driver currently in an exclusive negotiation (e.g. after counteroffer). */
  negotiationDriverId?: string;
  /** Drivers who dismissed this open request; filtered per-driver on queue/dashboard. */
  rejectedDriverIds?: string[];
  driverResponseState?: GoodWheelsDriverResponseState;
  acceptedAtIso?: string;
  closedAtIso?: string;
  expirationAtIso?: string;
  driverLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    updatedAtIso: string;
  };
  routeProgress?: {
    currentLeg: 'to_pickup' | 'to_dropoff';
    remainingDistanceKm?: number;
    remainingEtaMinutes?: number;
  };
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
  attachedCause?: {
    id: string;
    name: string;
    category: string;
    city: string;
    country: string;
  };
  /** Passenger-facing notes (e.g. charity impact summary); optional. */
  notes?: string;
  chatThreadId?: string;
  broadcastId?: string;
  completedAtIso?: string;
  cancelledAtIso?: string;
  cancelReason?: string;
  cancelledByRole?: 'driver' | 'passenger' | 'system';
  cancelledByUserId?: string;
  offerState?: GoodWheelsTripOfferState;
};

function legForStatus(status: string): 'to_pickup' | 'to_dropoff' {
  if (status === 'passenger_onboard' || status === 'in_progress' || status === 'support_in_progress') return 'to_dropoff';
  return 'to_pickup';
}

const router = Router();

const DATA_DIR = path.resolve(process.cwd(), 'data', 'good-wheels');
const BROADCASTS_FILE = path.join(DATA_DIR, 'broadcasts.json');
const CHAT_FILE = path.join(DATA_DIR, 'chatMessages.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRIPS_FILE = path.join(DATA_DIR, 'trips.json');
const RESET_TOKENS_FILE = path.join(DATA_DIR, 'resetTokens.json');

type ResetToken = { token: string; userId: string; expiresAt: string };

const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

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
    ensureJsonFile(RESET_TOKENS_FILE, []),
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

async function loadUsers(): Promise<GoodWheelsUser[]> {
  return readJsonArray<GoodWheelsUser>(USERS_FILE);
}

function publicUser(u: GoodWheelsUser): Omit<GoodWheelsUser, 'password'> {
  const { password: _omit, ...rest } = u;
  return rest;
}

async function loadTrips(): Promise<GoodWheelsTrip[]> {
  const trips = await readJsonArray<GoodWheelsTrip>(TRIPS_FILE);
  return trips;
}

function isTerminalTripStatus(status: string): boolean {
  return ['completed', 'cancelled', 'canceled'].includes(status);
}

const ACTIVE_ASSIGNED_STATUSES = new Set([
  'accepted',
  'driver_en_route',
  'driver_arrived',
  'passenger_onboard',
  'in_progress',
  'driver_assigned',
  'driver_arriving',
  'arrived',
]);

function isOpenPoolStatus(status: string): boolean {
  return ['requested', 'broadcasted', 'matched'].includes(status);
}

/** Open requests visible to this driver (not another driver's exclusive negotiation, not rejected by this driver). */
function filterAvailableRequestsForDriver(trips: GoodWheelsTrip[], driverId: string): GoodWheelsTrip[] {
  if (!driverId) {
    return trips.filter((t) => isOpenPoolStatus(t.status)).sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
  }
  return trips
    .filter((t) => isOpenPoolStatus(t.status))
    .filter((t) => !isTerminalTripStatus(t.status))
    .filter((t) => !(t.driverId && t.driverId !== driverId))
    .filter((t) => !t.rejectedDriverIds?.includes(driverId))
    .filter((t) => !(t.negotiationDriverId && t.negotiationDriverId !== driverId))
    .filter(
      (t) =>
        !(
          t.negotiationDriverId === driverId &&
          (t.offerState?.status === 'driver_countered' ||
            (t.offerState?.status === 'accepted' && !t.driverId && typeof t.offerState?.acceptedFareCents === 'number'))
        ),
    )
    .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
}

/** Trips where this driver countered (or passenger accepted that counter) and the ride is not yet assigned. */
function filterPendingCounterDealsForDriver(trips: GoodWheelsTrip[], driverId: string): GoodWheelsTrip[] {
  if (!driverId) return [];
  return trips
    .filter((t) => isOpenPoolStatus(t.status) && !isTerminalTripStatus(t.status))
    .filter((t) => t.negotiationDriverId === driverId)
    .filter(
      (t) =>
        t.offerState?.status === 'driver_countered' ||
        (t.offerState?.status === 'accepted' && !t.driverId && typeof t.offerState?.acceptedFareCents === 'number'),
    )
    .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
}

function filterActiveTripForDriver(trips: GoodWheelsTrip[], driverId: string): GoodWheelsTrip | null {
  if (!driverId) return null;
  const hit =
    trips
      .filter((t) => t.driverId === driverId && !isTerminalTripStatus(t.status))
      .filter((t) => ACTIVE_ASSIGNED_STATUSES.has(t.status))
      .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso))[0] ?? null;
  return hit;
}

function filterRecentCompletedForDriver(trips: GoodWheelsTrip[], driverId: string, limit: number): GoodWheelsTrip[] {
  if (!driverId) return [];
  return trips
    .filter((t) => t.driverId === driverId && t.status === 'completed')
    .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso))
    .slice(0, limit);
}

function buildDriverDashboardPayload(
  trips: GoodWheelsTrip[],
  driverId: string,
  driverProfile: {
    id: string;
    fullName: string;
    isVerifiedDriver: boolean;
    isVerifiedVehicle: boolean;
    availability: 'online' | 'offline' | 'busy';
  },
) {
  const activeTrip = filterActiveTripForDriver(trips, driverId);
  const pendingDeals = filterPendingCounterDealsForDriver(trips, driverId);
  const counteredDeals = pendingDeals;
  const availableRequests = filterAvailableRequestsForDriver(trips, driverId);
  const recentCompletedTrips = filterRecentCompletedForDriver(trips, driverId, 12);
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const completedToday = trips.filter(
    (t) => t.driverId === driverId && t.status === 'completed' && (t.completedAtIso ?? '').startsWith(todayPrefix),
  ).length;
  const lifetimeCompleted = trips.filter((t) => t.driverId === driverId && t.status === 'completed').length;
  return {
    driver: driverProfile,
    availability: driverProfile.availability,
    activeTrip: activeTrip ? enrichTripEstimate(activeTrip) : null,
    pendingDeals: pendingDeals.map(enrichTripEstimate),
    counteredDeals: counteredDeals.map(enrichTripEstimate),
    availableRequests: availableRequests.map(enrichTripEstimate),
    recentCompletedTrips: recentCompletedTrips.map(enrichTripEstimate),
    summary: {
      availableCount: availableRequests.length,
      pendingDealCount: pendingDeals.length,
      activeTripStatus: activeTrip?.status ?? null,
      completedToday,
      completedTrips: lifetimeCompleted,
    },
  };
}

function enrichTripEstimate(trip: GoodWheelsTrip): GoodWheelsTrip {
  const dist =
    typeof trip.estimate?.distanceKm === 'number' && trip.estimate.distanceKm > 0 ? trip.estimate.distanceKm : 4.8;
  const etaForHeuristic =
    typeof trip.estimate?.etaMinutes === 'number' && Number.isFinite(trip.estimate.etaMinutes)
      ? Math.max(1, Math.round(trip.estimate.etaMinutes))
      : undefined;
  const heuristicCents = listedFareCentsFromRoute(dist, etaForHeuristic);
  const prev = trip.offerState;
  const negStatus = prev?.status ?? 'none';

  const acceptedCents =
    typeof prev?.acceptedFareCents === 'number' && Number.isFinite(prev.acceptedFareCents) && prev.acceptedFareCents > 0
      ? Math.round(prev.acceptedFareCents)
      : 0;

  const offerPassengerCents =
    typeof prev?.passengerOfferCents === 'number' && Number.isFinite(prev.passengerOfferCents) && prev.passengerOfferCents > 0
      ? Math.round(prev.passengerOfferCents)
      : 0;

  const estimatePassengerCents =
    typeof trip.estimate?.totalFareCents === 'number' && Number.isFinite(trip.estimate.totalFareCents) && trip.estimate.totalFareCents > 0
      ? Math.round(trip.estimate.totalFareCents)
      : 0;

  const recommendedFromOffer =
    typeof prev?.recommendedFareCents === 'number' && Number.isFinite(prev.recommendedFareCents) && prev.recommendedFareCents > 0
      ? Math.round(prev.recommendedFareCents)
      : 0;

  /** Gross listed fare (single source for split + estimate.totalFareCents). */
  let grossListCents = 0;
  if (negStatus === 'accepted' && acceptedCents > 0) {
    grossListCents = acceptedCents;
  } else if (offerPassengerCents > 0) {
    grossListCents = offerPassengerCents;
  } else if (estimatePassengerCents > 0) {
    grossListCents = estimatePassengerCents;
  } else {
    grossListCents = heuristicCents;
  }

  const recommendedFareCents = recommendedFromOffer > 0 ? recommendedFromOffer : heuristicCents;

  const split = calculateGoodWheelsFareSplit(grossListCents);

  const displayPassengerOfferCents =
    negStatus === 'accepted' && acceptedCents > 0 ? acceptedCents : offerPassengerCents > 0 ? offerPassengerCents : grossListCents;

  const mergedOffer: GoodWheelsTripOfferState = {
    passengerOfferCents: displayPassengerOfferCents,
    recommendedFareCents,
    driverCounterOfferCents: prev?.driverCounterOfferCents,
    acceptedFareCents: acceptedCents > 0 ? acceptedCents : prev?.acceptedFareCents,
    status: negStatus !== 'none' ? negStatus : grossListCents > 0 ? 'passenger_offered' : 'none',
    updatedAtIso:
      prev?.updatedAtIso && negStatus !== 'none'
        ? prev.updatedAtIso
        : trip.updatedAtIso || trip.createdAtIso || new Date().toISOString(),
  };

  return {
    ...trip,
    estimate: {
      etaMinutes: typeof trip.estimate?.etaMinutes === 'number' ? trip.estimate.etaMinutes : 8,
      distanceKm: dist,
      totalFareCents: grossListCents,
      currency: trip.estimate?.currency || 'USD',
      fareSplit: fareSplitToPayload(split),
    },
    offerState: mergedOffer.status === 'none' && grossListCents <= 0 ? undefined : mergedOffer,
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

async function verifyPassword(input: string, stored: string): Promise<boolean> {
  if (!input || !stored) return false;
  if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
    return bcrypt.compare(input, stored);
  }
  return input === stored;
}

router.post('/auth/signin', async (req: Request, res: Response): Promise<void> => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();
  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'Email and password are required' });
    return;
  }
  const users = await loadUsers();
  const user = users.find((u) => (u.email ?? '').toLowerCase() === email) ?? null;
  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid credentials' });
    return;
  }
  if (user.password) {
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      res.status(401).json({ ok: false, error: 'Invalid credentials' });
      return;
    }
  }
  res.json({ ok: true, user: publicUser(user) });
});

router.post('/auth/sign-in', async (req: Request, res: Response): Promise<void> => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();
  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'Email and password are required' });
    return;
  }
  const users = await loadUsers();
  const user = users.find((u) => (u.email ?? '').toLowerCase() === email) ?? null;
  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid credentials' });
    return;
  }
  if (user.password) {
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      res.status(401).json({ ok: false, error: 'Invalid credentials' });
      return;
    }
  }
  res.json({ ok: true, user: publicUser(user) });
});

router.post('/auth/switch-role', async (req: Request, res: Response): Promise<void> => {
  const role = String(req.body?.role || '').trim() as GoodWheelsUser['role'];
  const userId = String(req.body?.userId || '').trim();
  if (!userId || !role) {
    res.status(400).json({ ok: false, error: 'userId and role are required' });
    return;
  }
  const users = await loadUsers();
  const user = users.find((u) => u.id === userId && u.role === role);
  if (!user) {
    res.status(404).json({ ok: false, error: 'User does not have that role' });
    return;
  }
  res.json({ ok: true, user: publicUser(user) });
});

router.post('/auth/signout', async (_req: Request, res: Response): Promise<void> => {
  res.json({ ok: true });
});

router.post('/auth/register', async (req: Request, res: Response): Promise<void> => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();
  const fullName = String(req.body?.fullName || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const role = String(req.body?.role || 'passenger').trim() as GoodWheelsUser['role'];

  if (!email || !password || !fullName) {
    res.status(400).json({ ok: false, error: 'Full name, email, and password are required' });
    return;
  }
  if (!['passenger', 'driver'].includes(role)) {
    res.status(400).json({ ok: false, error: 'Role must be passenger or driver' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' });
    return;
  }

  const users = await loadUsers();
  const existing = users.find((u) => (u.email ?? '').toLowerCase() === email);
  if (existing) {
    res.status(409).json({ ok: false, error: 'An account with this email already exists' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();
  const id = mkId(role === 'driver' ? 'drv' : 'pax');

  const vehicle = role === 'driver' && req.body?.vehicleMakeModel
    ? {
        makeModel: String(req.body.vehicleMakeModel || '').trim() || undefined,
        plateMasked: String(req.body.vehiclePlate || '').trim() || undefined,
        seats: typeof req.body.vehicleSeats === 'number' ? req.body.vehicleSeats : 4,
        color: String(req.body.vehicleColor || '').trim() || undefined,
        colorName: String(req.body.vehicleColorName || '').trim() || undefined,
        vehicleType: (['car', 'moto', 'truck', 'van'].includes(String(req.body.vehicleType || ''))
          ? req.body.vehicleType : 'car') as GoodWheelsUser['vehicle'] extends undefined ? never : NonNullable<GoodWheelsUser['vehicle']>['vehicleType'],
        accessibilityReady: Boolean(req.body.vehicleAccessibility),
      }
    : undefined;

  const newUser: GoodWheelsUser = {
    id,
    email,
    password: hashedPassword,
    role,
    fullName,
    phoneMasked: phone ? phone.replace(/\d(?=\d{4})/g, '*') : '***-***-****',
    trust: {
      trustScore: 50,
      verifiedUser: 'unverified',
      ...(role === 'driver' ? { verifiedDriver: 'unverified', verifiedVehicle: 'unverified' } : {}),
    },
    isOnline: false,
    savedPlaceIds: [],
    assistancePreferences: [],
    familySafeMode: false,
    ...(role === 'driver' && vehicle ? {
      vehicleId: mkId('veh'),
      vehicle,
    } : {}),
  };

  users.push(newUser);
  await writeJsonArray(USERS_FILE, users);

  console.log(`[GoodWheels] Registered new ${role}: ${email} (id=${id}) at ${now}`);
  res.status(201).json({ ok: true, user: publicUser(newUser) });
});

router.post('/auth/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    res.status(400).json({ ok: false, error: 'Email is required' });
    return;
  }
  const users = await loadUsers();
  const user = users.find((u) => (u.email ?? '').toLowerCase() === email) ?? null;
  if (!user) {
    // Always respond OK to prevent email enumeration
    res.json({ ok: true, message: 'If that email is registered, a reset token has been sent.' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  const tokens = await readJsonArray<ResetToken>(RESET_TOKENS_FILE);
  const filtered = tokens.filter((t) => t.userId !== user.id || new Date(t.expiresAt) > new Date());
  filtered.push({ token, userId: user.id, expiresAt });
  await writeJsonArray(RESET_TOKENS_FILE, filtered);

  console.log(`[GoodWheels] Password reset token generated for ${email}: ${token}`);
  res.json({
    ok: true,
    message: 'If that email is registered, a reset token has been sent.',
    // Returned for dev/demo — remove or email this in production
    resetToken: token,
  });
});

router.post('/auth/reset-password', async (req: Request, res: Response): Promise<void> => {
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword || '').trim();
  if (!token || !newPassword) {
    res.status(400).json({ ok: false, error: 'Token and new password are required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' });
    return;
  }

  const tokens = await readJsonArray<ResetToken>(RESET_TOKENS_FILE);
  const record = tokens.find((t) => t.token === token);
  if (!record) {
    res.status(400).json({ ok: false, error: 'Invalid or expired reset token' });
    return;
  }
  if (new Date(record.expiresAt) < new Date()) {
    res.status(400).json({ ok: false, error: 'Reset token has expired. Please request a new one.' });
    return;
  }

  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === record.userId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'User not found' });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  users[idx] = { ...users[idx], password: hashed };
  await writeJsonArray(USERS_FILE, users);

  // Invalidate all reset tokens for this user after use
  const remaining = tokens.filter((t) => t.userId !== record.userId);
  await writeJsonArray(RESET_TOKENS_FILE, remaining);

  res.json({ ok: true, message: 'Password updated. You can now sign in with your new password.' });
});

router.get('/trips/active', async (req: Request, res: Response): Promise<void> => {
  const userId = String(req.query.userId || '').trim();
  const trips = await loadTrips();
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
  const trips = await loadTrips();
  const history = trips
    .filter((t) => (t.passengerId === userId || t.driverId === userId || t.workerId === userId) && ['completed', 'cancelled', 'canceled'].includes(t.status))
    .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
  res.json({ ok: true, trips: history.map(enrichTripEstimate) });
});

router.post('/trips/request', async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};
  const passengerId = String(body.passengerId || '').trim();
  if (!passengerId || !body.pickup || !body.dropoff) {
    res.status(400).json({ ok: false, error: 'passengerId, pickup and dropoff are required' });
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
  const offerStateIn = body.offerState && typeof body.offerState === 'object' ? (body.offerState as Record<string, unknown>) : null;
  const explicitPassenger =
    (typeof offerStateIn?.passengerOfferCents === 'number' &&
    Number.isFinite(offerStateIn.passengerOfferCents as number) &&
    (offerStateIn.passengerOfferCents as number) > 0
      ? Math.round(Number(offerStateIn.passengerOfferCents))
      : 0) ||
    (typeof body.passengerOfferCents === 'number' && Number.isFinite(body.passengerOfferCents) && body.passengerOfferCents > 0
      ? Math.round(Number(body.passengerOfferCents))
      : 0);
  const explicitRecommended =
    (typeof offerStateIn?.recommendedFareCents === 'number' &&
    Number.isFinite(offerStateIn.recommendedFareCents as number) &&
    (offerStateIn.recommendedFareCents as number) > 0
      ? Math.round(Number(offerStateIn.recommendedFareCents))
      : 0) ||
    (typeof body.recommendedFareCents === 'number' && Number.isFinite(body.recommendedFareCents) && body.recommendedFareCents > 0
      ? Math.round(Number(body.recommendedFareCents))
      : 0);

  const heuristicCents = listedFareCentsFromRoute(distanceKm, etaMinutes);

  let totalFareCents =
    typeof estFareIn?.totalFareCents === 'number' && Number.isFinite(estFareIn.totalFareCents) && estFareIn.totalFareCents > 0
      ? Math.round(Number(estFareIn.totalFareCents))
      : typeof body.totalFareCents === 'number' && Number.isFinite(body.totalFareCents) && body.totalFareCents > 0
        ? Math.round(Number(body.totalFareCents))
        : typeof body.fareUsd === 'number' && body.fareUsd > 0
          ? Math.round(body.fareUsd * 100)
          : 0;

  if (explicitPassenger > 0) {
    totalFareCents = explicitPassenger;
  } else if (totalFareCents <= 0) {
    totalFareCents = heuristicCents;
  }

  const recommendedFareCents = explicitRecommended > 0 ? explicitRecommended : heuristicCents;
  const passengerOfferCents = explicitPassenger > 0 ? explicitPassenger : totalFareCents;

  const initialFareSplit = calculateGoodWheelsFareSplit(passengerOfferCents);
  const trip: GoodWheelsTrip = {
    id: tripId,
    passengerId,
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
      totalFareCents: passengerOfferCents,
      currency: 'USD',
      fareSplit: fareSplitToPayload(initialFareSplit),
    },
    routeSummary,
    attachedCause:
      body.attachedCause && typeof body.attachedCause === 'object'
        ? {
            id: String((body.attachedCause as { id?: unknown }).id || ''),
            name: String((body.attachedCause as { name?: unknown }).name || ''),
            category: String((body.attachedCause as { category?: unknown }).category || ''),
            city: String((body.attachedCause as { city?: unknown }).city || ''),
            country: String((body.attachedCause as { country?: unknown }).country || ''),
          }
        : undefined,
    notes:
      typeof body.notes === 'string' && body.notes.trim()
        ? String(body.notes).trim().slice(0, 4000)
        : undefined,
    timeline: [
      { id: mkId('evt'), atIso: now, label: 'Ride requested', detail: 'Passenger created a new ride request.' },
      { id: mkId('evt'), atIso: now, label: 'Ride broadcasted', detail: 'Dispatch signal posted to driver queue.' },
    ],
    chatThreadId,
    offerState: {
      passengerOfferCents,
      recommendedFareCents,
      status: 'passenger_offered',
      updatedAtIso: now,
    },
  };
  const trips = await loadTrips();
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

router.get('/driver/dashboard', async (req: Request, res: Response): Promise<void> => {
  const driverId = String(req.query.driverId || '').trim();
  if (!driverId) {
    res.status(400).json({ ok: false, error: 'driverId is required' });
    return;
  }
  const users = await loadUsers();
  const user = users.find((u) => u.id === driverId) ?? null;
  if (!user) {
    res.status(404).json({ ok: false, error: 'User not found' });
    return;
  }
  const trips = await loadTrips();
  const driverProfile = {
    id: user.id,
    fullName: user.fullName,
    isVerifiedDriver: user.trust.verifiedDriver === 'verified',
    isVerifiedVehicle: user.trust.verifiedVehicle === 'verified',
    availability: (user.isOnline ? 'online' : 'offline') as 'online' | 'offline' | 'busy',
  };
  res.json({ ok: true, ...buildDriverDashboardPayload(trips, driverId, driverProfile) });
});

router.get('/driver/queue', async (req: Request, res: Response): Promise<void> => {
  const trips = await loadTrips();
  const driverId = String(req.query.driverId || '').trim();
  const queue = filterAvailableRequestsForDriver(trips, driverId);
  res.json({ ok: true, queue: queue.map(enrichTripEstimate) });
});

router.get('/driver/profile', async (req: Request, res: Response): Promise<void> => {
  const driverId = String(req.query.driverId || '').trim();
  if (!driverId) {
    res.status(400).json({ ok: false, error: 'driverId is required' });
    return;
  }
  const users = await loadUsers();
  const user = users.find((u) => u.id === driverId && u.role === 'driver');
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
  const trips = await loadTrips();
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
  const users = await loadUsers();
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
  const driverId = String(req.query.driverId || '').trim();
  if (!driverId) {
    res.status(400).json({ ok: false, error: 'driverId is required' });
    return;
  }
  const users = await loadUsers();
  const user = users.find((u) => u.id === driverId && u.role === 'driver');
  if (!user) {
    res.status(404).json({ ok: false, error: 'Driver not found' });
    return;
  }
  if (!user.vehicleId) {
    res.status(404).json({ ok: false, error: 'Driver vehicle is not configured' });
    return;
  }
  res.json({
    ok: true,
    vehicle: {
      id: user.vehicleId,
      makeModel: user.vehicle?.makeModel,
      plateMasked: user.vehicle?.plateMasked,
      seats: user.vehicle?.seats,
      accessibilityReady: Boolean(user.vehicle?.accessibilityReady),
      verification: user.trust.verifiedVehicle === 'verified' ? 'verified' : 'unverified',
      color: user.vehicle?.color,
      colorName: user.vehicle?.colorName,
      vehicleType: user.vehicle?.vehicleType,
    },
  });
});

router.get('/driver/performance', async (req: Request, res: Response): Promise<void> => {
  const driverId = String(req.query.driverId || '').trim();
  if (!driverId) {
    res.status(400).json({ ok: false, error: 'driverId is required' });
    return;
  }
  const trips = await loadTrips();
  const completedTrips = trips.filter((t) => t.driverId === driverId && t.status === 'completed').length;
  res.json({
    ok: true,
    performance: {
      rating: null,
      completedTrips,
      responseTimeSeconds: null,
      trustScore: null,
      safetyCompliance: null,
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
  const users = await loadUsers();
  const driver = users.find((u) => u.id === driverId && u.role === 'driver');
  if (!driver) {
    res.status(404).json({ ok: false, error: 'Driver not found' });
    return;
  }
  const trips = await loadTrips();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Trip not found' });
    return;
  }
  const now = new Date().toISOString();
  const prev = trips[idx];
  if (prev.driverId && prev.driverId !== driverId) {
    res.status(409).json({ ok: false, error: 'Trip already assigned to another driver' });
    return;
  }
  const next: GoodWheelsTrip = {
    ...prev,
    driverId: prev.driverId || driverId,
    negotiationDriverId: undefined,
    acceptedAtIso: now,
    driverResponseState: {
      driverId,
      status: 'accepted',
      lastActionAtIso: now,
    },
    driverSnapshot: {
      id: driver.id,
      fullName: driver.fullName,
      vehicle: driver.vehicle
        ? {
            makeModel: driver.vehicle.makeModel,
            plateMasked: driver.vehicle.plateMasked,
            colorName: driver.vehicle.colorName,
            seats: driver.vehicle.seats,
            verification: driver.trust.verifiedVehicle,
            vehicleType: driver.vehicle.vehicleType,
          }
        : undefined,
      trust: {
        verifiedDriver: driver?.trust?.verifiedDriver,
        verifiedVehicle: driver?.trust?.verifiedVehicle,
      },
    },
    status: 'accepted',
    updatedAtIso: now,
    driverLocation: driver.lastKnownLocation
      ? {
          lat: driver.lastKnownLocation.lat,
          lng: driver.lastKnownLocation.lng,
          heading: driver.lastKnownLocation.heading,
          updatedAtIso: driver.lastKnownLocation.updatedAtIso,
        }
      : prev.driverLocation,
    routeProgress: { currentLeg: 'to_pickup' },
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

router.post('/trips/:tripId/counteroffer', async (req: Request, res: Response): Promise<void> => {
  const tripId = String(req.params.tripId || '').trim();
  const driverId = String(req.body?.driverId || '').trim();
  const amountCentsRaw = req.body?.amountCents;
  const amountCents =
    typeof amountCentsRaw === 'number' && Number.isFinite(amountCentsRaw) ? Math.round(Number(amountCentsRaw)) : 0;
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 500) : '';
  if (!tripId || !driverId || amountCents <= 0) {
    res.status(400).json({ ok: false, error: 'tripId, driverId, and positive amountCents are required' });
    return;
  }
  const users = await loadUsers();
  const driver = users.find((u) => u.id === driverId && u.role === 'driver');
  if (!driver) {
    res.status(404).json({ ok: false, error: 'Driver not found' });
    return;
  }
  const trips = await loadTrips();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Trip not found' });
    return;
  }
  const prev = trips[idx];
  if (!['requested', 'broadcasted', 'matched'].includes(prev.status)) {
    res.status(400).json({ ok: false, error: 'Trip is not open for counteroffers' });
    return;
  }
  if (prev.negotiationDriverId && prev.negotiationDriverId !== driverId) {
    res.status(409).json({ ok: false, error: 'Another driver is negotiating this trip' });
    return;
  }
  const now = new Date().toISOString();
  const enriched = enrichTripEstimate(prev);
  const basePassenger =
    enriched.offerState?.passengerOfferCents ??
    (typeof enriched.estimate?.totalFareCents === 'number' ? enriched.estimate.totalFareCents : amountCents);
  const recommended =
    enriched.offerState?.recommendedFareCents ??
    (typeof enriched.estimate?.totalFareCents === 'number' ? enriched.estimate.totalFareCents : amountCents);
  const offerState: GoodWheelsTripOfferState = {
    passengerOfferCents: basePassenger,
    recommendedFareCents: recommended,
    driverCounterOfferCents: amountCents,
    acceptedFareCents: enriched.offerState?.acceptedFareCents,
    status: 'driver_countered',
    updatedAtIso: now,
  };
  const detailParts = [`Driver counteroffer: $${(amountCents / 100).toFixed(2)}`];
  if (message) detailParts.push(message);
  const next: GoodWheelsTrip = {
    ...prev,
    updatedAtIso: now,
    negotiationDriverId: driverId,
    driverResponseState: { driverId, status: 'countered', lastActionAtIso: now },
    offerState,
    chatThreadId: prev.chatThreadId || `good-wheels-trip-${prev.id}`,
    timeline: [
      ...prev.timeline,
      {
        id: mkId('evt'),
        atIso: now,
        label: 'Driver sent counteroffer',
        detail: detailParts.join(' — '),
      },
    ],
  };
  trips[idx] = next;
  await writeJsonArray(TRIPS_FILE, trips);
  res.json({ ok: true, trip: enrichTripEstimate(next) });
});

/** Passenger accepts the driver's counter-offer fare, or declines it and keeps their original offer in the pool. */
router.post('/trips/:tripId/passenger-offer-response', async (req: Request, res: Response): Promise<void> => {
  const tripId = String(req.params.tripId || '').trim();
  const passengerId = String(req.body?.passengerId || '').trim();
  const action = String(req.body?.action || '').trim();
  if (!tripId || !passengerId || !['accept_driver_counter', 'keep_passenger_offer'].includes(action)) {
    res.status(400).json({ ok: false, error: 'tripId, passengerId, and action (accept_driver_counter | keep_passenger_offer) are required' });
    return;
  }
  const trips = await loadTrips();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Trip not found' });
    return;
  }
  const prev = trips[idx];
  if (prev.passengerId !== passengerId) {
    res.status(403).json({ ok: false, error: 'Not authorized for this trip' });
    return;
  }
  if (!['requested', 'broadcasted', 'matched'].includes(prev.status)) {
    res.status(400).json({ ok: false, error: 'Trip is not open for offer responses' });
    return;
  }
  if (prev.offerState?.status !== 'driver_countered') {
    res.status(400).json({ ok: false, error: 'No pending driver counteroffer' });
    return;
  }
  const counterCents =
    typeof prev.offerState.driverCounterOfferCents === 'number' && Number.isFinite(prev.offerState.driverCounterOfferCents)
      ? Math.round(prev.offerState.driverCounterOfferCents)
      : 0;
  const negotiationDriverId = prev.negotiationDriverId;
  if (!negotiationDriverId || counterCents <= 0) {
    res.status(400).json({ ok: false, error: 'Invalid negotiation state' });
    return;
  }
  const now = new Date().toISOString();

  if (action === 'accept_driver_counter') {
    const offerState: GoodWheelsTripOfferState = {
      passengerOfferCents: prev.offerState.passengerOfferCents,
      recommendedFareCents: prev.offerState.recommendedFareCents,
      driverCounterOfferCents: counterCents,
      acceptedFareCents: counterCents,
      status: 'accepted',
      updatedAtIso: now,
    };
    const next: GoodWheelsTrip = {
      ...prev,
      updatedAtIso: now,
      negotiationDriverId,
      offerState,
      timeline: [
        ...prev.timeline,
        {
          id: mkId('evt'),
          atIso: now,
          label: 'Passenger accepted counteroffer',
          detail: `Agreed fare $${(counterCents / 100).toFixed(2)}`,
        },
      ],
    };
    trips[idx] = next;
    await writeJsonArray(TRIPS_FILE, trips);
    res.json({ ok: true, trip: enrichTripEstimate(next) });
    return;
  }

  const offerState: GoodWheelsTripOfferState | undefined = prev.offerState
    ? {
        passengerOfferCents: prev.offerState.passengerOfferCents,
        recommendedFareCents: prev.offerState.recommendedFareCents,
        status: 'passenger_offered',
        updatedAtIso: now,
      }
    : undefined;
  const next: GoodWheelsTrip = {
    ...prev,
    updatedAtIso: now,
    negotiationDriverId: undefined,
    offerState,
    driverResponseState: undefined,
    timeline: [
      ...prev.timeline,
      {
        id: mkId('evt'),
        atIso: now,
        label: 'Passenger kept their offer',
        detail: 'Driver counteroffer was not accepted; request returned to the driver pool.',
      },
    ],
  };
  trips[idx] = next;
  await writeJsonArray(TRIPS_FILE, trips);
  res.json({ ok: true, trip: enrichTripEstimate(next) });
});

router.post('/trips/:tripId/offer/close', async (req: Request, res: Response): Promise<void> => {
  const tripId = String(req.params.tripId || '').trim();
  const passengerId = String(req.body?.passengerId || '').trim();
  const reason = String(req.body?.reason || 'Passenger closed negotiation').trim();
  if (!tripId || !passengerId) {
    res.status(400).json({ ok: false, error: 'tripId and passengerId are required' });
    return;
  }
  const trips = await loadTrips();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Trip not found' });
    return;
  }
  const prev = trips[idx];
  if (prev.passengerId !== passengerId) {
    res.status(403).json({ ok: false, error: 'Not authorized for this trip' });
    return;
  }
  if (['completed', 'cancelled', 'canceled'].includes(prev.status)) {
    res.status(400).json({ ok: false, error: 'Trip already closed' });
    return;
  }
  const now = new Date().toISOString();
  const next: GoodWheelsTrip = {
    ...prev,
    status: 'cancelled',
    updatedAtIso: now,
    closedAtIso: now,
    cancelledAtIso: now,
    cancelReason: reason,
    cancelledByRole: 'passenger',
    cancelledByUserId: passengerId,
    negotiationDriverId: undefined,
    driverResponseState: undefined,
    offerState: prev.offerState
      ? {
          ...prev.offerState,
          status: 'cancelled_by_passenger',
          updatedAtIso: now,
        }
      : {
          status: 'cancelled_by_passenger',
          updatedAtIso: now,
        },
    timeline: [
      ...prev.timeline,
      {
        id: mkId('evt'),
        atIso: now,
        label: 'Passenger closed negotiation',
        detail: reason,
      },
    ],
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

router.post('/trips/:tripId/reject-driver', async (req: Request, res: Response): Promise<void> => {
  const tripId = String(req.params.tripId || '').trim();
  const driverId = String(req.body?.driverId || '').trim();
  if (!tripId || !driverId) {
    res.status(400).json({ ok: false, error: 'tripId and driverId are required' });
    return;
  }
  const trips = await loadTrips();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Trip not found' });
    return;
  }
  const now = new Date().toISOString();
  const prev = trips[idx];
  if (!['requested', 'broadcasted', 'matched'].includes(prev.status)) {
    res.status(400).json({ ok: false, error: 'Trip is not open for driver rejection' });
    return;
  }
  const rejected = [...(prev.rejectedDriverIds ?? [])];
  if (!rejected.includes(driverId)) rejected.push(driverId);

  let negotiationDriverId = prev.negotiationDriverId;
  let offerState = prev.offerState;
  if (prev.negotiationDriverId === driverId && prev.offerState?.status === 'driver_countered') {
    negotiationDriverId = undefined;
    offerState = prev.offerState
      ? {
          passengerOfferCents: prev.offerState.passengerOfferCents,
          recommendedFareCents: prev.offerState.recommendedFareCents,
          acceptedFareCents: prev.offerState.acceptedFareCents,
          status: 'passenger_offered',
          updatedAtIso: now,
        }
      : undefined;
  }

  const next: GoodWheelsTrip = {
    ...prev,
    updatedAtIso: now,
    rejectedDriverIds: rejected,
    negotiationDriverId,
    offerState,
    driverResponseState: { driverId, status: 'rejected', lastActionAtIso: now },
    timeline: [
      ...prev.timeline,
      {
        id: mkId('evt'),
        atIso: now,
        label: 'Driver declined request',
        detail: 'This driver will not be shown this open request again.',
      },
    ],
  };
  trips[idx] = next;
  await writeJsonArray(TRIPS_FILE, trips);
  res.json({ ok: true, trip: enrichTripEstimate(next) });
});

router.patch('/trips/:tripId/driver-location', async (req: Request, res: Response): Promise<void> => {
  const tripId = String(req.params.tripId || '').trim();
  const driverId = String(req.body?.driverId || '').trim();
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const headingRaw = req.body?.heading;
  const heading = typeof headingRaw === 'number' && Number.isFinite(headingRaw) ? Number(headingRaw) : undefined;
  if (!tripId || !driverId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ ok: false, error: 'tripId, driverId, lat and lng are required' });
    return;
  }
  const trips = await loadTrips();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: 'Trip not found' });
    return;
  }
  const prev = trips[idx];
  if (prev.driverId !== driverId) {
    res.status(403).json({ ok: false, error: 'Driver not assigned to this trip' });
    return;
  }
  const allowed = new Set(['accepted', 'driver_en_route', 'driver_arriving', 'driver_arrived', 'arrived', 'passenger_onboard', 'in_progress', 'support_in_progress']);
  if (!allowed.has(prev.status)) {
    res.status(400).json({ ok: false, error: 'Trip status does not allow location updates' });
    return;
  }
  const now = new Date().toISOString();
  const next: GoodWheelsTrip = {
    ...prev,
    updatedAtIso: now,
    driverLocation: {
      lat,
      lng,
      heading,
      updatedAtIso: now,
    },
    routeProgress: {
      ...(prev.routeProgress ?? {}),
      currentLeg: legForStatus(prev.status),
    },
  };
  trips[idx] = next;
  await writeJsonArray(TRIPS_FILE, trips);

  const users = await loadUsers();
  const ui = users.findIndex((u) => u.id === driverId && u.role === 'driver');
  if (ui >= 0) {
    users[ui] = {
      ...users[ui],
      lastKnownLocation: { lat, lng, heading, updatedAtIso: now },
    };
    await writeJsonArray(USERS_FILE, users);
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
  const trips = await loadTrips();
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
  if (['accepted', 'driver_en_route', 'driver_arriving', 'driver_arrived', 'arrived', 'passenger_onboard', 'in_progress', 'support_in_progress'].includes(status)) {
    next.routeProgress = {
      ...(prev.routeProgress ?? {}),
      currentLeg: legForStatus(status),
    };
  }
  if (status === 'completed') {
    next.completedAtIso = now;
    next.cancelledAtIso = undefined;
    next.cancelReason = undefined;
  }
  if (status === 'cancelled') {
    next.cancelledAtIso = now;
    next.cancelReason = timelineDetail || 'Cancelled';
    next.completedAtIso = undefined;
    next.negotiationDriverId = undefined;
    if (next.offerState) {
      next.offerState = {
        ...next.offerState,
        status: 'cancelled_by_passenger',
        updatedAtIso: now,
      };
    }
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
  const actorRoleRaw = String(req.body?.actorRole || '').trim().toLowerCase();
  const actorRole: GoodWheelsTrip['cancelledByRole'] =
    actorRoleRaw === 'driver' || actorRoleRaw === 'passenger' ? actorRoleRaw : 'system';
  const actorUserId = String(req.body?.actorUserId || '').trim() || undefined;
  const reason = String(req.body?.reason || 'Cancelled by rider/driver');
  const trips = await loadTrips();
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
        detail:
          actorRole === 'driver'
            ? `Driver cancelled: ${reason}`
            : actorRole === 'passenger'
              ? `Passenger cancelled: ${reason}`
              : reason,
      },
    ],
    cancelledAtIso: now,
    cancelReason: reason,
    cancelledByRole: actorRole,
    cancelledByUserId: actorUserId,
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
  const trips = await loadTrips();
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
