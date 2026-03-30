import React from 'react';
import type { Trip } from '../tripTypes';

const TripMapPanel: React.FC<{ trip: Trip; variant?: 'passenger' | 'driver' | 'worker' }> = ({ trip, variant = 'passenger' }) => {
  const title = variant === 'driver' ? 'Navigation' : variant === 'worker' ? 'Coordination map' : 'Trip map';
  return (
    <div className="gw-card p-5 space-y-3">
      <div className="gw-card-title">{title}</div>
      <div className="text-sm text-slate-600">
        <strong className="text-slate-800">{trip.pickup.label}</strong> →{' '}
        <strong className="text-slate-800">{trip.dropoff.label}</strong>
      </div>
      <div className="gw-map-placeholder">Map placeholder (markers + route)</div>
    </div>
  );
};

export default TripMapPanel;

