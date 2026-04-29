import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useDriverStore } from '../../features/driver/driverStore';
import DriverRequestCard from '../../features/driver/components/DriverRequestCard';
import { GW_PATHS } from '../../routes/paths';
import { useGwLang } from '../../i18n/useGwLang';

const DriverDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const hydrate = useDriverStore((s) => s.hydrate);
  const queueItems = useDriverStore((s) => s.queueItems);
  const acceptQueueTrip = useDriverStore((s) => s.acceptQueueTrip);
  const availabilityStatus = useDriverStore((s) => s.availabilityStatus);
  const setAvailability = useDriverStore((s) => s.setAvailability);
  const [driverStatus, setDriverStatus] = useState<'offline' | 'online' | 'available' | 'on_trip'>('available');

  useEffect(() => {
    void hydrate();
    const timer = window.setInterval(() => void hydrate(), 5000);
    return () => window.clearInterval(timer);
  }, [hydrate]);

  const openTrips = queueItems.filter((trip) => ['requested', 'broadcasted', 'matched'].includes(trip.status));

  return (
    <div className="space-y-8">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">{t('driverDashboard')}</h1>
          <p className="gw-muted">{t('reviewRequests')}</p>
        </div>
      </div>

      <div className="gw-card p-4 space-y-3 gw-driver-surface">
        <div className="gw-card-title">{t('driverControls')}</div>
        <div className="text-xs font-semibold text-amber-900/90">{t('availability')}: {availabilityStatus}</div>
        <div className="flex flex-wrap gap-2">
          {(['offline', 'online', 'available', 'on_trip'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={driverStatus === status ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
              onClick={() => {
                setDriverStatus(status);
                if (status === 'offline') void setAvailability('offline');
                else if (status === 'on_trip') void setAvailability('busy');
                else void setAvailability('online');
              }}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="gw-card p-4 space-y-3">
        <div className="gw-card-title">{t('availableRequests')}</div>
        {openTrips.length === 0 ? (
          <div className="text-sm text-slate-600">{t('noAvailableRideRequests')}</div>
        ) : (
          <div className="space-y-4">
            {openTrips.map((trip) => (
              <DriverRequestCard
                key={trip.id}
                trip={trip}
                onReview={() => navigate(GW_PATHS.driver.queue)}
                onAccept={() => {
                  if (!user?.id) return;
                  void acceptQueueTrip(trip.id).then((next) => {
                    if (next) navigate(GW_PATHS.driver.active);
                  });
                }}
                onDecline={() => useDriverStore.getState().declineQueueTrip(trip.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboardPage;
