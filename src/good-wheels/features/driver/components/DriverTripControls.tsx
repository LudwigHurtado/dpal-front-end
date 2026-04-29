import React from 'react';
import type { Trip } from '../../trips/tripTypes';
import { useTripStatus } from '../../trips/hooks/useTripStatus';
import { useDriverTripControls } from '../hooks/useDriverTripControls';

const DriverTripControls: React.FC<{ trip: Trip }> = ({ trip }) => {
  const s = useTripStatus(trip.status);
  const c = useDriverTripControls(trip);
  const [loading, setLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const run = async (id: string, action: () => Promise<void> | void) => {
    setLoading(id);
    setError(null);
    try {
      await action();
    } catch {
      setError('Could not update trip status. Please retry.');
    } finally {
      setLoading(null);
    }
  };

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
        {(trip.status === 'driver_assigned' || trip.status === 'accepted' || trip.status === 'driver_en_route') && (
          <>
            <button type="button" className="gw-button gw-button-secondary" onClick={() => void run('arriving', c.markArriving)} disabled={loading !== null}>
              Navigate to pickup
            </button>
            <button type="button" className="gw-button gw-button-primary" onClick={() => void run('arriving', c.markArriving)} disabled={loading !== null}>
              Mark arriving
            </button>
          </>
        )}
        {(trip.status === 'driver_arriving' || trip.status === 'driver_en_route') && (
          <button type="button" className="gw-button gw-button-primary" onClick={() => void run('arrived', c.markArrived)} disabled={loading !== null}>
            Mark arrived
          </button>
        )}
        {(trip.status === 'arrived' || trip.status === 'driver_arrived' || trip.status === 'passenger_onboard') && (
          <button type="button" className="gw-button gw-button-primary" onClick={() => void run('start', c.startTrip)} disabled={loading !== null}>
            Start trip
          </button>
        )}
        {(trip.status === 'in_progress' || trip.status === 'support_in_progress') && (
          <button type="button" className="gw-button gw-button-primary" onClick={() => void run('complete', c.completeTrip)} disabled={loading !== null}>
            {trip.status === 'support_in_progress' ? 'Complete support trip' : 'Complete trip'}
          </button>
        )}

        <button type="button" className="gw-button gw-button-secondary" onClick={() => void run('issue', c.reportIssue)} disabled={loading !== null}>
          Report issue
        </button>
        <button type="button" className="gw-button gw-button-secondary" onClick={() => void run('support', c.contactSupport)} disabled={loading !== null}>
          Contact support
        </button>
        {!['completed', 'cancelled', 'canceled'].includes(trip.status) && (
          <button type="button" className="gw-button" onClick={() => void run('cancel', c.cancelTrip)} disabled={loading !== null} style={{ background: 'rgba(220,38,38,0.1)', color: '#991b1b' }}>
            Cancel ride
          </button>
        )}
      </div>
      {error && <div className="gw-error">{error}</div>}

      <div className="text-xs text-slate-500">
        These controls use shared trip actions (no duplicate lifecycle logic).
      </div>
    </div>
  );
};

export default DriverTripControls;

