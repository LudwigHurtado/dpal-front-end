import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useRideStore } from '../../store/useRideStore';
import DriverActiveTripView from '../../features/driver/components/DriverActiveTripView';
import { GW_PATHS } from '../../routes/paths';
import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import { useTripStore } from '../../features/trips/tripStore';
import DriverBackendActiveTripView from '../../features/driver/components/DriverBackendActiveTripView';
import { useGwLang } from '../../i18n/useGwLang';

const DriverActiveTripPage: React.FC = () => {
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

  if (!GOOD_WHEELS_DEMO_MODE && backendTrip && backendTrip.driverId === user?.id) {
    return <DriverBackendActiveTripView trip={backendTrip} />;
  }

  if (!activeRide || !activeRide.driverId) {
    return (
      <div className="space-y-3">
        {lastTerminalTrip && (lastTerminalTrip.status === 'cancelled' || lastTerminalTrip.status === 'canceled') ? (
          <div className="gw-card p-6 space-y-3 border border-rose-200 bg-rose-50/70">
            <div className="gw-card-title">Ride canceled</div>
            <div className="text-sm text-rose-900">
              {lastTerminalTrip.cancelledByRole === 'passenger'
                ? 'The passenger canceled this ride.'
                : lastTerminalTrip.cancelledByRole === 'driver'
                  ? 'You canceled this ride.'
                  : 'This ride was canceled.'}
              {lastTerminalTrip.cancelReason ? ` Reason: ${lastTerminalTrip.cancelReason}` : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="gw-button gw-button-primary" onClick={() => navigate(GW_PATHS.driver.dashboard)}>
                Continue searching for passengers
              </button>
              <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.driver.comms)}>
                {t('reportIssue')}
              </button>
              <button type="button" className="gw-button gw-button-secondary" onClick={() => clearLastTerminalTrip()}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        <div className="gw-card p-6">
          <div className="gw-card-title">{t('driverNoActiveTripTitle')}</div>
          <button type="button" className="gw-button gw-button-secondary mt-2" onClick={() => navigate(GW_PATHS.driver.dashboard)}>
            {t('driverBackToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <DriverActiveTripView
      ride={activeRide}
      userId={user?.id ?? activeRide.driverId}
      userName={user?.fullName ?? activeRide.driverName ?? 'Driver'}
      onUpdateStatus={(status) => void updateStatus(activeRide.id, status, user?.id ?? activeRide.driverId ?? 'driver')}
    />
  );
};

export default DriverActiveTripPage;
