import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';
import { useTripStore } from '../../features/trips/tripStore';
import RideStatusCard from '../../features/trips/components/RideStatusCard';
import TripTimeline from '../../features/trips/components/TripTimeline';
import TripMapPanel from '../../features/trips/components/TripMapPanel';
import TripActionBar from '../../features/trips/components/TripActionBar';
import TripRoutePreview from '../../features/trips/components/TripRoutePreview';
import { MOCK_SUPPORT_CATEGORIES } from '../../data/mock/mockSupportCategories';

const PassengerDashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const loading = useTripStore((s) => s.loading);

  return (
    <div className="space-y-8">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">Welcome back{user?.fullName ? `, ${user.fullName}` : ''}</h1>
          <p className="gw-muted">Request a ride, track your trip, and connect help to real outcomes.</p>
        </div>
        <Link to={GW_PATHS.passenger.request} className="gw-button gw-button-primary">Request a Ride</Link>
      </div>

      {loading ? (
        <div className="gw-card p-6">
          <div className="gw-muted">Loading…</div>
        </div>
      ) : activeTrip ? (
        <div className="space-y-6">
          <RideStatusCard
            role="passenger"
            trip={activeTrip}
            supportCategory={
              activeTrip.supportCategoryId
                ? MOCK_SUPPORT_CATEGORIES.find((c) => c.id === activeTrip.supportCategoryId) ?? null
                : null
            }
          />

          <div className="gw-grid-2">
            <TripMapPanel trip={activeTrip} variant="passenger" />
            <TripRoutePreview trip={activeTrip} />
          </div>

          <div className="gw-grid-2">
            <TripTimeline trip={activeTrip} />
            <div className="space-y-4">
              <div className="gw-card p-5 space-y-2">
                <div className="gw-card-title">Quick actions</div>
                <div className="gw-muted">
                  These actions are shared across roles and will later connect to messaging, cancellations, and emergency support.
                </div>
              </div>
              <TripActionBar role="passenger" trip={activeTrip} onAction={() => {}} />
            </div>
          </div>
        </div>
      ) : (
        <div className="gw-card p-6">
          <div className="gw-card-title">No active trip</div>
          <p className="gw-muted mt-2">Request a ride to get started.</p>
          <div className="mt-4">
            <Link to={GW_PATHS.passenger.request} className="gw-button gw-button-primary">Request a Ride</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassengerDashboardPage;

