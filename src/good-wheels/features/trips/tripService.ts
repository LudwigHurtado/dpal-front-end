import type { RideRequestDraft, Trip } from './tripTypes';
import { goodWheelsRideApi } from '../../services/adapters/goodWheelsApi';

/** Service boundary for live Good Wheels trips. */
export const tripService = {
  async getActiveTrip(userId: string): Promise<Trip | null> {
    return goodWheelsRideApi.getActiveTrip(userId);
  },
  async listHistory(userId: string): Promise<Trip[]> {
    return goodWheelsRideApi.listHistory(userId);
  },
  async requestTrip(draft: RideRequestDraft): Promise<Trip> {
    return goodWheelsRideApi.requestRide(draft);
  },
};

