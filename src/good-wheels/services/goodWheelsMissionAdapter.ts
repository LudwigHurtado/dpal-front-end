import type { RideRequest } from '../types/rideConnection';

export type MissionAssignmentCandidate = {
  missionType: 'transport_support';
  title: string;
  summary: string;
  location: { lat: number; lng: number; address: string };
  rewardPoints: number;
  metadata: Record<string, string>;
};

export const goodWheelsMissionAdapter = {
  toMissionCandidate(ride: RideRequest): MissionAssignmentCandidate {
    return {
      missionType: 'transport_support',
      title: `Good Wheels trip ${ride.id}`,
      summary: `${ride.ridePurpose.replaceAll('_', ' ')} for ${ride.passengerName}`,
      location: {
        lat: ride.pickupLat,
        lng: ride.pickupLng,
        address: ride.pickupAddress,
      },
      rewardPoints: Math.round(ride.estimatedReward),
      metadata: {
        rideId: ride.id,
        charity: ride.charityName ?? 'none',
        urgency: ride.urgency,
      },
    };
  },
};

