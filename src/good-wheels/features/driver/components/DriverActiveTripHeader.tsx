import React from 'react';
import type { Trip } from '../../trips/tripTypes';
import TripStatusBadge from '../../trips/components/TripStatusBadge';
import TripMetaRow from '../../trips/components/TripMetaRow';

const DriverActiveTripHeader: React.FC<{ trip: Trip; onBack: () => void }> = ({ trip, onBack }) => {
  return (
    <div className="gw-card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <button type="button" className="gw-button gw-button-ghost" onClick={onBack}>
            ← Back
          </button>
          <div className="text-xl font-extrabold text-slate-900 mt-2 truncate">
            {trip.pickup.label} → {trip.dropoff.label}
          </div>
          <div className="gw-muted mt-1 truncate">
            {trip.pickup.addressLine} → {trip.dropoff.addressLine}
          </div>
        </div>
        <TripStatusBadge status={trip.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="gw-card p-4 space-y-3" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.6)' }}>
          <TripMetaRow label="ETA" value={`${trip.estimate.etaMinutes} min`} />
          <TripMetaRow label="Distance" value={`${trip.estimate.distanceKm.toFixed(1)} km`} />
        </div>
        <div className="gw-card p-4 space-y-3" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.6)' }}>
          <TripMetaRow label="Passenger" value={trip.passengerId} />
          <TripMetaRow label="Safety" value={(trip.safetyStatus ?? 'standard').replace(/_/g, ' ')} />
        </div>
      </div>
    </div>
  );
};

export default DriverActiveTripHeader;

