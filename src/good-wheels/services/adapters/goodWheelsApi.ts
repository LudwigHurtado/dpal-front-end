import { buildApiUrl } from '../../../config/api';
import type { Role } from '../../types/role';
import type { RideRequestDraft, Trip } from '../../types/ride';
import type { UserProfile } from '../../types/user';
import { mapMockTripToTrip } from '../../features/trips/tripMockMapper';
import { mapGoodWheelsApiUser } from './goodWheelsUserMapper';

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export const goodWheelsAuthApi = {
  async signIn(email: string, password: string): Promise<{ user: UserProfile }> {
    const res = await fetch(buildApiUrl('/api/good-wheels/auth/signin'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
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
        estimate: draft.estimatePreview,
        routeSummary: draft.routeSummaryPreview,
        attachedCause: draft.attachedCause,
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

  async fetchQueue(): Promise<Trip[]> {
    const res = await fetch(buildApiUrl('/api/good-wheels/driver/queue'));
    if (!res.ok) throw new Error(`Driver queue failed (${res.status})`);
    const data = await parseJson<{ queue?: unknown[] }>(res);
    return Array.isArray(data.queue) ? data.queue.map(mapMockTripToTrip) : [];
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
    const res = await fetch(buildApiUrl('/api/good-wheels/driver/availability'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, status }),
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
