import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import { mockRideApi } from '../../services/adapters/mockAdapters';
import type { RideRequestDraft, Trip } from './tripTypes';

/**
 * Service boundary for trips.
 * For now it uses the mock adapter; later swap to an API adapter with same signatures.
 */
export const tripService = {
  async getActiveTrip(userId: string): Promise<Trip | null> {
    const api = GOOD_WHEELS_DEMO_MODE ? mockRideApi : mockRideApi;
    return api.getActiveTrip(userId);
  },
  async listHistory(userId: string): Promise<Trip[]> {
    const api = GOOD_WHEELS_DEMO_MODE ? mockRideApi : mockRideApi;
    return api.listHistory(userId);
  },
  async requestTrip(draft: RideRequestDraft): Promise<Trip> {
    const api = GOOD_WHEELS_DEMO_MODE ? mockRideApi : mockRideApi;
    return api.requestRide(draft);
  },
};

