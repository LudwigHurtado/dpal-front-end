import { buildApiUrl } from '../../../config/api';
import type { Role } from '../../types/role';
import type { RideRequestDraft, Trip } from '../../types/ride';
import type { UserProfile } from '../../types/user';
import { mapMockTripToTrip } from '../../features/trips/tripMockMapper';
import { mapGoodWheelsApiUser } from './goodWheelsUserMapper';

async function parseJson<T>(res: Response): Promise<T> {
  const raw = await res.text();
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Some edge/runtime failures return plain text or HTML.
    // Surface a readable error payload instead of a JSON parse crash.
    return ({ error: raw.slice(0, 320) } as unknown) as T;
  }
}

async function postJsonWithAlias(
  primaryPath: string,
  aliasPath: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const options: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };

  const first = await fetch(buildApiUrl(primaryPath), options);
  if (first.ok) return first;

  if (first.status === 404 || first.status === 405 || first.status >= 500) {
    const second = await fetch(buildApiUrl(aliasPath), options);
    if (second.ok) return second;
    return second;
  }

  return first;
}

export const goodWheelsAuthApi = {
  async signIn(email: string, password: string): Promise<{ user: UserProfile }> {
    const res = await postJsonWithAlias('/api/good-wheels/auth/signin', '/api/good-wheels/auth/sign-in', {
      email,
      password,
    });
    const data = await parseJson<{ ok?: boolean; user?: unknown; error?: string }>(res);
    if (!res.ok || data.ok === false || data.user == null) {
      throw new Error(data.error || `Sign in failed (${res.status})`);
    }
    return { user: mapGoodWheelsApiUser(data.user) };
  },

  async signOut(): Promise<void> {
    const res = await fetch(buildApiUrl('/api/good-wheels/auth/signout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Sign out failed (${res.status})`);
  },

  async switchRole(role: Role): Promise<{ user: UserProfile }> {
    const res = await fetch(buildApiUrl('/api/good-wheels/auth/switch-role'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await parseJson<{ ok?: boolean; user?: unknown; error?: string }>(res);
    if (!res.ok || data.ok === false || data.user == null) {
      throw new Error(data.error || `Role switch failed (${res.status})`);
    }
    return { user: mapGoodWheelsApiUser(data.user) };
  },
};

export const goodWheelsRideApi = {
  async getActiveTrip(userId: string): Promise<Trip | null> {
    const url = new URL(buildApiUrl('/api/good-wheels/trips/active'));
    url.searchParams.set('userId', userId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Active trip fetch failed (${res.status})`);
    const data = await parseJson<{ trip: unknown | null }>(res);
    return data.trip ? mapMockTripToTrip(data.trip) : null;
  },

  async listHistory(userId: string): Promise<Trip[]> {
    const url = new URL(buildApiUrl('/api/good-wheels/trips/history'));
    url.searchParams.set('userId', userId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`History fetch failed (${res.status})`);
    const data = await parseJson<{ trips?: unknown[] }>(res);
    return Array.isArray(data.trips) ? data.trips.map(mapMockTripToTrip) : [];
  },

  async requestRide(draft: RideRequestDraft): Promise<Trip> {
    const passengerCents =
      typeof draft.passengerOfferCents === 'number' && draft.passengerOfferCents > 0
        ? Math.round(draft.passengerOfferCents)
        : undefined;
    const recommendedCents =
      typeof draft.recommendedFareCents === 'number' && draft.recommendedFareCents > 0
        ? Math.round(draft.recommendedFareCents)
        : undefined;
    const nowIso = new Date().toISOString();
    const res = await fetch(buildApiUrl('/api/good-wheels/trips/request'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passengerId: draft.passengerId || 'usr-passenger-001',
        pickup: draft.pickup,
        dropoff: draft.dropoff,
        purpose: draft.purpose,
        supportCategoryId: draft.supportCategoryId,
        familySafe: draft.familySafe,
        estimate: draft.estimatePreview
          ? {
              ...draft.estimatePreview,
              ...(passengerCents != null ? { totalFareCents: passengerCents } : {}),
            }
          : passengerCents != null
            ? { totalFareCents: passengerCents }
            : undefined,
        routeSummary: draft.routeSummaryPreview,
        attachedCause: draft.attachedCause,
        passengerOfferCents: passengerCents,
        recommendedFareCents: recommendedCents,
        totalFareCents: passengerCents,
        offerState:
          passengerCents != null
            ? {
                passengerOfferCents: passengerCents,
                recommendedFareCents: recommendedCents ?? passengerCents,
                status: 'passenger_offered',
                updatedAtIso: nowIso,
              }
            : undefined,
      }),
    });
    if (!res.ok) throw new Error(`Request trip failed (${res.status})`);
    const data = await parseJson<{ trip: unknown }>(res);
    return mapMockTripToTrip(data.trip);
  },

  async acceptTrip(tripId: string, driverId: string): Promise<Trip> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/trips/${encodeURIComponent(tripId)}/accept`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
    if (!res.ok) throw new Error(`Accept trip failed (${res.status})`);
    const data = await parseJson<{ trip: unknown }>(res);
    return mapMockTripToTrip(data.trip);
  },

  async sendTripCounteroffer(tripId: string, driverId: string, amountCents: number, message?: string): Promise<Trip> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/trips/${encodeURIComponent(tripId)}/counteroffer`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, amountCents, message }),
    });
    if (!res.ok) throw new Error(`Counteroffer failed (${res.status})`);
    const data = await parseJson<{ trip: unknown }>(res);
    return mapMockTripToTrip(data.trip);
  },

  async passengerRespondToDriverCounter(
    tripId: string,
    passengerId: string,
    action: 'accept_driver_counter' | 'keep_passenger_offer',
  ): Promise<Trip> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/trips/${encodeURIComponent(tripId)}/passenger-offer-response`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passengerId, action }),
    });
    if (!res.ok) throw new Error(`Offer response failed (${res.status})`);
    const data = await parseJson<{ trip: unknown }>(res);
    return mapMockTripToTrip(data.trip);
  },

  async closeTripOffer(tripId: string, passengerId: string, reason?: string): Promise<Trip> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/trips/${encodeURIComponent(tripId)}/offer/close`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passengerId, reason }),
    });
    if (!res.ok) throw new Error(`Close negotiation failed (${res.status})`);
    const data = await parseJson<{ trip: unknown }>(res);
    return mapMockTripToTrip(data.trip);
  },

  async updateDriverLocation(
    tripId: string,
    input: { driverId: string; lat: number; lng: number; heading?: number },
  ): Promise<Trip> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/trips/${encodeURIComponent(tripId)}/driver-location`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Driver location update failed (${res.status})`);
    const data = await parseJson<{ trip: unknown }>(res);
    return mapMockTripToTrip(data.trip);
  },

  async updateTripStatus(tripId: string, status: Trip['status'], timelineLabel?: string, timelineDetail?: string): Promise<Trip> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/trips/${encodeURIComponent(tripId)}/status`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, timelineLabel, timelineDetail }),
    });
    if (!res.ok) throw new Error(`Update status failed (${res.status})`);
    const data = await parseJson<{ trip: unknown }>(res);
    return mapMockTripToTrip(data.trip);
  },

  async cancelTrip(tripId: string, reason?: string): Promise<Trip> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/trips/${encodeURIComponent(tripId)}/cancel`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error(`Cancel trip failed (${res.status})`);
    const data = await parseJson<{ trip: unknown }>(res);
    return mapMockTripToTrip(data.trip);
  },

  async completeTrip(tripId: string, note?: string): Promise<Trip> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/trips/${encodeURIComponent(tripId)}/complete`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error(`Complete trip failed (${res.status})`);
    const data = await parseJson<{ trip: unknown }>(res);
    return mapMockTripToTrip(data.trip);
  },
};

export const goodWheelsDriverApi = {
  async fetchProfile(driverId = 'usr-driver-001'): Promise<{
    id: string;
    fullName: string;
    isVerifiedDriver: boolean;
    isVerifiedVehicle: boolean;
    availability?: 'online' | 'offline' | 'busy';
  }> {
    const url = new URL(buildApiUrl('/api/good-wheels/driver/profile'));
    url.searchParams.set('driverId', driverId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Driver profile failed (${res.status})`);
    const data = await parseJson<{ profile: { id: string; fullName: string; isVerifiedDriver: boolean; isVerifiedVehicle: boolean; availability?: 'online' | 'offline' | 'busy' } }>(res);
    return data.profile;
  },

  async fetchQueue(driverId?: string): Promise<Trip[]> {
    const url = new URL(buildApiUrl('/api/good-wheels/driver/queue'));
    if (driverId) url.searchParams.set('driverId', driverId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Driver queue failed (${res.status})`);
    const data = await parseJson<{ queue?: unknown[] }>(res);
    return Array.isArray(data.queue) ? data.queue.map(mapMockTripToTrip) : [];
  },

  async fetchDriverDashboard(driverId: string): Promise<{
    driver: { id: string; fullName: string; isVerifiedDriver: boolean; isVerifiedVehicle: boolean; availability?: string };
    availability: string;
    activeTrip: unknown | null;
    pendingDeals: unknown[];
    counteredDeals: unknown[];
    availableRequests: unknown[];
    recentCompletedTrips: unknown[];
    summary: {
      availableCount: number;
      pendingDealCount: number;
      activeTripStatus: string | null;
      completedToday: number;
      completedTrips: number;
    };
  }> {
    const url = new URL(buildApiUrl('/api/good-wheels/driver/dashboard'));
    url.searchParams.set('driverId', driverId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Driver dashboard failed (${res.status})`);
    return parseJson(res);
  },

  async rejectTripForDriver(tripId: string, driverId: string): Promise<Trip> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/trips/${encodeURIComponent(tripId)}/reject-driver`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
    if (!res.ok) throw new Error(`Reject trip failed (${res.status})`);
    const data = await parseJson<{ trip: unknown }>(res);
    return mapMockTripToTrip(data.trip);
  },

  async fetchHistory(driverId: string): Promise<Trip[]> {
    const url = new URL(buildApiUrl('/api/good-wheels/driver/history'));
    url.searchParams.set('driverId', driverId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Driver history failed (${res.status})`);
    const data = await parseJson<{ history?: unknown[] }>(res);
    return Array.isArray(data.history) ? data.history.map(mapMockTripToTrip) : [];
  },

  async updateAvailability(driverId: string, status: string): Promise<void> {
    const wireStatus = status === 'paused' ? 'offline' : status;
    const res = await fetch(buildApiUrl('/api/good-wheels/driver/availability'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, status: wireStatus }),
    });
    if (!res.ok) throw new Error(`Driver availability failed (${res.status})`);
  },

  async fetchVehicle(driverId = 'usr-driver-001'): Promise<{
    id: string;
    makeModel: string;
    plateMasked: string;
    seats: number;
    accessibilityReady: boolean;
    verification: 'verified' | 'pending' | 'unverified';
    color: string;
    colorName: string;
    vehicleType: 'car' | 'moto' | 'truck' | 'van';
  }> {
    const url = new URL(buildApiUrl('/api/good-wheels/driver/vehicle'));
    url.searchParams.set('driverId', driverId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Driver vehicle failed (${res.status})`);
    const data = await parseJson<{ vehicle: any }>(res);
    return data.vehicle;
  },

  async fetchPerformance(driverId = 'usr-driver-001'): Promise<{
    rating: number;
    completedTrips: number;
    responseTimeSeconds: number;
    trustScore: number;
    safetyCompliance: 'good' | 'needs_attention';
  }> {
    const url = new URL(buildApiUrl('/api/good-wheels/driver/performance'));
    url.searchParams.set('driverId', driverId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Driver performance failed (${res.status})`);
    const data = await parseJson<{ performance: any }>(res);
    return data.performance;
  },
};
