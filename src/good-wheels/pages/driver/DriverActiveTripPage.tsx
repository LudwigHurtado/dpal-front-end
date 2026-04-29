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
      <div className="gw-card p-6">
        <div className="gw-card-title">{t('driverNoActiveTripTitle')}</div>
        <button type="button" className="gw-button gw-button-secondary mt-2" onClick={() => navigate(GW_PATHS.driver.dashboard)}>
          {t('driverBackToDashboard')}
        </button>
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
