import { goodWheelsRideAdapter } from './adapters/goodWheelsRideAdapter';
import type { RideDraftInput, RideLifecycleStatus, RideRequest } from '../types/rideConnection';

export const goodWheelsRideService = {
  createRide(input: { passengerId: string; passengerName: string; draft: RideDraftInput }): Promise<RideRequest> {
    return goodWheelsRideAdapter.createRide(input);
  },
  listOpenRides(): Promise<RideRequest[]> {
    return goodWheelsRideAdapter.listOpenRides();
  },
  getRideById(rideId: string): Promise<RideRequest | null> {
    return goodWheelsRideAdapter.getRideById(rideId);
  },
  acceptRide(rideId: string, driverId: string, driverName: string): Promise<RideRequest | null> {
    return goodWheelsRideAdapter.acceptRide(rideId, driverId, driverName);
  },
  updateStatus(rideId: string, status: RideLifecycleStatus, actorId: string): Promise<RideRequest | null> {
    return goodWheelsRideAdapter.updateRideStatus(rideId, status, actorId);
  },
  patchRide(rideId: string, patch: Partial<RideRequest>): Promise<RideRequest | null> {
    return goodWheelsRideAdapter.patchRide(rideId, patch);
  },
};

