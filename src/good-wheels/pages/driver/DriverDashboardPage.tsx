import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useDriverStore } from '../../features/driver/driverStore';
import DriverRequestCard from '../../features/driver/components/DriverRequestCard';
import { GW_PATHS } from '../../routes/paths';
import { useGwLang } from '../../i18n/useGwLang';
import { useTripStore } from '../../features/trips/tripStore';

const ACTIVE_TRIP_STATUSES = new Set([
  'accepted',
  'driver_en_route',
  'driver_arrived',
  'passenger_onboard',
  'in_progress',
  'driver_assigned',
  'driver_arriving',
  'arrived',
]);

const DriverDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const user = useAuthStore((s) => s.user);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const hydrate = useDriverStore((s) => s.hydrate);
  const queueItems = useDriverStore((s) => s.queueItems);
  const pendingDealTrips = useDriverStore((s) => s.pendingDealTrips);
  const recentCompletedTrips = useDriverStore((s) => s.recentCompletedTrips);
  const dashboardSummary = useDriverStore((s) => s.dashboardSummary);
  const dashboardLoading = useDriverStore((s) => s.dashboardLoading);
  const dashboardError = useDriverStore((s) => s.dashboardError);
  const dashboardStale = useDriverStore((s) => s.dashboardStale);
  const lastDashboardSyncIso = useDriverStore((s) => s.lastDashboardSyncIso);
  const acceptQueueTrip = useDriverStore((s) => s.acceptQueueTrip);
  const availabilityStatus = useDriverStore((s) => s.availabilityStatus);
  const setAvailability = useDriverStore((s) => s.setAvailability);
  const driverProfile = useDriverStore((s) => s.driverProfile);
  const vehicle = useDriverStore((s) => s.vehicle);
  const performanceSummary = useDriverStore((s) => s.performanceSummary);

  useEffect(() => {
    void hydrate();
    const timer = window.setInterval(() => void hydrate(), 8000);
    return () => window.clearInterval(timer);
  }, [hydrate]);

  const openTrips = useMemo(
    () => queueItems.filter((trip) => ['requested', 'broadcasted', 'matched'].includes(trip.status)),
    [queueItems],
  );

  const isOnTrip = Boolean(activeTrip && ACTIVE_TRIP_STATUSES.has(activeTrip.status));

  const availabilityLabel = useMemo(() => {
    if (isOnTrip || availabilityStatus === 'busy') return t('busy');
    if (availabilityStatus === 'paused') return t('availabilityPaused');
    if (availabilityStatus === 'offline') return t('offline');
    return t('available');
  }, [availabilityStatus, isOnTrip, t]);

  const lastSyncedLabel = useMemo(() => {
    if (!lastDashboardSyncIso) return null;
    try {
      return new Date(lastDashboardSyncIso).toLocaleString();
    } catch {
      return lastDashboardSyncIso;
    }
  }, [lastDashboardSyncIso]);

  const availableCount = dashboardSummary?.availableCount ?? openTrips.length;

  return (
    <div className="space-y-6">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">{t('driverDashboard')}</h1>
          <p className="gw-muted">{t('driverDispatchSubtitle')}</p>
        </div>
      </div>

      {dashboardLoading && !driverProfile ? (
        <div className="gw-card p-4 text-sm font-medium text-slate-700 border border-slate-200/80">{t('restoringDriverDashboard')}</div>
      ) : null}

      {dashboardError ? (
        <div className="gw-card p-4 space-y-2 border border-rose-200 bg-rose-50/90 text-sm text-rose-950">
          <div>
            <span className="font-bold">{t('dashboardConnectionError')}</span>: {dashboardError}
          </div>
          <button type="button" className="gw-button gw-button-secondary text-xs" onClick={() => void hydrate()}>
            {t('retryLoadDashboard')}
          </button>
        </div>
      ) : null}

      {dashboardStale ? (
        <div className="gw-card p-3 text-xs font-semibold text-amber-950 bg-amber-50 border border-amber-200">{t('staleDashboardBanner')}</div>
      ) : null}

      {lastSyncedLabel ? (
        <div className="text-xs text-slate-500 font-medium">{tf('dashboardLastSynced', { at: lastSyncedLabel })}</div>
      ) : null}

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
            <div className="text-xs text-emerald-800 mt-1">{t('checkingActiveTrip')}</div>
          </div>
          <Link to={GW_PATHS.driver.active} className="gw-button gw-button-primary text-sm no-underline inline-flex justify-center">
            {t('resumeActiveTripCta')}
          </Link>
        </div>
      ) : null}

      <div className="gw-card p-4 space-y-3 border border-slate-200/80">
        <div className="gw-card-title">{t('dispatchQueueSummary')}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">{t('availableRequestsCount')}</div>
            <div className="text-2xl font-extrabold text-slate-900">{availableCount}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">{t('activeTrip')}</div>
            <div className="text-sm font-semibold text-slate-800">{isOnTrip ? t('onTrip') : t('noActiveTripShort')}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">{t('todaysEarnings')}</div>
            <div className="text-2xl font-extrabold text-slate-400">—</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">{t('completedTripsLabel')}</div>
            <div className="text-2xl font-extrabold text-slate-900">
              {dashboardSummary?.completedTrips ?? performanceSummary?.completedTrips ?? 0}
            </div>
          </div>
        </div>
      </div>

      <div className="gw-card p-4 space-y-3 border border-slate-200/80">
        <div className="gw-card-title">{t('pendingDealsSection')}</div>
        {pendingDealTrips.length === 0 ? (
          <div className="text-sm text-slate-600">{t('noPendingDeals')}</div>
        ) : (
          <div className="space-y-3">
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
                onDecline={() => void useDriverStore.getState().declineQueueTrip(trip.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="gw-card p-4 space-y-3 border border-slate-200/80">
        <div className="gw-card-title">{t('recentCompletedSection')}</div>
        {recentCompletedTrips.length === 0 ? (
          <div className="text-sm text-slate-600">—</div>
        ) : (
          <ul className="text-sm text-slate-700 space-y-1">
            {recentCompletedTrips.slice(0, 6).map((trip) => (
              <li key={trip.id} className="flex justify-between gap-2 border-b border-slate-100 pb-1">
                <span className="truncate">
                  {trip.pickup.label} → {trip.dropoff.label}
                </span>
                <span className="text-xs text-slate-500 shrink-0">{trip.completedAtIso?.slice(0, 10) ?? trip.updatedAtIso.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {import.meta.env.DEV ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-[10px] font-mono text-slate-700 space-y-1">
          <div>
            {t('dashboardDebugSource')}: {dashboardStale ? t('dashboardDebugCache') : t('dashboardDebugBackend')}
          </div>
          <div>driverId {user?.id ?? '—'}</div>
          <div>activeTripId {activeTrip?.id ?? '—'}</div>
          <div>pending {pendingDealTrips.map((x) => x.id).join(', ') || '—'}</div>
          <div>available {openTrips.map((x) => x.id).join(', ') || '—'}</div>
        </div>
      ) : null}
    </div>
  );
};

export default DriverDashboardPage;
