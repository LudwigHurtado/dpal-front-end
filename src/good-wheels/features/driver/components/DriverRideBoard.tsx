import React from 'react';
import type { RideRequest } from '../../../types/rideConnection';
import DriverRideRequestCard from './DriverRideRequestCard';

const DriverRideBoard: React.FC<{
  rides: RideRequest[];
  driverStatus: 'offline' | 'online' | 'available' | 'on_trip';
  onDriverStatusChange: (status: 'offline' | 'online' | 'available' | 'on_trip') => void;
  onAcceptRide: (rideId: string) => void;
}> = ({ rides, driverStatus, onDriverStatusChange, onAcceptRide }) => (
  <div className="space-y-4">
    <div className="gw-card p-4 space-y-3">
      <div className="gw-card-title">Driver status</div>
      <div className="flex flex-wrap gap-2">
        {(['offline', 'online', 'available', 'on_trip'] as const).map((status) => (
          <button key={status} type="button" className={driverStatus === status ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'} onClick={() => onDriverStatusChange(status)}>
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>

    <div className="gw-card p-4 space-y-3">
      <div className="gw-card-title">Available ride requests</div>
      {rides.length === 0 ? (
        <div className="text-sm text-slate-600">No open requests right now.</div>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => (
            <DriverRideRequestCard key={ride.id} ride={ride} onAccept={() => onAcceptRide(ride.id)} />
          ))}
        </div>
      )}
    </div>
  </div>
);

export default DriverRideBoard;

