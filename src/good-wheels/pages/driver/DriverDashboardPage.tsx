import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useDriverStore } from '../../features/driver/driverStore';
import DriverRequestCard from '../../features/driver/components/DriverRequestCard';
import { GW_PATHS } from '../../routes/paths';
import { useGwLang } from '../../i18n/useGwLang';
import { useTripStore } from '../../features/trips/tripStore';

const ACTIVE_TRIP_STATUSES = ['accepted', 'driver_en_route', 'driver_arrived', 'passenger_onboard', 'in_progress'] as const;

const DriverDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const hydrate = useDriverStore((s) => s.hydrate);
  const queueItems = useDriverStore((s) => s.queueItems);
  const acceptQueueTrip = useDriverStore((s) => s.acceptQueueTrip);
  const availabilityStatus = useDriverStore((s) => s.availabilityStatus);
  const setAvailability = useDriverStore((s) => s.setAvailability);
  const driverProfile = useDriverStore((s) => s.driverProfile);
  const vehicle = useDriverStore((s) => s.vehicle);
  const performanceSummary = useDriverStore((s) => s.performanceSummary);

  useEffect(() => {
    void hydrate();
    const timer = window.setInterval(() => void hydrate(), 5000);
    return () => window.clearInterval(timer);
  }, [hydrate]);

  const openTrips = useMemo(
    () => queueItems.filter((trip) => ['requested', 'broadcasted', 'matched'].includes(trip.status)),
    [queueItems],
  );

  const isOnTrip = Boolean(activeTrip && ACTIVE_TRIP_STATUSES.includes(activeTrip.status as (typeof ACTIVE_TRIP_STATUSES)[number]));

  const availabilityLabel = useMemo(() => {
    if (isOnTrip || availabilityStatus === 'busy') return t('busy');
    if (availabilityStatus === 'paused') return t('availabilityPaused');
    if (availabilityStatus === 'offline') return t('offline');
    return t('available');
  }, [availabilityStatus, isOnTrip, t]);

  return (
    <div className="space-y-6">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">{t('driverDashboard')}</h1>
          <p className="gw-muted">{t('driverDispatchSubtitle')}</p>
        </div>
      </div>

      <div className="gw-card p-4 space-y-4 gw-driver-surface border border-slate-200/80">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-slate-900 truncate">{driverProfile?.fullName ?? '—'}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                {availabilityLabel}
              </span>
              {vehicle ? (
                <span className="text-slate-700">
                  {vehicle.makeModel} · {vehicle.plateMasked}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="gw-button gw-button-primary text-sm px-4 py-2"
              disabled={isOnTrip}
              onClick={() => void setAvailability('online')}
            >
              {t('goOnline')}
            </button>
            <button
              type="button"
              className="gw-button gw-button-secondary text-sm px-4 py-2 border-amber-300 text-amber-950 bg-amber-50 hover:bg-amber-100"
              disabled={isOnTrip}
              onClick={() => void setAvailability('paused')}
            >
              {t('pauseAvailability')}
            </button>
            <button type="button" className="gw-button gw-button-secondary text-sm px-4 py-2" disabled={isOnTrip} onClick={() => void setAvailability('offline')}>
              {t('goOffline')}
            </button>
          </div>
        </div>
      </div>

      {isOnTrip && activeTrip ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-900">{t('youAreOnTrip')}</div>
            <div className="text-sm font-semibold text-emerald-950">
              {t('activeTripBannerTitle')}: {activeTrip.pickup.label} → {activeTrip.dropoff.label}
            </div>
          </div>
          <Link to={GW_PATHS.driver.active} className="gw-button gw-button-primary text-sm no-underline inline-flex justify-center">
            {t('viewActiveTrip')}
          </Link>
        </div>
      ) : null}

      <div className="gw-card p-4 space-y-3 border border-slate-200/80">
        <div className="gw-card-title">{t('dispatchQueueSummary')}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">{t('availableRequestsCount')}</div>
            <div className="text-2xl font-extrabold text-slate-900">{openTrips.length}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">{t('activeTrip')}</div>
            <div className="text-sm font-semibold text-slate-800">{isOnTrip ? t('onTrip') : t('noActiveTrip')}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">{t('todaysEarnings')}</div>
            <div className="text-2xl font-extrabold text-slate-400">—</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">{t('completedTripsLabel')}</div>
            <div className="text-2xl font-extrabold text-slate-900">{performanceSummary?.completedTrips ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="gw-card p-4 space-y-3 border border-slate-200/80">
        <div className="gw-card-title">{t('availableRequests')}</div>
        {isOnTrip && openTrips.length > 0 ? (
          <div className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{t('requestsPausedWhileOnTrip')}</div>
        ) : null}
        {openTrips.length === 0 ? (
          <div className="text-sm text-slate-600">{t('noAvailableRideRequests')}</div>
        ) : (
          <div className="space-y-3">
            {openTrips.map((trip) => (
              <DriverRequestCard
                key={trip.id}
                trip={trip}
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
