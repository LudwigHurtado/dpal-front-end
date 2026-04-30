import { mockDelay } from '../mockDelay';
import { MOCK_USERS } from '../../data/mock/mockUsers';
import type { Role } from '../../types/role';
import type { UserProfile } from '../../types/user';
import type { RideRequestDraft, Trip } from '../../types/ride';
import { calculateGoodWheelsFareSplit, fareSplitToPayload } from '../../features/trips/utils/fareSplit';

export const mockAuthApi = {
  async signIn(email: string, _password: string): Promise<{ user: UserProfile }> {
    await mockDelay(450);
    const e = email.trim().toLowerCase();
    if (e === 'driver@goodwheels.test' || e.startsWith('driver')) return { user: MOCK_USERS.driver };
    return { user: MOCK_USERS.passenger };
  },
  async signOut(): Promise<void> {
    await mockDelay(150);
  },
  async switchRole(role: Role): Promise<{ user: UserProfile }> {
    await mockDelay(250);
    if (role === 'driver') return { user: MOCK_USERS.driver };
    if (role === 'worker') return { user: MOCK_USERS.worker };
    return { user: MOCK_USERS.passenger };
  },
};

export const mockRideApi = {
  async getActiveTrip(_userId: string): Promise<Trip | null> {
    await mockDelay(300);
    // Start passengers/drivers with a clean slate in demo mode.
    return null;
  },
  async listHistory(_userId: string): Promise<Trip[]> {
    await mockDelay(300);
    // Demo mode should not preload synthetic history activity.
    return [];
  },
  async requestRide(draft: RideRequestDraft): Promise<Trip> {
    await mockDelay(650);
    const dist = draft.estimatePreview?.distanceKm ?? 4.8;
    const eta = draft.estimatePreview?.etaMinutes ?? 8;
    const pCents =
      typeof draft.passengerOfferCents === 'number' && draft.passengerOfferCents > 0
        ? Math.round(draft.passengerOfferCents)
        : undefined;
    const rCents =
      typeof draft.recommendedFareCents === 'number' && draft.recommendedFareCents > 0
        ? Math.round(draft.recommendedFareCents)
        : pCents;
    const gross = pCents ?? rCents ?? 800;
    const split = calculateGoodWheelsFareSplit(gross);
    const now = new Date().toISOString();
    const pickup = draft.pickup ?? { label: 'Pickup', addressLine: 'Pickup location' };
    const dropoff = draft.dropoff ?? { label: 'Dropoff', addressLine: 'Dropoff location' };
    return {
      id: `trip-mock-${Date.now()}`,
      passengerId: draft.passengerId || 'usr-passenger-001',
      pickup,
      dropoff,
      purpose: draft.purpose ?? 'normal_ride',
      supportCategoryId: draft.supportCategoryId,
      status: 'broadcasted',
      safetyStatus: draft.familySafe ? 'family_safe' : 'standard',
      createdAtIso: now,
      updatedAtIso: now,
      estimate: {
        etaMinutes: eta,
        distanceKm: dist,
        totalFareCents: gross,
        currency: 'USD',
        fareSplit: fareSplitToPayload(split),
      },
      routeSummary: draft.routeSummaryPreview
        ? {
            distanceKm: draft.routeSummaryPreview.distanceKm,
            durationMinutes: draft.routeSummaryPreview.durationMinutes,
            previewSteps: draft.routeSummaryPreview.previewSteps,
          }
        : undefined,
      timeline: [{ id: `evt-${Date.now()}`, atIso: now, label: 'Ride requested', detail: 'Mock trip created' }],
      offerState: {
        passengerOfferCents: gross,
        recommendedFareCents: rCents ?? gross,
        status: 'passenger_offered',
        updatedAtIso: now,
      },
    };
  },
};

