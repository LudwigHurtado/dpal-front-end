import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import { mockRideApi } from '../../services/adapters/mockAdapters';
import type { RideRequestDraft, Trip } from './tripTypes';
import { mapMockTripToTrip } from './tripMockMapper';

/**
 * Service boundary for trips.
 * For now it uses the mock adapter; later swap to an API adapter with same signatures.
 */
export const tripService = {
  async getActiveTrip(userId: string): Promise<Trip | null> {
    const api = GOOD_WHEELS_DEMO_MODE ? mockRideApi : mockRideApi;
    const raw = await api.getActiveTrip(userId);
    return raw ? mapMockTripToTrip(raw) : null;
  },
  async listHistory(userId: string): Promise<Trip[]> {
    const api = GOOD_WHEELS_DEMO_MODE ? mockRideApi : mockRideApi;
    const raw = await api.listHistory(userId);
    return raw.map((t) => mapMockTripToTrip(t));
  },
  async requestTrip(draft: RideRequestDraft): Promise<Trip> {
    const api = GOOD_WHEELS_DEMO_MODE ? mockRideApi : mockRideApi;
    const raw = await api.requestRide(draft);
    return mapMockTripToTrip(raw);
  },
};

