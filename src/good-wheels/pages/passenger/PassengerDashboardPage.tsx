import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useRideStore } from '../../store/useRideStore';
import { GW_PATHS } from '../../routes/paths';

const PassengerDashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const activeTrip = useRideStore((s) => s.activeTrip);
  const loading = useRideStore((s) => s.loading);

  return (
    <div className="space-y-8">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">Welcome back{user?.fullName ? `, ${user.fullName}` : ''}</h1>
          <p className="gw-muted">Request a ride, track your trip, and connect help to real outcomes.</p>
        </div>
        <Link to={GW_PATHS.passenger.request} className="gw-button gw-button-primary">Request a Ride</Link>
      </div>

      <div className="gw-grid-2">
        <div className="gw-card p-5 space-y-3">
          <div className="gw-card-title">Current Ride</div>
          {loading ? (
            <div className="gw-muted">Loading…</div>
          ) : activeTrip ? (
            <>
              <div className="text-sm text-slate-700">
                <strong>{activeTrip.pickup.label}</strong> → <strong>{activeTrip.dropoff.label}</strong>
              </div>
              <div className="gw-muted">Status: {activeTrip.status.replace(/_/g, ' ')}</div>
              <Link to={GW_PATHS.passenger.active} className="gw-link">Open active trip</Link>
            </>
          ) : (
            <>
              <div className="gw-muted">No active trip right now.</div>
              <Link to={GW_PATHS.passenger.request} className="gw-link">Request a ride</Link>
            </>
          )}
        </div>

        <div className="gw-card p-5 space-y-3">
          <div className="gw-card-title">Family Safe</div>
          <div className="gw-muted">
            Verified driver and handoff options will appear here. Emergency support tools live on the Active Trip screen.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassengerDashboardPage;

