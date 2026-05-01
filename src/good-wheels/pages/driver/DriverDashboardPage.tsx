import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuthStore } from '../../store/useAuthStore';
import { useDriverStore } from '../../features/driver/driverStore';
import DriverDashboardTripCard from '../../features/driver/components/DriverDashboardTripCard';
import { GW_PATHS } from '../../routes/paths';
import { useGwLang } from '../../i18n/useGwLang';
import { useTripStore } from '../../features/trips/tripStore';
import type { Trip } from '../../features/trips/tripTypes';
import { fareBasisForTrip, formatMoneyFromCents } from '../../features/trips/utils/fareSplit';
import { goodWheelsRideApi } from '../../services/adapters/goodWheelsApi';
import TripMapPanel from '../../features/trips/components/TripMapPanel';

/* ── Compact live map for driver dashboard ─────────────────────────────── */
type DriverMapProps = {
  driverPos: [number, number] | null;
  requestPickups: [number, number][];
};

function FitDriverView({ driverPos, requestPickups }: DriverMapProps) {
  const map = useMap();
  const lastRef = useRef('');
  useEffect(() => {
    const pts = [...(driverPos ? [driverPos] : []), ...requestPickups];
    if (!pts.length) return;
    const sig = JSON.stringify(pts.map(([a, b]) => [+a.toFixed(3), +b.toFixed(3)]));
    if (lastRef.current === sig) return;
    lastRef.current = sig;
    if (pts.length === 1) { map.setView(pts[0], 13); return; }
    const b = L.latLngBounds(pts);
    if (b.isValid()) map.fitBounds(b, { padding: [32, 32], maxZoom: 14 });
  }, [map, driverPos, requestPickups]);
  return null;
}

const DriverLiveMap: React.FC<DriverMapProps> = ({ driverPos, requestPickups }) => {
  const center: [number, number] = driverPos ?? [40.7128, -74.006];
  return (
    <MapContainer center={center} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl={false} attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      {/* Available ride request pickups — green dots */}
      {requestPickups.map((pos, i) => (
        <CircleMarker key={i} center={pos} radius={10}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 0.9 }} />
      ))}
      {/* Driver position — blue dot */}
      {driverPos && (
        <>
          <CircleMarker center={driverPos} radius={20}
            pathOptions={{ color: '#0077C8', weight: 0, fillColor: '#0077C8', fillOpacity: 0.15 }} />
          <CircleMarker center={driverPos} radius={9}
            pathOptions={{ color: '#fff', weight: 3, fillColor: '#0077C8', fillOpacity: 1 }} />
        </>
      )}
      <FitDriverView driverPos={driverPos} requestPickups={requestPickups} />
    </MapContainer>
  );
};

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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

const DriverDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const user = useAuthStore((s) => s.user);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const lastTerminalTrip = useTripStore((s) => s.lastTerminalTrip);
  const clearLastTerminalTrip = useTripStore((s) => s.clearLastTerminalTrip);
  const clearTripStoreActiveTrip = useTripStore((s) => s.clearActiveTrip);
  const setTripStoreActiveTrip = useTripStore((s) => s.setActiveTrip);
  const hydrate = useDriverStore((s) => s.hydrate);
  const clearDriverActiveTrip = useDriverStore((s) => s.clearActiveTrip);
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
  const performanceSummary = useDriverStore((s) => s.performanceSummary);

  const [sortBy, setSortBy] = useState<SortKey>('nearest');
  const [tripActionLoading, setTripActionLoading] = useState<'cancel' | 'close' | 'reset' | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState<string | null>(null);
  const [tripActionError, setTripActionError] = useState<string | null>(null);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [driverGeoPos, setDriverGeoPos] = useState<[number, number] | null>(null);

  // Try to get driver's real location for the map
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setDriverGeoPos([pos.coords.latitude, pos.coords.longitude]),
      () => { /* no-op — map will fall back to default city */ },
      { timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    // Clear stale localStorage cache on mount so old fake/test rides don't reappear.
    const uid = useAuthStore.getState().user?.id;
    if (uid) {
      try { localStorage.removeItem(`good-wheels-driver-dashboard-cache-${uid}`); } catch { /* ignore */ }
    }
    void hydrate();
    const timer = window.setInterval(() => void hydrate(), 20000);
    return () => window.clearInterval(timer);
  }, [hydrate]);

  useEffect(() => {
    if (!activeTrip || !user?.id) return;
    const belongsToDriver = activeTrip.driverId === user.id;
    if (!belongsToDriver) {
      clearTripStoreActiveTrip();
      clearDriverActiveTrip();
    }
  }, [activeTrip, user?.id, clearTripStoreActiveTrip, clearDriverActiveTrip]);

  const openTrips = useMemo(
    () => queueItems.filter((trip) => ['requested', 'broadcasted', 'matched'].includes(trip.status)),
    [queueItems],
  );

  const sortedOpenTrips = useMemo(() => {
    const arr = [...openTrips];
    if (sortBy === 'nearest') arr.sort((a, b) => a.estimate.distanceKm - b.estimate.distanceKm);
    if (sortBy === 'fare') arr.sort((a, b) => tripOfferSortCents(b) - tripOfferSortCents(a));
    if (sortBy === 'eta')
      arr.sort(
        (a, b) =>
          (a.routeSummary?.durationMinutes ?? a.estimate.etaMinutes) - (b.routeSummary?.durationMinutes ?? b.estimate.etaMinutes),
      );
    return arr;
  }, [openTrips, sortBy]);

  const isOnTrip = Boolean(
    activeTrip &&
      user?.id &&
      activeTrip.driverId === user.id &&
      ACTIVE_TRIP_STATUSES.has(activeTrip.status),
  );

  // Pickup locations of open ride requests — shown as green dots on the driver map
  const requestPickups = useMemo<[number, number][]>(() =>
    openTrips
      .filter((t) => t.pickup.point && Number.isFinite(t.pickup.point.lat) && Number.isFinite(t.pickup.point.lng))
      .map((t) => [t.pickup.point!.lat, t.pickup.point!.lng] as [number, number]),
  [openTrips]);

  const availableCount = dashboardSummary?.availableCount ?? openTrips.length;

  const completedToday = dashboardSummary?.completedToday ?? 0;
  const todayEarningsDisplay = '—';

  const completedLifetime =
    dashboardSummary?.completedTrips ?? performanceSummary?.completedTrips ?? 0;
  const ratingDisplay = typeof performanceSummary?.rating === 'number' ? performanceSummary.rating.toFixed(1) : '—';
  const trustDisplay = typeof performanceSummary?.trustScore === 'number' ? `${performanceSummary.trustScore}%` : '—';

  const activeTripsDisplay = isOnTrip ? 1 : 0;

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

  const lastSyncedLabel = useMemo(() => {
    if (!lastDashboardSyncIso) return null;
    try {
      return new Date(lastDashboardSyncIso).toLocaleString();
    } catch {
      return lastDashboardSyncIso;
    }
  }, [lastDashboardSyncIso]);

  const onlineHoursDisplay = t('driverOnlineHoursUnavailable');

  const releaseActiveTrip = async (mode: 'cancel' | 'close' | 'reset') => {
    if (!activeTrip) return;
    setTripActionLoading(mode);
    setTripActionError(null);
    try {
      if (mode === 'cancel') {
        await goodWheelsRideApi.cancelTrip(activeTrip.id, 'Driver cancelled from dashboard', {
          role: 'driver',
          userId: user?.id ?? activeTrip.driverId,
        });
      } else if (mode === 'close') {
        await goodWheelsRideApi.completeTrip(activeTrip.id, 'Driver closed trip from dashboard');
      } else {
        await goodWheelsRideApi.cancelTrip(activeTrip.id, 'Driver reset stale trip from dashboard', {
          role: 'driver',
          userId: user?.id ?? activeTrip.driverId,
        });
      }
      clearTripStoreActiveTrip();
      clearDriverActiveTrip();
      void setAvailability('online');
      await hydrate();
    } catch (e) {
      setTripActionError(e instanceof Error ? e.message : 'Could not update active ride right now.');
    } finally {
      setTripActionLoading(null);
    }
  };

  const updateActiveTripStatus = async (
    status: Trip['status'],
    label: string,
    detail?: string,
  ) => {
    if (!activeTrip) return;
    setStatusActionLoading(status);
    setTripActionError(null);
    try {
      const next =
        status === 'completed'
          ? await goodWheelsRideApi.completeTrip(activeTrip.id, detail ?? 'Trip completed by driver')
          : await goodWheelsRideApi.updateTripStatus(activeTrip.id, status, label, detail);
      setTripStoreActiveTrip(next);
      await hydrate();
    } catch (e) {
      setTripActionError(e instanceof Error ? e.message : 'Could not update ride status right now.');
    } finally {
      setStatusActionLoading(null);
    }
  };

  const shareDriverLocationOnce = async () => {
    if (!activeTrip || !user?.id) return;
    if (!('geolocation' in navigator)) {
      setTripActionError('Location is not available in this browser.');
      return;
    }
    setStatusActionLoading('driver-location');
    setTripActionError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          try {
            const next = await goodWheelsRideApi.updateDriverLocation(activeTrip.id, {
              driverId: user.id,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: Number.isFinite(pos.coords.heading ?? NaN) ? Number(pos.coords.heading) : undefined,
            });
            setTripStoreActiveTrip(next);
            await hydrate();
          } catch (e) {
            setTripActionError(e instanceof Error ? e.message : 'Could not share driver location.');
          } finally {
            setStatusActionLoading(null);
          }
        })();
      },
      () => {
        setTripActionError('Location permission was denied.');
        setStatusActionLoading(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 },
    );
  };

  return (
    <div className="gw-driver-dashboard space-y-5 pb-8">

      {/* ── LIVE MAP — primary view ──────────────────────────────────── */}
      <div style={{ borderRadius: 20, overflow: 'hidden', height: 320, position: 'relative', boxShadow: '0 4px 20px rgba(15,23,42,0.12)' }}>
        {isOnTrip && activeTrip ? (
          <TripMapPanel trip={activeTrip} variant="driver" height="100%" />
        ) : (
          <DriverLiveMap driverPos={driverGeoPos} requestPickups={requestPickups} />
        )}
        {/* map overlay: status pill + availability toggle */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 400, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 99, padding: '6px 14px', fontSize: 13, fontWeight: 800, color: '#0f172a', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
            {isOnTrip ? 'Active ride route' : 'Good Wheels Driver'}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.95)', borderRadius: 99, padding: '6px 12px', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: isOnlineUi ? '#16a34a' : availabilityStatus === 'offline' ? '#dc2626' : '#64748b' }}>
              {onlineLabel}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isOnlineUi}
              disabled={availabilityToggleDisabled}
              onClick={() => setAvailability(isOnlineUi ? 'offline' : 'online')}
              style={{ width: 40, height: 22, borderRadius: 99, border: 'none', cursor: availabilityToggleDisabled ? 'not-allowed' : 'pointer', background: isOnlineUi ? '#16a34a' : '#94a3b8', position: 'relative', transition: 'background 200ms', opacity: availabilityToggleDisabled ? 0.5 : 1 }}
            >
              <span style={{ position: 'absolute', top: 3, left: isOnlineUi ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
        </div>
        {/* request count badge */}
        {!isOnTrip && availableCount > 0 && (
          <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 400, background: '#16a34a', color: '#fff', borderRadius: 99, padding: '5px 12px', fontSize: 12, fontWeight: 800, boxShadow: '0 2px 8px rgba(22,163,74,0.4)' }}>
            {availableCount} ride{availableCount !== 1 ? 's' : ''} nearby
          </div>
        )}
        {isOnTrip && activeTrip && (
          <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 400, background: '#1a73e8', color: '#fff', borderRadius: 99, padding: '5px 12px', fontSize: 12, fontWeight: 800, boxShadow: '0 2px 8px rgba(26,115,232,0.4)' }}>
            On a trip
          </div>
        )}
      </div>

      {/* ── LOCAL TOP BAR ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">{t('driverAppTitle')}</h1>
          <p className="text-xs text-slate-500 font-medium">{t('driverDispatchSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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
            <span
              className={`text-xs font-bold ${
                isOnlineUi ? 'text-emerald-700' : availabilityStatus === 'offline' ? 'text-red-700' : 'text-slate-500'
              }`}
            >
              {onlineLabel}
            </span>
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

      <section
        className="relative overflow-hidden rounded-2xl border border-[#1a73e8]/25 p-4 sm:p-5 text-white"
        style={{
          backgroundImage:
            "linear-gradient(115deg, rgba(13,59,102,0.92), rgba(26,115,232,0.80)), url('/main-screen/dpal-work-network.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 max-w-2xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-cyan-100">DPAL Driver Mission</p>
          <h2 className="mt-1 text-lg sm:text-xl font-black tracking-tight">Safe rides. Real community impact.</h2>
          <p className="mt-1.5 text-sm font-medium text-blue-50/95">
            Keep families moving with verified pickups, transparent timelines, and trusted driver controls.
          </p>
        </div>
      </section>

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

      {lastTerminalTrip && (lastTerminalTrip.status === 'cancelled' || lastTerminalTrip.status === 'canceled') ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 space-y-3">
          <div className="text-sm font-extrabold text-rose-900">Ride canceled</div>
          <div className="text-sm text-rose-900">
            {lastTerminalTrip.cancelledByRole === 'passenger'
              ? 'The passenger canceled this ride.'
              : lastTerminalTrip.cancelledByRole === 'driver'
                ? 'You canceled this ride.'
                : 'This ride was canceled.'}
            {lastTerminalTrip.cancelReason ? ` Reason: ${lastTerminalTrip.cancelReason}` : ''}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="gw-button gw-button-primary"
              onClick={() => {
                void setAvailability('online');
                void hydrate();
              }}
            >
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

      {/* ── STATS / EARNINGS — collapsible ─────────────────────── */}
      <button
        type="button"
        onClick={() => setStatsExpanded((v) => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>📊 Earnings &amp; Stats</span>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>{statsExpanded ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {/* Profile + hero stats */}
      {statsExpanded && <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-white shadow-inner"
            style={{ background: 'linear-gradient(145deg, #1a73e8, #1557b0)' }}
            aria-hidden
          >
            {initials(driverProfile?.fullName ?? user?.fullName ?? 'GW')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-extrabold text-slate-900 truncate">{driverProfile?.fullName ?? user?.fullName ?? '—'}</div>
            <div className="mt-0.5 text-sm text-slate-600">
              {tf('driverRatingTripsLine', {
                rating: ratingDisplay,
                trips: completedLifetime,
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-900/80">{t('todaysEarnings')}</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">{todayEarningsDisplay}</div>
            <div className="mt-1 text-xs font-semibold text-emerald-700">Live earnings not connected</div>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-sky-900/80">{t('activeTrip')}</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">{activeTripsDisplay}</div>
            <div className="mt-1 text-xs font-medium text-sky-900/70">{isOnTrip ? t('onTrip') : t('noActiveTripShort')}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { icon: '🕐', label: t('perfOnlineLabel'), value: onlineHoursDisplay },
            { icon: '🚗', label: t('perfCompletedLabel'), value: String(completedLifetime) },
            { icon: '⭐', label: t('perfRatingLabel'), value: ratingDisplay },
            { icon: '🎯', label: t('perfAcceptanceLabel'), value: trustDisplay },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-[#f8f9fa] px-3 py-2.5">
              <span className="text-lg leading-none" aria-hidden>
                {row.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 truncate">{row.label}</div>
                <div className="text-sm font-extrabold text-slate-900 truncate">{row.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>}

      {isOnTrip && activeTrip ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-900">{t('youAreOnTrip')}</div>
              <div className="text-sm font-semibold text-emerald-950">
                {activeTrip.pickup.label} → {activeTrip.dropoff.label}
              </div>
            </div>
            <Link to={GW_PATHS.driver.active} className="gw-driver-dash-btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white no-underline inline-flex justify-center">
              {t('resumeActiveTripCta')}
            </Link>
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-900 mb-2">Ride flow</div>
            <div className="flex flex-wrap gap-2">
              {activeTrip.status === 'accepted' ? (
                <button
                  type="button"
                  className="gw-button gw-button-primary"
                  disabled={statusActionLoading !== null}
                  onClick={() => void updateActiveTripStatus('driver_en_route', 'Driver en route', 'Driver is heading to pickup.')}
                >
                  {statusActionLoading === 'driver_en_route' ? 'Updating...' : 'Driver en route'}
                </button>
              ) : null}
              {activeTrip.status === 'driver_en_route' || activeTrip.status === 'driver_arriving' ? (
                <button
                  type="button"
                  className="gw-button gw-button-primary"
                  disabled={statusActionLoading !== null}
                  onClick={() => void updateActiveTripStatus('driver_arrived', 'Driver arrived', 'Driver reached pickup.')}
                >
                  {statusActionLoading === 'driver_arrived' ? 'Updating...' : 'Driver arrived'}
                </button>
              ) : null}
              {activeTrip.status === 'driver_arrived' || activeTrip.status === 'arrived' ? (
                <button
                  type="button"
                  className="gw-button gw-button-primary"
                  disabled={statusActionLoading !== null}
                  onClick={() => void updateActiveTripStatus('in_progress', 'Trip started', 'Passenger is onboard.')}
                >
                  {statusActionLoading === 'in_progress' ? 'Updating...' : 'Start ride'}
                </button>
              ) : null}
              {activeTrip.status === 'passenger_onboard' || activeTrip.status === 'in_progress' || activeTrip.status === 'support_in_progress' ? (
                <button
                  type="button"
                  className="gw-button gw-button-primary"
                  disabled={statusActionLoading !== null}
                  onClick={() => void updateActiveTripStatus('completed', 'Ride completed', 'Trip completed by driver.')}
                >
                  {statusActionLoading === 'completed' ? 'Completing...' : 'Complete ride'}
                </button>
              ) : null}
              <button
                type="button"
                className="gw-button gw-button-secondary"
                disabled={statusActionLoading !== null}
                onClick={() => void shareDriverLocationOnce()}
              >
                {statusActionLoading === 'driver-location' ? 'Sharing...' : 'Share location'}
              </button>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-900 mb-2">Trip controls</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="gw-button"
                onClick={() => void releaseActiveTrip('cancel')}
                disabled={tripActionLoading !== null}
                style={{ background: 'rgba(220,38,38,0.12)', color: '#991b1b' }}
              >
                {tripActionLoading === 'cancel' ? 'Cancelling…' : 'Cancel this ride'}
              </button>
              <button
                type="button"
                className="gw-button gw-button-secondary"
                onClick={() => void releaseActiveTrip('close')}
                disabled={tripActionLoading !== null}
              >
                {tripActionLoading === 'close' ? 'Closing…' : 'Close ride and finish'}
              </button>
              <button
                type="button"
                className="gw-button gw-button-primary"
                onClick={() => void releaseActiveTrip('reset')}
                disabled={tripActionLoading !== null}
              >
                {tripActionLoading === 'reset' ? 'Resetting…' : 'Continue searching for passengers'}
              </button>
            </div>
          </div>
          {tripActionError ? <div className="text-xs font-semibold text-rose-700">{tripActionError}</div> : null}
        </div>
      ) : null}

      {pendingDealTrips.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-900">{t('pendingDealsSection')}</h2>
          </div>
          <div className="space-y-3">
            {pendingDealTrips.map((trip) => (
              <DriverDashboardTripCard
                key={trip.id}
                trip={trip}
                dealVariant="pending_counteroffer"
                onAccept={() => {
                  if (!user?.id) return;
                  void acceptQueueTrip(trip.id).then((next) => {
                    if (next) void hydrate();
                  });
                }}
                onDecline={() => void useDriverStore.getState().declineQueueTrip(trip.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-slate-900">{t('availableTripsSection')}</h2>
            <span className="inline-flex min-w-[28px] justify-center rounded-full bg-[#1a73e8]/12 px-2 py-0.5 text-xs font-extrabold text-[#1557b0]">
              {availableCount}
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>{t('sortLabel')}:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 shadow-sm"
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

        {sortedOpenTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f8f9fa] p-8 text-center text-sm font-medium text-slate-600">{t('noAvailableRideRequests')}</div>
        ) : (
          <div className="space-y-3">
            {sortedOpenTrips.map((trip) => (
              <DriverDashboardTripCard
                key={trip.id}
                trip={trip}
                onAccept={() => {
                  if (!user?.id) return;
                  void acceptQueueTrip(trip.id).then((next) => {
                    if (next) void hydrate();
                  });
                }}
                onDecline={() => void useDriverStore.getState().declineQueueTrip(trip.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-900">{t('recentCompletedSection')}</h2>
        {recentCompletedTrips.length === 0 ? (
          <div className="mt-2 text-sm text-slate-500">—</div>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {recentCompletedTrips.slice(0, 6).map((trip) => (
              <li key={trip.id} className="flex justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
                <span className="truncate">
                  {trip.pickup.label} → {trip.dropoff.label}
                </span>
                <span className="text-xs text-slate-500 shrink-0">{trip.completedAtIso?.slice(0, 10) ?? trip.updatedAtIso.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/90 px-4 py-3 text-sm text-sky-950">
        <span className="text-xl shrink-0" aria-hidden>
          🛡️
        </span>
        <p className="font-semibold leading-snug">{t('safetyCommunityBanner')}</p>
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

export default DriverDashboardPage;
