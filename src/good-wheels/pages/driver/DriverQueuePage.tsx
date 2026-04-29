import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useAuthStore } from '../../store/useAuthStore';
import { useDriverStore } from '../../features/driver/driverStore';
import DriverRequestCard from '../../features/driver/components/DriverRequestCard';
import { useGwLang } from '../../i18n/useGwLang';

const DriverQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const hydrate = useDriverStore((s) => s.hydrate);
  const queueItems = useDriverStore((s) => s.queueItems);
  const acceptQueueTrip = useDriverStore((s) => s.acceptQueueTrip);

  useEffect(() => {
    void hydrate();
    const timer = window.setInterval(() => void hydrate(), 5000);
    return () => window.clearInterval(timer);
  }, [hydrate]);

  const queue = queueItems.filter((trip) => ['requested', 'broadcasted', 'matched'].includes(trip.status));

  return (
    <div className="space-y-6">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">
            {t('queueTitle')} ({queue.length})
          </h1>
          <p className="gw-muted">{t('reviewRequests')}</p>
        </div>
      </div>
      {queue.length === 0 ? (
        <div className="gw-card p-4 text-sm text-slate-600">{t('noAvailableRideRequests')}</div>
      ) : (
        <div className="space-y-4">
          {queue.map((trip) => (
            <DriverRequestCard
              key={trip.id}
              trip={trip}
              onReview={() => navigate(GW_PATHS.driver.dashboard)}
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
  );
};

export default DriverQueuePage;
