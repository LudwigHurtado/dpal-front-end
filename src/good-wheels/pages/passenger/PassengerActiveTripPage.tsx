import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useAuthStore } from '../../store/useAuthStore';
import { useTripStore } from '../../features/trips/tripStore';
import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import { useRideStore } from '../../store/useRideStore';
import PassengerActiveTripView from '../../features/passenger/components/PassengerActiveTripView';
import PassengerBackendActiveTripView from '../../features/passenger/components/PassengerBackendActiveTripView';
import { useGwLang } from '../../i18n/useGwLang';

const PassengerActiveTripPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const loadForUser = useRideStore((s) => s.loadForUser);
  const activeRide = useRideStore((s) => s.activeRide);
  const updateStatus = useRideStore((s) => s.updateStatus);
  const backendTrip = useTripStore((s) => s.activeTrip);
  const lastTerminalTrip = useTripStore((s) => s.lastTerminalTrip);
  const clearLastTerminalTrip = useTripStore((s) => s.clearLastTerminalTrip);
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
      <div className="space-y-3">
        {lastTerminalTrip && (lastTerminalTrip.status === 'cancelled' || lastTerminalTrip.status === 'canceled') ? (
          <div className="gw-card p-6 space-y-3 border border-rose-200 bg-rose-50/70">
            <div className="gw-card-title">Ride canceled</div>
            <div className="text-sm text-rose-900">
              {lastTerminalTrip.cancelledByRole === 'driver'
                ? 'Your driver canceled this ride.'
                : lastTerminalTrip.cancelledByRole === 'passenger'
                  ? 'You canceled this ride.'
                  : 'This ride was canceled.'}
              {lastTerminalTrip.cancelReason ? ` Reason: ${lastTerminalTrip.cancelReason}` : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="gw-button gw-button-primary" onClick={() => navigate(GW_PATHS.passenger.request)}>
                {t('requestRideBtn')}
              </button>
              <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.passenger.support)}>
                {t('reportIssue')}
              </button>
              <button type="button" className="gw-button gw-button-secondary" onClick={() => clearLastTerminalTrip()}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        <div className="gw-card p-6">
          <div className="gw-card-title">No active ride</div>
          <button type="button" className="gw-button gw-button-secondary mt-2" onClick={() => navigate(GW_PATHS.passenger.request)}>
            Request a ride
          </button>
        </div>
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
