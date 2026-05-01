import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip } from '../../trips/tripTypes';
import { useTripStore } from '../../trips/tripStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { GW_PATHS } from '../../../routes/paths';
import { useGwLang } from '../../../i18n/useGwLang';
import TripMapPanel from '../../trips/components/TripMapPanel';
import TripChatPanel from '../../trips/components/TripChatPanel';
import TripStatusBadge from '../../trips/components/TripStatusBadge';
import { useTripActions } from '../../trips/hooks/useTripActions';
import { goodWheelsRideApi } from '../../../services/adapters/goodWheelsApi';

const DriverBackendActiveTripView: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const hydrate = useTripStore((s) => s.hydrate);
  const setActiveTrip = useTripStore((s) => s.setActiveTrip);
  const { markDriverArriving, markDriverArrived, startTrip, completeTrip } = useTripActions('driver', trip);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [sharingError, setSharingError] = useState<string | null>(null);
  const [sharingUpdatedAtIso, setSharingUpdatedAtIso] = useState<string | null>(null);
  const [tripActionLoading, setTripActionLoading] = useState<'cancel' | 'close' | 'reset' | null>(null);
  const [tripActionError, setTripActionError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);

  const canShareLocation = useMemo(
    () => ['accepted', 'driver_en_route', 'driver_arriving', 'driver_arrived', 'arrived', 'passenger_onboard', 'in_progress', 'support_in_progress'].includes(trip.status),
    [trip.status],
  );

  const pushDriverLocation = async () => {
    if (!user?.id || !trip.driverId || trip.driverId !== user.id) return;
    if (!('geolocation' in navigator)) { setSharingError(t('locationSharingDenied')); return; }
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void (async () => {
            try {
              const updated = await goodWheelsRideApi.updateDriverLocation(trip.id, {
                driverId: user.id,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                heading: Number.isFinite(pos.coords.heading ?? NaN) ? Number(pos.coords.heading) : undefined,
              });
              setActiveTrip(updated);
              setSharingUpdatedAtIso(new Date().toISOString());
              setSharingError(null);
            } catch (e) {
              setSharingError(e instanceof Error ? e.message : t('tripStatusUpdateError'));
            } finally { resolve(); }
          })();
        },
        () => { setSharingError(t('locationSharingDenied')); resolve(); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 },
      );
    });
  };

  useEffect(() => {
    if (!user?.id) return;
    const tick = () => void hydrate(user.id);
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [hydrate, user?.id]);

  useEffect(() => {
    if (!sharingLocation || !canShareLocation) return;
    void pushDriverLocation();
    const id = window.setInterval(() => void pushDriverLocation(), 12000);
    return () => window.clearInterval(id);
  }, [sharingLocation, canShareLocation, trip.id, user?.id]);

  useEffect(() => {
    if (!canShareLocation && sharingLocation) setSharingLocation(false);
  }, [canShareLocation, sharingLocation]);

  const threadId = trip.chatThreadId ?? `good-wheels-trip-${trip.id}`;
  const isCancelled = trip.status === 'cancelled' || trip.status === 'canceled';

  const releaseTrip = async (mode: 'cancel' | 'close' | 'reset') => {
    setTripActionLoading(mode);
    setTripActionError(null);
    try {
      if (mode === 'cancel') {
        await goodWheelsRideApi.cancelTrip(trip.id, 'Driver cancelled from active trip view', { role: 'driver', userId: user?.id ?? trip.driverId });
      } else if (mode === 'close') {
        await goodWheelsRideApi.completeTrip(trip.id, 'Driver closed trip from active trip view');
      } else {
        try { await goodWheelsRideApi.cancelTrip(trip.id, 'Driver reset stale trip', { role: 'driver', userId: user?.id ?? trip.driverId }); } catch { /* ok */ }
      }
      useTripStore.getState().clearActiveTrip();
      navigate(GW_PATHS.driver.dashboard);
    } catch (e) {
      setTripActionError(e instanceof Error ? e.message : 'Could not update this trip right now.');
    } finally { setTripActionLoading(null); }
  };

  return (
    <div style={{ position: 'relative', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a' }}>

      {/* ── CHAT SLIDE-UP ───────────────────────────────────────── */}
      {chatOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 300, background: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', gap: 12 }}>
            <button type="button" onClick={() => setChatOpen(false)} style={{ fontWeight: 800, color: '#0077C8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              ← Map
            </button>
            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{t('chatWithPassenger')}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <TripChatPanel threadId={threadId} role="driver" userId={user?.id ?? trip.driverId ?? ''} userName={user?.fullName ?? 'Driver'} title={t('chatWithPassenger')} />
          </div>
        </div>
      )}

      {/* ── MAP — fills the full screen ─────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <TripMapPanel trip={trip} variant="driver" height="100%" />
      </div>

      {/* ── BOTTOM SHEET ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        zIndex: 150,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -4px 32px rgba(15,23,42,0.18)',
        padding: '16px 16px max(16px, env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {/* drag handle */}
        <button type="button" onClick={() => setControlsExpanded((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: '#cbd5e1' }} />
        </button>

        {/* Status + primary action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <TripStatusBadge status={trip.status} />
          <div style={{ flex: 1 }} />
          {trip.status === 'accepted' && (
            <button type="button" className="gw-button gw-button-primary" onClick={() => void markDriverArriving()}>
              {t('driverEnRoute')}
            </button>
          )}
          {trip.status === 'driver_en_route' && (
            <button type="button" className="gw-button gw-button-primary" onClick={() => void markDriverArrived()}>
              {t('driverArrived')}
            </button>
          )}
          {trip.status === 'driver_arrived' && (
            <button type="button" className="gw-button gw-button-primary" onClick={() => void startTrip()}>
              {t('startRide')}
            </button>
          )}
          {(trip.status === 'in_progress' || trip.status === 'passenger_onboard') && (
            <button type="button" className="gw-button gw-button-primary" onClick={() => void completeTrip()}>
              {t('completeRide')}
            </button>
          )}
        </div>

        {/* Route summary */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#475569', fontWeight: 600, flexWrap: 'wrap' }}>
          <span style={{ color: '#16a34a', fontWeight: 800 }}>●</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40vw' }}>{trip.pickup.addressLine}</span>
          <span style={{ color: '#94a3b8' }}>→</span>
          <span style={{ color: '#dc2626', fontWeight: 800 }}>●</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40vw' }}>{trip.dropoff.addressLine}</span>
        </div>

        {/* Cancelled state */}
        {isCancelled && (
          <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff1f2', border: '1px solid #fecdd3' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#9f1239', marginBottom: 6 }}>
              {trip.cancelledByRole === 'passenger' ? 'Passenger canceled this ride.' : 'Ride was canceled.'}
              {trip.cancelReason ? ` Reason: ${trip.cancelReason}` : ''}
            </div>
            <button type="button" className="gw-button gw-button-primary" onClick={() => navigate(GW_PATHS.driver.dashboard)}>
              Continue searching for passengers
            </button>
          </div>
        )}

        {/* Location sharing status */}
        {sharingLocation && (
          <div style={{ fontSize: 11, fontWeight: 600, color: '#0077C8' }}>
            📡 {t('trackingRideToDestination')}
            {sharingUpdatedAtIso ? ` · ${new Date(sharingUpdatedAtIso).toLocaleTimeString()}` : ''}
          </div>
        )}
        {sharingError && <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{sharingError}</div>}

        {/* Secondary actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="gw-button gw-button-secondary" style={{ flex: 1 }} onClick={() => setChatOpen(true)}>
            💬 {t('chatWithPassenger')}
          </button>
          {canShareLocation && (
            <button type="button" className="gw-button gw-button-secondary"
              onClick={() => { setSharingError(null); setSharingLocation((s) => !s); }}>
              {sharingLocation ? '⏹ Stop' : '📍 Share location'}
            </button>
          )}
          <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.driver.dashboard)}>
            {t('dashboard')}
          </button>
        </div>

        {/* Expanded: trip reset controls */}
        {controlsExpanded && (
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: 0.5 }}>TRIP CONTROLS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="gw-button" disabled={!!tripActionLoading}
                style={{ background: 'rgba(220,38,38,0.10)', color: '#991b1b' }}
                onClick={() => void releaseTrip('cancel')}>
                {tripActionLoading === 'cancel' ? 'Cancelling…' : t('cancelRide')}
              </button>
              <button type="button" className="gw-button gw-button-secondary" disabled={!!tripActionLoading}
                onClick={() => void releaseTrip('close')}>
                {tripActionLoading === 'close' ? 'Closing…' : 'Mark completed'}
              </button>
              <button type="button" className="gw-button gw-button-primary" disabled={!!tripActionLoading}
                onClick={() => void releaseTrip('reset')}>
                {tripActionLoading === 'reset' ? 'Resetting…' : 'Find new passenger'}
              </button>
            </div>
            {tripActionError && <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{tripActionError}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverBackendActiveTripView;
