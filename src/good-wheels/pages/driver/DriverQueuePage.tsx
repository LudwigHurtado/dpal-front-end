import React, { useEffect, useMemo } from 'react';
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
  const pendingDealTrips = useDriverStore((s) => s.pendingDealTrips);
  const dashboardLoading = useDriverStore((s) => s.dashboardLoading);
  const driverProfile = useDriverStore((s) => s.driverProfile);
  const acceptQueueTrip = useDriverStore((s) => s.acceptQueueTrip);

  useEffect(() => {
    void hydrate();
    const timer = window.setInterval(() => void hydrate(), 8000);
    return () => window.clearInterval(timer);
  }, [hydrate]);

  const queue = useMemo(
    () => queueItems.filter((trip) => ['requested', 'broadcasted', 'matched'].includes(trip.status)),
    [queueItems],
  );

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

      {dashboardLoading && !driverProfile ? (
        <div className="gw-card p-4 text-sm text-slate-600 border border-slate-200/80">{t('restoringDriverDashboard')}</div>
      ) : null}

      <div className="gw-card p-4 space-y-3 border border-slate-200/80">
        <div className="gw-card-title">{t('pendingDealsSection')}</div>
        {pendingDealTrips.length === 0 ? (
          <div className="text-sm text-slate-600">{t('noPendingDeals')}</div>
        ) : (
          <div className="space-y-4">
            {pendingDealTrips.map((trip) => (
              <DriverRequestCard
                key={trip.id}
                trip={trip}
                dealVariant="pending_counteroffer"
                onDecline={() => void useDriverStore.getState().declineQueueTrip(trip.id)}
              />
            ))}
          </div>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="gw-card p-4 text-sm text-slate-600">{t('noAvailableRideRequests')}</div>
      ) : (
        <div className="space-y-4">
          {queue.map((trip) => (
            <DriverRequestCard
              key={trip.id}
              trip={trip}
              onAccept={() => {
                if (!user?.id) return;
                void acceptQueueTrip(trip.id).then((next) => {
                  if (next) navigate(GW_PATHS.driver.active);
                });
              }}
              onDecline={() => void useDriverStore.getState().declineQueueTrip(trip.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverQueuePage;
