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
import ShelterRideStoryOverlay from '../../trips/components/ShelterRideStoryOverlay';
import { getShelterStoryPayload, isShelterStoryStatus } from '../../../data/shelterStoryVideos';
import { formatMoneyFromCents } from '../../trips/utils/fareSplit';
import { TERMINAL_STATUSES } from '../../trips/tripConstants';
import PassengerDriverCounterofferBlock, { passengerHasPendingDriverCounter } from './PassengerDriverCounterofferBlock';
import { goodWheelsRideApi } from '../../../services/adapters/goodWheelsApi';

const PassengerBackendActiveTripView: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const user = useAuthStore((s) => s.user);
  const hydrate = useTripStore((s) => s.hydrate);
  const setActiveTrip = useTripStore((s) => s.setActiveTrip);
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSyncAtIso, setLastSyncAtIso] = useState<string | null>(null);
  const [closingBusy, setClosingBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const syncTrip = async () => {
    if (!user?.id) return;
    setSyncBusy(true);
    try {
      await hydrate(user.id);
      setLastSyncAtIso(new Date().toISOString());
    } finally {
      setSyncBusy(false);
    }
  };

  const storyPayload = useMemo(() => getShelterStoryPayload(trip), [trip]);
  const ridePhaseOk = isShelterStoryStatus(trip.status) && !TERMINAL_STATUSES.has(trip.status);
  const [shelterStoryOpen, setShelterStoryOpen] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const tick = () => void syncTrip();
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [user?.id]);

  useEffect(() => {
    const onFocus = () => void syncTrip();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void syncTrip();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id]);

  useEffect(() => { setShelterStoryOpen(true); }, [trip.id, trip.status]);

  const threadId = trip.chatThreadId ?? `good-wheels-trip-${trip.id}`;
  const driverName = trip.driverSnapshot?.fullName ?? t('waitingForDriver');
  const v = trip.driverSnapshot?.vehicle;

  const grossCents =
    typeof trip.offerState?.passengerOfferCents === 'number' && trip.offerState.passengerOfferCents > 0
      ? Math.round(trip.offerState.passengerOfferCents)
      : typeof trip.estimate?.totalFareCents === 'number' && trip.estimate.totalFareCents > 0
        ? Math.round(trip.estimate.totalFareCents)
        : undefined;

  const showShelterOverlay = ridePhaseOk && storyPayload.urls.length > 0 && shelterStoryOpen;
  const hasDriverLocation = Boolean(
    trip.driverLocation && Number.isFinite(trip.driverLocation.lat) && Number.isFinite(trip.driverLocation.lng),
  );
  const isSearching = ['requested', 'broadcasted', 'matched'].includes(trip.status);
  const isCancelled = trip.status === 'cancelled' || trip.status === 'canceled';

  const statusLabel = isSearching
    ? t('searchingDriver')
    : passengerHasPendingDriverCounter(trip)
      ? t('passengerDriverCounterLead')
      : trip.status === 'accepted'
        ? hasDriverLocation ? t('driverAcceptedTrackingToPickup') : t('driverAcceptedWaitingForDriverLocation')
        : ['driver_en_route', 'driver_arriving'].includes(trip.status)
          ? t('driverOnTheWay')
          : ['driver_arrived', 'arrived'].includes(trip.status)
            ? t('driverHasArrived')
            : trip.status === 'passenger_onboard'
              ? t('passengerOnboard')
              : ['in_progress', 'support_in_progress'].includes(trip.status)
                ? t('rideInProgress')
                : trip.status === 'completed'
                  ? t('rideCompletedLabel')
                  : isCancelled ? t('rideCancelledLabel') : t('searchingDriver');

  return (
    <div style={{ position: 'relative', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a' }}>

      {/* ── SHELTER STORY (full-screen overlay) ─────────────────── */}
      {ridePhaseOk && storyPayload.urls.length > 0 && (
        <ShelterRideStoryOverlay
          open={showShelterOverlay}
          title={storyPayload.title}
          subtitle={storyPayload.subtitle}
          videoUrls={storyPayload.urls}
          onBackToMap={() => setShelterStoryOpen(false)}
        />
      )}

      {/* ── COUNTEROFFER BANNER (sticky top) ────────────────────── */}
      {passengerHasPendingDriverCounter(trip) && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, padding: '8px 12px', background: 'rgba(255,251,235,0.97)', borderBottom: '1px solid #fbbf24' }}>
          <PassengerDriverCounterofferBlock trip={trip} variant="hero" />
        </div>
      )}

      {/* ── MAP — fills the whole screen ────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <TripMapPanel trip={trip} variant="passenger" height="100%" />
      </div>

      {/* ── CHAT SLIDE-UP ───────────────────────────────────────── */}
      {chatOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 300, background: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', gap: 12 }}>
            <button type="button" onClick={() => setChatOpen(false)} style={{ fontWeight: 800, color: '#0077C8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              ← {t('dashboard')}
            </button>
            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{t('chatWithDriver')}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <TripChatPanel
              threadId={threadId}
              role="passenger"
              userId={user?.id ?? trip.passengerId}
              userName={user?.fullName ?? 'Passenger'}
              title={t('chatWithDriver')}
            />
          </div>
        </div>
      )}

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
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#cbd5e1', margin: '0 auto 4px' }} />

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <TripStatusBadge status={trip.status} />
          <button type="button" onClick={() => void syncTrip()} disabled={syncBusy}
            style={{ fontSize: 12, fontWeight: 700, color: '#0077C8', background: 'none', border: 'none', cursor: 'pointer' }}>
            {syncBusy ? '...' : t('refreshRide')}
          </button>
        </div>

        {/* Status message */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
          {statusLabel}
          {hasDriverLocation && trip.driverLocation && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginLeft: 8 }}>
              {t('lastUpdated')}: {new Date(trip.driverLocation.updatedAtIso).toLocaleTimeString()}
            </span>
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

        {/* Driver info */}
        {trip.driverSnapshot?.fullName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1a73e8,#0f5cc0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
              {driverName.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{driverName}</div>
              {v && (
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 1 }}>
                  {v.makeModel}{v.colorName ? ` · ${v.colorName}` : ''}{v.plateMasked ? ` · ${v.plateMasked}` : ''}
                </div>
              )}
            </div>
            {grossCents != null && (
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{formatMoneyFromCents(grossCents)}</div>
            )}
          </div>
        )}

        {/* Cancelled state */}
        {isCancelled && (
          <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff1f2', border: '1px solid #fecdd3' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#9f1239', marginBottom: 6 }}>
              {trip.cancelledByRole === 'driver' ? 'Driver canceled this ride.' : 'Ride was canceled.'}
              {trip.cancelReason ? ` Reason: ${trip.cancelReason}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="gw-button gw-button-primary" onClick={() => navigate(GW_PATHS.passenger.request)}>
                {t('requestRideBtn')}
              </button>
              <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.passenger.support)}>
                {t('reportIssue')}
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="gw-button gw-button-secondary" style={{ flex: 1 }}
            onClick={() => setChatOpen(true)}>
            💬 {t('chatWithDriver')}
          </button>
          <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.passenger.dashboard)}>
            {t('dashboard')}
          </button>
          {['requested', 'broadcasted', 'matched', 'accepted', 'driver_en_route', 'driver_arrived', 'arrived'].includes(trip.status) && (
            <button type="button" className="gw-button gw-button-secondary" disabled={closingBusy}
              onClick={() => {
                if (!user?.id) return;
                if (!window.confirm(t('closeNegotiationConfirm'))) return;
                setClosingBusy(true);
                void (async () => {
                  try {
                    const updated = await goodWheelsRideApi.closeTripOffer(trip.id, user.id, t('closeNegotiationReason'));
                    setActiveTrip(updated);
                  } finally { setClosingBusy(false); }
                })();
              }}>
              {closingBusy ? '...' : t('cancelRide')}
            </button>
          )}
        </div>

        {/* shelter story reopen */}
        {ridePhaseOk && storyPayload.urls.length > 0 && !shelterStoryOpen && (
          <button type="button" onClick={() => setShelterStoryOpen(true)}
            style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'center' }}>
            {t('shelterStoryOpenAgain')}
          </button>
        )}

        {lastSyncAtIso && (
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>
            Synced {new Date(lastSyncAtIso).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PassengerBackendActiveTripView;
