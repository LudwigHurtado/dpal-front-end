import type { RideRequest } from '../types/rideConnection';

export const goodWheelsMatchingService = {
  // API-ready seam: this can be replaced by backend dispatch logic.
  async getCandidateEtaMinutes(ride: RideRequest): Promise<number> {
    const base = Math.max(4, Math.round(ride.estimatedDuration * 0.35));
    return base;
  },
  async getDriverDistanceKm(ride: RideRequest): Promise<number> {
    return Number(Math.max(0.8, ride.estimatedDistance * 0.25).toFixed(1));
  },
};

