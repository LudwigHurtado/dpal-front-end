import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveTrip } from '../../features/trips/hooks/useActiveTrip';
import TripMapPanel from '../../features/trips/components/TripMapPanel';
import TripTimeline from '../../features/trips/components/TripTimeline';
import TripRoutePreview from '../../features/trips/components/TripRoutePreview';
import TripParticipantCard from '../../features/trips/components/TripParticipantCard';
import TripSafetyBanner from '../../features/trips/components/TripSafetyBanner';
import RideStatusCard from '../../features/trips/components/RideStatusCard';
import TripEmptyState from '../../features/trips/components/TripEmptyState';
import { GW_PATHS } from '../../routes/paths';
import DriverActiveTripHeader from '../../features/driver/components/DriverActiveTripHeader';
import DriverTripControls from '../../features/driver/components/DriverTripControls';
import { MOCK_USERS } from '../../data/mock/mockUsers';

const DriverActiveTripPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeTrip, loading } = useActiveTrip();

  if (loading) {
    return (
      <div className="gw-card p-6">
        <div className="gw-muted">Loading…</div>
      </div>
    );
  }

  if (!activeTrip) {
    return (
      <TripEmptyState
        title="No active trip"
        message="Go online and accept a request from your queue."
        ctaHref={GW_PATHS.driver.queue}
        ctaLabel="Open queue"
      />
    );
  }

  return (
    <div className="space-y-6">
      <DriverActiveTripHeader trip={activeTrip} onBack={() => navigate(GW_PATHS.driver.dashboard)} />

      <RideStatusCard role="driver" trip={activeTrip} />

      <div className="gw-grid-2">
        <TripMapPanel trip={activeTrip} variant="driver" />
        <TripRoutePreview trip={activeTrip} />
      </div>

      <div className="gw-grid-2">
        <TripTimeline trip={activeTrip} />
        <div className="space-y-4">
          <TripSafetyBanner trip={activeTrip} />
          <TripParticipantCard
            trip={activeTrip}
            role="passenger"
            passenger={MOCK_USERS.passenger}
            driver={MOCK_USERS.driver}
            worker={MOCK_USERS.worker}
          />
          {activeTrip.workerId && (
            <TripParticipantCard
              trip={activeTrip}
              role="worker"
              passenger={MOCK_USERS.passenger}
              driver={MOCK_USERS.driver}
              worker={MOCK_USERS.worker}
            />
          )}
          <DriverTripControls trip={activeTrip} />
        </div>
      </div>
    </div>
  );
};

export default DriverActiveTripPage;

