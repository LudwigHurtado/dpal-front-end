import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useAuthStore } from '../../store/useAuthStore';
import { useDriverStore } from '../../features/driver/driverStore';
import DriverDashboardTripCard from '../../features/driver/components/DriverDashboardTripCard';
import { useGwLang } from '../../i18n/useGwLang';
import { useTripStore } from '../../features/trips/tripStore';
import type { Trip } from '../../features/trips/tripTypes';
import { fareBasisForTrip, formatMoneyFromCents } from '../../features/trips/utils/fareSplit';

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

type SortKey = 'nearest' | 'fare' | 'eta';

function tripOfferSortCents(trip: Trip): number {
  return fareBasisForTrip(trip).displayCents;
}

const DriverQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const user = useAuthStore((s) => s.user);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const hydrate = useDriverStore((s) => s.hydrate);
  const queueItems = useDriverStore((s) => s.queueItems);
  const pendingDealTrips = useDriverStore((s) => s.pendingDealTrips);
  const recentCompletedTrips = useDriverStore((s) => s.recentCompletedTrips);
  const dashboardLoading = useDriverStore((s) => s.dashboardLoading);
  const dashboardError = useDriverStore((s) => s.dashboardError);
  const dashboardStale = useDriverStore((s) => s.dashboardStale);
  const lastDashboardSyncIso = useDriverStore((s) => s.lastDashboardSyncIso);
  const dashboardSummary = useDriverStore((s) => s.dashboardSummary);
  const driverProfile = useDriverStore((s) => s.driverProfile);
  const acceptQueueTrip = useDriverStore((s) => s.acceptQueueTrip);
  const availabilityStatus = useDriverStore((s) => s.availabilityStatus);
  const setAvailability = useDriverStore((s) => s.setAvailability);
  const performanceSummary = useDriverStore((s) => s.performanceSummary);

  const [sortBy, setSortBy] = useState<SortKey>('nearest');

  useEffect(() => {
    void hydrate();
    const timer = window.setInterval(() => void hydrate(), 7000);
    return () => window.clearInterval(timer);
  }, [hydrate]);

  const openTrips = useMemo(
    () => queueItems.filter((trip) => ['requested', 'broadcasted', 'matched'].includes(trip.status)),
    [queueItems],
  );

  const sortedOpenTrips = useMemo(() => {
    const arr = [...openTrips];
    if (sortBy === 'nearest') arr.sort((a, b) => a.estimate.distanceKm - b.estimate.distanceKm);
    if (sortBy === 'fare') arr.sort((a, b) => tripOfferSortCents(b) - tripOfferSortCents(a));
    if (sortBy === 'eta') {
      arr.sort(
        (a, b) =>
          (a.routeSummary?.durationMinutes ?? a.estimate.etaMinutes) - (b.routeSummary?.durationMinutes ?? b.estimate.etaMinutes),
      );
    }
    return arr;
  }, [openTrips, sortBy]);

  const isOnTrip = Boolean(activeTrip && ACTIVE_TRIP_STATUSES.has(activeTrip.status));
  const completedToday = dashboardSummary?.completedToday ?? 0;
  const illustrativeDailyUsd = completedToday * 28.5;
  const todayEarningsDisplay =
    completedToday > 0 ? formatMoneyFromCents(Math.round(illustrativeDailyUsd * 100)) : formatMoneyFromCents(0);

  const onlineLabel =
    isOnTrip || availabilityStatus === 'busy'
      ? t('busy')
      : availabilityStatus === 'paused'
        ? t('availabilityPaused')
        : availabilityStatus === 'offline'
          ? t('offline')
          : t('available');

  const isOnlineUi = availabilityStatus === 'online';
  const availabilityToggleDisabled = isOnTrip || availabilityStatus === 'busy';
  const showOfflineQueueHint = availabilityStatus === 'offline' && !isOnTrip;

  const availableCount = dashboardSummary?.availableCount ?? openTrips.length;
  const pendingCount = dashboardSummary?.pendingDealCount ?? pendingDealTrips.length;
  const activeTripsDisplay = isOnTrip ? 1 : 0;

  const lastSyncedLabel = useMemo(() => {
    if (!lastDashboardSyncIso) return null;
    try {
      return new Date(lastDashboardSyncIso).toLocaleString();
    } catch {
      return lastDashboardSyncIso;
    }
  }, [lastDashboardSyncIso]);

  const completedLifetime =
    dashboardSummary?.completedTrips ?? performanceSummary?.completedTrips ?? 0;

  return (
    <div className="gw-driver-dashboard space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">{t('driverQueuePageTitle')}</h1>
          <p className="text-xs text-slate-500 font-medium">{t('driverQueuePageSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <span className="inline-flex min-w-[28px] justify-center rounded-full bg-[#1a73e8]/12 px-2 py-0.5 text-xs font-extrabold text-[#1557b0]">
            {availableCount}
          </span>
          <Link
            to={GW_PATHS.shared.notifications}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 no-underline hover:bg-slate-100"
            aria-label={t('notifications')}
          >
            <span className="text-lg" aria-hidden>
              🔔
            </span>
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[#1a73e8]" aria-hidden />
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-2 py-1.5">
            <span className={`text-xs font-bold ${isOnlineUi ? 'text-emerald-700' : 'text-slate-500'}`}>{onlineLabel}</span>
            <button
              type="button"
              role="switch"
              aria-checked={isOnlineUi}
              disabled={availabilityToggleDisabled}
              onClick={() => {
                if (availabilityToggleDisabled) return;
                void setAvailability(availabilityStatus === 'online' ? 'offline' : 'online');
              }}
              className={`relative h-7 w-12 rounded-full transition-colors ${isOnlineUi ? 'bg-emerald-500' : 'bg-slate-300'} ${availabilityToggleDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isOnlineUi ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      {dashboardLoading && !driverProfile ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-sm font-medium text-slate-700">{t('restoringDriverDashboard')}</div>
      ) : null}

      {dashboardError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 space-y-2 text-sm text-rose-950">
          <div>
            <span className="font-bold">{t('dashboardConnectionError')}</span>: {dashboardError}
          </div>
          <button type="button" className="gw-button gw-button-secondary text-xs" onClick={() => void hydrate()}>
            {t('retryLoadDashboard')}
          </button>
        </div>
      ) : null}

      {dashboardStale ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-950">{t('staleDashboardBanner')}</div>
      ) : null}

      {lastSyncedLabel ? (
        <div className="text-[11px] text-slate-500 font-medium">{tf('dashboardLastSynced', { at: lastSyncedLabel })}</div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          {
            label: t('availableRequestsCount'),
            value: String(availableCount),
            tone: 'sky' as const,
          },
          {
            label: t('pendingDealsSection'),
            value: String(pendingCount),
            tone: 'amber' as const,
          },
          {
            label: t('activeTrip'),
            value: String(activeTripsDisplay),
            tone: 'emerald' as const,
          },
          {
            label: t('todaysEarnings'),
            value: todayEarningsDisplay,
            tone: 'emerald' as const,
          },
        ].map((row) => (
          <div
            key={row.label}
            className={`rounded-xl border px-3 py-2.5 shadow-sm ${
              row.tone === 'amber'
                ? 'border-amber-100 bg-amber-50/90'
                : row.tone === 'emerald'
                  ? 'border-emerald-100 bg-emerald-50/80'
                  : 'border-sky-100 bg-sky-50/80'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-600 truncate">{row.label}</div>
            <div className="mt-0.5 text-lg font-extrabold text-slate-900 tabular-nums truncate">{row.value}</div>
          </div>
        ))}
      </div>

      {showOfflineQueueHint ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">{t('queueGoOnlineForRequests')}</div>
      ) : null}

      {isOnTrip && activeTrip ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-900">{t('youAreOnTrip')}</div>
            <div className="text-sm font-semibold text-emerald-950">
              {activeTrip.pickup.label} → {activeTrip.dropoff.label}
            </div>
            <div className="text-xs font-medium text-emerald-900/80 mt-0.5 capitalize">{activeTrip.status.replace(/_/g, ' ')}</div>
          </div>
          <Link
            to={GW_PATHS.driver.active}
            className="gw-driver-dash-btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white no-underline inline-flex justify-center"
          >
            {t('resumeActiveTripCta')}
          </Link>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">{t('pendingDealsSection')}</h2>
          <span className="text-xs font-bold text-slate-500 tabular-nums">{pendingCount}</span>
        </div>
        {pendingDealTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f8f9fa] p-6 text-center text-sm font-medium text-slate-600">
            {t('queueNoPendingCounteroffers')}
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDealTrips.map((trip) => (
              <DriverDashboardTripCard
                key={trip.id}
                trip={trip}
                dealVariant="pending_counteroffer"
                showListen={false}
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
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 truncate">{t('availableRideRequestsSection')}</h2>
            <span className="inline-flex min-w-[28px] justify-center rounded-full bg-[#1a73e8]/12 px-2 py-0.5 text-xs font-extrabold text-[#1557b0] shrink-0">
              {availableCount}
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>{t('sortLabel')}:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 shadow-sm max-w-[min(100%,220px)]"
            >
              <option value="nearest">{t('sortNearest')}</option>
              <option value="fare">{t('sortByFare')}</option>
              <option value="eta">{t('sortByTime')}</option>
            </select>
          </label>
        </div>

        {isOnTrip && sortedOpenTrips.length > 0 ? (
          <div className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{t('requestsPausedWhileOnTrip')}</div>
        ) : null}

        {showOfflineQueueHint && sortedOpenTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f8f9fa] p-8 text-center space-y-2">
            <div className="text-sm font-semibold text-slate-800">{t('queueGoOnlineForRequests')}</div>
          </div>
        ) : sortedOpenTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f8f9fa] p-8 text-center space-y-2">
            <div className="text-sm font-semibold text-slate-800">{t('queueEmptyReadyListening')}</div>
            <div className="text-xs font-medium text-slate-600">{t('queueEmptyStayOnline')}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedOpenTrips.map((trip) => (
              <DriverDashboardTripCard
                key={trip.id}
                trip={trip}
                showListen
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
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-900">{t('recentCompletedSection')}</h2>
          <Link to={GW_PATHS.driver.history} className="text-xs font-bold text-[#1557b0] no-underline hover:underline">
            {t('history')}
          </Link>
        </div>
        {recentCompletedTrips.length === 0 ? (
          <div className="mt-2 text-sm text-slate-500">—</div>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {recentCompletedTrips.slice(0, 5).map((trip) => (
              <li key={trip.id} className="flex justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
                <span className="truncate min-w-0">
                  {trip.pickup.label} → {trip.dropoff.label}
                </span>
                <span className="text-xs text-slate-500 shrink-0">{trip.completedAtIso?.slice(0, 10) ?? trip.updatedAtIso.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <Link to={GW_PATHS.driver.dashboard} className="font-bold text-[#1557b0] no-underline hover:underline">
          ← {t('driverDashboard')}
        </Link>
        {completedLifetime > 0 ? (
          <span className="tabular-nums">
            {t('completedTripsLabel')}: {completedLifetime}
          </span>
        ) : null}
      </div>

      {import.meta.env.DEV ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-[10px] font-mono text-slate-700 space-y-1">
          <div>
            {t('dashboardDebugSource')}: {dashboardStale ? t('dashboardDebugCache') : t('dashboardDebugBackend')}
          </div>
          <div>driverId {user?.id ?? '—'}</div>
          <div>activeTripId {activeTrip?.id ?? '—'}</div>
        </div>
      ) : null}
    </div>
  );
};

export default DriverQueuePage;
