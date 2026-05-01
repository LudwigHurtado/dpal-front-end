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
  const hasDriverLocation = Boolean(
    ride.driverLocation && Number.isFinite(ride.driverLocation.lat) && Number.isFinite(ride.driverLocation.lng),
  );

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
    <div style={{ position: 'relative', height: 'calc(100dvh - 96px)', minHeight: 560, overflow: 'hidden', borderRadius: 20 }}>
      <TripMapPanel trip={ride} variant="passenger" height="100%" />

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          zIndex: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
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
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          zIndex: 500,
          padding: 14,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
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

export default PassengerDashboardPage;
