import React from 'react';
import type { Trip } from '../../trips/tripTypes';
import { useTripStatus } from '../../trips/hooks/useTripStatus';
import { useDriverTripControls } from '../hooks/useDriverTripControls';

const DriverTripControls: React.FC<{ trip: Trip }> = ({ trip }) => {
  const s = useTripStatus(trip.status);
  const c = useDriverTripControls(trip);

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="gw-card-title">Driver controls</div>
          <div className="gw-muted mt-1">
            Next step: {s.nextStep ?? '—'}
          </div>
        </div>
        <div className="text-sm font-extrabold text-slate-800">{s.progressPercent}%</div>
      </div>

      <div className="flex flex-wrap gap-3">
        {trip.status === 'driver_assigned' && (
          <>
            <button type="button" className="gw-button gw-button-secondary" onClick={c.markArriving}>
              Navigate to pickup
            </button>
            <button type="button" className="gw-button gw-button-primary" onClick={c.markArriving}>
              Mark arriving
            </button>
          </>
        )}
        {trip.status === 'driver_arriving' && (
          <button type="button" className="gw-button gw-button-primary" onClick={c.markArrived}>
            Mark arrived
          </button>
        )}
        {trip.status === 'arrived' && (
          <button type="button" className="gw-button gw-button-primary" onClick={c.startTrip}>
            Start trip
          </button>
        )}
        {(trip.status === 'in_progress' || trip.status === 'support_in_progress') && (
          <button type="button" className="gw-button gw-button-primary" onClick={c.completeTrip}>
            {trip.status === 'support_in_progress' ? 'Complete support trip' : 'Complete trip'}
          </button>
        )}

        <button type="button" className="gw-button gw-button-secondary" onClick={c.reportIssue}>
          Report issue
        </button>
        <button type="button" className="gw-button gw-button-secondary" onClick={c.contactSupport}>
          Contact support
        </button>
      </div>

      <div className="text-xs text-slate-500">
        These controls use shared trip actions (no duplicate lifecycle logic).
      </div>
    </div>
  );
};

export default DriverTripControls;

