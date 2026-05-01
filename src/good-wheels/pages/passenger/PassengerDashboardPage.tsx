import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerLocationPicker from '../../features/passenger/components/PassengerLocationPicker';
import TripMapPanel from '../../features/trips/components/TripMapPanel';
import TripStatusBadge from '../../features/trips/components/TripStatusBadge';
import { TERMINAL_STATUSES } from '../../features/trips/tripConstants';
import { useTripStore } from '../../features/trips/tripStore';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';
import { useGwLang } from '../../i18n/useGwLang';
import { goodWheelsRideApi } from '../../services/adapters/goodWheelsApi';
import PassengerDriverCounterofferBlock, { passengerHasPendingDriverCounter } from '../../features/passenger/components/PassengerDriverCounterofferBlock';
import { formatMoneyFromCents } from '../../features/trips/utils/fareSplit';

const SEARCHING_STATUSES = new Set(['requested', 'broadcasted', 'matched']);
const ACTIVE_STATUSES = new Set([
  'requested',
  'broadcasted',
  'matched',
  'accepted',
  'driver_en_route',
  'driver_arriving',
  'driver_arrived',
  'arrived',
  'passenger_onboard',
  'in_progress',
  'support_in_progress',
]);

function SearchingBeacon(): React.ReactElement {
  return (
    <div aria-hidden style={{ position: 'relative', width: 54, height: 54, flex: '0 0 auto' }}>
      <style>{`
        @keyframes gwBeaconPulse {
          0% { transform: scale(0.45); opacity: 0.75; }
          70% { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
      `}</style>
      {[0, 0.65, 1.3].map((delay) => (
        <span
          key={delay}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(26,115,232,0.22)',
            animation: `gwBeaconPulse 1.9s ease-out ${delay}s infinite`,
          }}
        />
      ))}
      <span
        style={{
          position: 'absolute',
          left: 17,
          top: 17,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#1a73e8',
          border: '3px solid #fff',
          boxShadow: '0 4px 14px rgba(26,115,232,0.35)',
        }}
      />
    </div>
  );
}

const PassengerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const hydrate = useTripStore((s) => s.hydrate);
  const clearActiveTrip = useTripStore((s) => s.clearActiveTrip);
  const setActiveTrip = useTripStore((s) => s.setActiveTrip);
  const loading = useTripStore((s) => s.loading);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    void hydrate(user.id);
    const id = window.setInterval(() => void hydrate(user.id), 6000);
    return () => window.clearInterval(id);
  }, [hydrate, user?.id]);

  const ride = useMemo(() => {
    if (!activeTrip || TERMINAL_STATUSES.has(activeTrip.status)) return null;
    if (!ACTIVE_STATUSES.has(activeTrip.status)) return null;
    return activeTrip;
  }, [activeTrip]);

  if (!ride) return <PassengerLocationPicker />;

  const searching = SEARCHING_STATUSES.has(ride.status);
  const hasCounteroffer = passengerHasPendingDriverCounter(ride);
  const hasDriverLocation = Boolean(
    ride.driverLocation && Number.isFinite(ride.driverLocation.lat) && Number.isFinite(ride.driverLocation.lng),
  );
  const distanceLabel =
    typeof ride.routeProgress?.remainingDistanceKm === 'number'
      ? `${ride.routeProgress.remainingDistanceKm.toFixed(1)} km remaining`
      : typeof ride.estimate?.distanceKm === 'number'
        ? `${ride.estimate.distanceKm.toFixed(1)} km route`
        : null;
  const etaLabel =
    typeof ride.routeProgress?.remainingEtaMinutes === 'number'
      ? `${Math.round(ride.routeProgress.remainingEtaMinutes)} min remaining`
      : typeof ride.estimate?.etaMinutes === 'number'
        ? `${Math.round(ride.estimate.etaMinutes)} min estimate`
        : null;
  const fareLabel =
    typeof ride.offerState?.driverCounterOfferCents === 'number' && ride.offerState.status === 'driver_countered'
      ? formatMoneyFromCents(ride.offerState.driverCounterOfferCents)
      : typeof ride.offerState?.passengerOfferCents === 'number'
        ? formatMoneyFromCents(ride.offerState.passengerOfferCents)
        : typeof ride.estimate?.totalFareCents === 'number'
          ? formatMoneyFromCents(ride.estimate.totalFareCents)
          : null;

  const title = searching
    ? 'Looking for your driver'
    : ride.status === 'accepted'
      ? hasDriverLocation
        ? 'Driver accepted and is being tracked'
        : 'Driver accepted'
      : ['driver_en_route', 'driver_arriving'].includes(ride.status)
        ? 'Driver is on the way'
        : ['driver_arrived', 'arrived'].includes(ride.status)
          ? 'Driver arrived'
          : ['passenger_onboard', 'in_progress', 'support_in_progress'].includes(ride.status)
            ? 'Ride in progress'
            : t('activeTrip');

  const cancelRide = async () => {
    if (!user?.id) return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      const next = await goodWheelsRideApi.cancelTrip(ride.id, 'Passenger cancelled from dashboard', {
        role: 'passenger',
        userId: user.id,
      });
      setActiveTrip(next);
      clearActiveTrip();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Could not cancel ride.');
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 'calc(100dvh - 96px)' }}>
      {hasCounteroffer ? (
        <div style={{ position: 'relative', zIndex: 1200 }}>
          <PassengerDriverCounterofferBlock trip={ride} variant="hero" />
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px',
          borderRadius: 18,
          background: '#fff',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 8px 26px rgba(15,23,42,0.18)',
        }}
      >
        {searching ? <SearchingBeacon /> : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <TripStatusBadge status={ride.status} />
            {loading ? <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Syncing</span> : null}
          </div>
          <div style={{ marginTop: 5, fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{title}</div>
          <div style={{ marginTop: 3, fontSize: 12, fontWeight: 650, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ride.pickup.addressLine} to {ride.dropoff.addressLine}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {distanceLabel ? <MetricPill label={distanceLabel} /> : null}
            {etaLabel ? <MetricPill label={etaLabel} /> : null}
            {fareLabel ? <MetricPill label={fareLabel} /> : null}
          </div>
        </div>
        <button
          type="button"
          className="gw-button gw-button-secondary"
          onClick={() => setMapExpanded((v) => !v)}
          style={{ flex: '0 0 auto' }}
        >
          {mapExpanded ? 'Hide map' : 'Show map'}
        </button>
      </div>

      {mapExpanded ? (
        <div style={{ position: 'relative', height: hasCounteroffer ? 'min(48dvh, 420px)' : 'min(64dvh, 620px)', minHeight: 300, overflow: 'hidden', borderRadius: 20 }}>
          <TripMapPanel trip={ride} variant="passenger" height="100%" />
          <button
            type="button"
            className="gw-button gw-button-secondary"
            onClick={() => setMapExpanded(false)}
            style={{ position: 'absolute', top: 12, right: 12, zIndex: 700, background: 'rgba(255,255,255,0.96)' }}
          >
            Close map
          </button>
        </div>
      ) : (
        <div style={{ borderRadius: 18, padding: 14, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', fontSize: 13, fontWeight: 750 }}>
          Map is hidden. Your ride is still active and syncing in the background.
        </div>
      )}

      <div
        style={{
          padding: 14,
          borderRadius: 18,
          background: '#fff',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 8px 26px rgba(15,23,42,0.18)',
        }}
      >
        {searching ? (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
            Your request is still active. Drivers can see it, and this dashboard will update when a driver accepts.
          </div>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
            {ride.driverSnapshot?.fullName ?? t('verifiedDriver')}
            {ride.driverSnapshot?.vehicle?.makeModel ? ` - ${ride.driverSnapshot.vehicle.makeModel}` : ''}
            {hasDriverLocation && ride.driverLocation ? (
              <span style={{ display: 'block', marginTop: 3, fontSize: 11, color: '#64748b' }}>
                Last driver location update: {new Date(ride.driverLocation.updatedAtIso).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        )}

        {cancelError ? <div className="gw-error" style={{ marginTop: 8 }}>{cancelError}</div> : null}

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" className="gw-button gw-button-primary" style={{ flex: 1 }} onClick={() => navigate(GW_PATHS.passenger.active)}>
            Ride details
          </button>
          <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.passenger.dashboard)}>
            Dashboard
          </button>
          <button type="button" className="gw-button gw-button-secondary" onClick={() => void hydrate(user?.id ?? '')} disabled={!user?.id}>
            Refresh
          </button>
          {searching ? (
            <button type="button" className="gw-button gw-button-secondary" onClick={() => void cancelRide()} disabled={cancelBusy}>
              {cancelBusy ? 'Cancelling...' : 'Cancel'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const MetricPill: React.FC<{ label: string }> = ({ label }) => (
  <span style={{ borderRadius: 999, background: '#f1f5f9', color: '#334155', padding: '4px 8px', fontSize: 11, fontWeight: 800 }}>
    {label}
  </span>
);

export default PassengerDashboardPage;
