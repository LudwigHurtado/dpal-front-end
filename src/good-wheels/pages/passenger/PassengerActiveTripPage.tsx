import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useAuthStore } from '../../store/useAuthStore';
import { useTripStore } from '../../features/trips/tripStore';
import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import { useRideStore } from '../../store/useRideStore';
import PassengerActiveTripView from '../../features/passenger/components/PassengerActiveTripView';
import PassengerBackendActiveTripView from '../../features/passenger/components/PassengerBackendActiveTripView';

const PassengerActiveTripPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const loadForUser = useRideStore((s) => s.loadForUser);
  const activeRide = useRideStore((s) => s.activeRide);
  const updateStatus = useRideStore((s) => s.updateStatus);
  const backendTrip = useTripStore((s) => s.activeTrip);
  const hydrateTrips = useTripStore((s) => s.hydrate);

  useEffect(() => {
    if (!user?.id) return;
    if (GOOD_WHEELS_DEMO_MODE) {
      void loadForUser(user.id);
      const timer = window.setInterval(() => void loadForUser(user.id), 3000);
      return () => window.clearInterval(timer);
    }
    void hydrateTrips(user.id);
    const timer = window.setInterval(() => void hydrateTrips(user.id), 5000);
    return () => window.clearInterval(timer);
  }, [loadForUser, hydrateTrips, user?.id]);

  if (!GOOD_WHEELS_DEMO_MODE && backendTrip) {
    return <PassengerBackendActiveTripView trip={backendTrip} />;
  }

  if (!activeRide) {
    return (
      <div className="gw-card p-6">
        <div className="gw-card-title">No active ride</div>
        <button type="button" className="gw-button gw-button-secondary mt-2" onClick={() => navigate(GW_PATHS.passenger.request)}>
          Request a ride
        </button>
      </div>
    );
  }

  return (
    <PassengerActiveTripView
      ride={activeRide}
      userId={user?.id ?? activeRide.passengerId}
      userName={user?.fullName ?? activeRide.passengerName}
      onUpdateStatus={(status) => void updateStatus(activeRide.id, status, user?.id ?? activeRide.passengerId)}
    />
  );
};

export default PassengerActiveTripPage;
