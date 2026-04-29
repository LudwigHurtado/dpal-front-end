import React from 'react';
import type { RideRequest } from '../../../types/rideConnection';
import LegacyTripMapPanel from '../../trips/components/TripMapPanel';
import type { Trip } from '../../trips/tripTypes';

const normalizeStatus = (status: RideRequest['status']): Trip['status'] => {
  if (status === 'matching') return 'requested';
  if (status === 'disputed') return 'escalated';
  return status;
};

const mapRideToLegacyTrip = (ride: RideRequest): Trip => ({
  id: ride.id,
  passengerId: ride.passengerId,
  driverId: ride.driverId,
  pickup: { label: 'Pickup', addressLine: ride.pickupAddress, point: { lat: ride.pickupLat, lng: ride.pickupLng } },
  dropoff: { label: 'Destination', addressLine: ride.destinationAddress, point: { lat: ride.destinationLat, lng: ride.destinationLng } },
  purpose: 'normal_ride',
  status: normalizeStatus(ride.status),
  createdAtIso: ride.requestedAt,
  updatedAtIso: ride.completedAt ?? ride.startedAt ?? ride.acceptedAt ?? ride.requestedAt,
  timeline: [],
  estimate: { etaMinutes: ride.estimatedDuration, distanceKm: ride.estimatedDistance },
});

const TripMapPanel: React.FC<{ ride: RideRequest }> = ({ ride }) => {
  const legacyTrip = mapRideToLegacyTrip(ride);
  return <LegacyTripMapPanel trip={legacyTrip} variant={ride.driverId ? 'driver' : 'passenger'} />;
};

export default TripMapPanel;

