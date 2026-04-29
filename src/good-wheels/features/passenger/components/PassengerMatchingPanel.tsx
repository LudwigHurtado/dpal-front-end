import React from 'react';
import type { RideRequest } from '../../../types/rideConnection';

const PassengerMatchingPanel: React.FC<{ ride: RideRequest | null }> = ({ ride }) => {
  if (!ride) {
    return (
      <div className="gw-card p-4">
        <div className="gw-card-title">Matching status</div>
        <div className="text-sm text-slate-600 mt-1">Create a ride request to begin matching.</div>
      </div>
    );
  }
  return (
    <div className="gw-card p-4 space-y-2">
      <div className="gw-card-title">Matching status</div>
      <div className="text-sm text-slate-700">Current status: {ride.status.replaceAll('_', ' ')}</div>
      <div className="text-sm text-slate-700">Driver: {ride.driverName ?? 'Searching for driver'}</div>
      <div className="text-sm text-slate-700">Vehicle: Civic-tech sedan · Plate: DPAL-*** · Rating: 4.8</div>
      <div className="text-sm text-slate-700">ETA: {Math.max(4, Math.round(ride.estimatedDuration * 0.35))} min · Driver distance: {Math.max(0.8, ride.estimatedDistance * 0.25).toFixed(1)} km</div>
      <div className="text-sm text-slate-700">Reward corridor: {ride.estimatedReward.toFixed(2)} DPAL points</div>
      <div className="text-xs text-slate-500">Safety badge: DPAL verified workflow · Contact driver action available in trip room</div>
    </div>
  );
};

export default PassengerMatchingPanel;

