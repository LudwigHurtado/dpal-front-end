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

  const canShareLocation = useMemo(
    () =>
      ['accepted', 'driver_en_route', 'driver_arriving', 'driver_arrived', 'arrived', 'passenger_onboard', 'in_progress', 'support_in_progress'].includes(
        trip.status,
      ),
    [trip.status],
  );

  const pushDriverLocation = async () => {
    if (!user?.id || !trip.driverId || trip.driverId !== user.id) return;
    if (!('geolocation' in navigator)) {
      setSharingError(t('locationSharingDenied'));
      return;
    }
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
            } finally {
              resolve();
            }
          })();
        },
        () => {
          setSharingError(t('locationSharingDenied'));
          resolve();
        },
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

  const releaseTrip = async (mode: 'cancel' | 'close' | 'reset') => {
    setTripActionLoading(mode);
    setTripActionError(null);
    try {
      if (mode === 'cancel') {
        await goodWheelsRideApi.cancelTrip(trip.id, 'Driver cancelled from active trip view', {
          role: 'driver',
          userId: user?.id ?? trip.driverId,
        });
      } else if (mode === 'close') {
        await goodWheelsRideApi.completeTrip(trip.id, 'Driver closed trip from active trip view');
      } else {
        try {
          await goodWheelsRideApi.cancelTrip(trip.id, 'Driver reset stale trip from active trip view', {
            role: 'driver',
            userId: user?.id ?? trip.driverId,
          });
        } catch {
          // Keep local reset path available for stale UI recovery.
        }
      }
      useTripStore.getState().clearActiveTrip();
      navigate(GW_PATHS.driver.dashboard);
    } catch (e) {
      setTripActionError(e instanceof Error ? e.message : 'Could not update this trip right now.');
    } finally {
      setTripActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="gw-card p-5 space-y-3 border-amber-200/40" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.04) 0%, #fff 40%)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="gw-card-title">{t('onTrip')}</div>
          <TripStatusBadge status={trip.status} />
        </div>
        <div className="text-sm text-slate-700">
          <span className="font-bold text-emerald-800">{t('pickupLabel')}:</span> {trip.pickup.addressLine}
          <span className="mx-2 text-slate-400">→</span>
          <span className="font-bold text-red-800">{t('dropoff')}:</span> {trip.dropoff.addressLine}
        </div>
        <div className="flex flex-wrap gap-2">
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
          <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.driver.dashboard)}>
            {t('dashboard')}
          </button>
          {canShareLocation ? (
            <button
              type="button"
              className="gw-button gw-button-secondary"
              onClick={() => {
                setSharingError(null);
                setSharingLocation((s) => !s);
              }}
            >
              {sharingLocation ? t('stopSharingLiveLocation') : t('shareLiveLocation')}
            </button>
          ) : null}
        </div>
        <div className="text-xs font-semibold text-slate-600">
          {sharingLocation ? t('trackingRideToDestination') : t('waitingForDriverLocation')}
          {sharingUpdatedAtIso ? ` · ${t('lastUpdated')}: ${new Date(sharingUpdatedAtIso).toLocaleTimeString()}` : ''}
        </div>
        {trip.status === 'cancelled' || trip.status === 'canceled' ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
            {trip.cancelledByRole === 'passenger'
              ? 'Passenger canceled this ride. You can report it and return to searching now.'
              : trip.cancelledByRole === 'driver'
                ? 'You canceled this ride. You can report it and continue searching for passengers.'
                : 'This ride was canceled. You can report it and continue searching for passengers.'}
            {trip.cancelReason ? <span className="block mt-1 text-xs">Reason: {trip.cancelReason}</span> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.driver.comms)}>
                {t('reportIssue')}
              </button>
              <button type="button" className="gw-button gw-button-primary" onClick={() => navigate(GW_PATHS.driver.dashboard)}>
                Continue searching for passengers
              </button>
            </div>
          </div>
        ) : null}
        {sharingError ? <div className="text-xs font-semibold text-red-700">{sharingError}</div> : null}
        <div className="border-t border-slate-200/80 pt-3">
          <div className="text-xs font-extrabold text-slate-700 mb-2">Trip reset controls</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="gw-button"
              onClick={() => void releaseTrip('cancel')}
              disabled={tripActionLoading !== null}
              style={{ background: 'rgba(220,38,38,0.12)', color: '#991b1b' }}
            >
              {tripActionLoading === 'cancel' ? 'Cancelling…' : 'Cancel ride'}
            </button>
            <button
              type="button"
              className="gw-button gw-button-secondary"
              onClick={() => void releaseTrip('close')}
              disabled={tripActionLoading !== null}
            >
              {tripActionLoading === 'close' ? 'Closing…' : 'Close as completed'}
            </button>
            <button
              type="button"
              className="gw-button gw-button-primary"
              onClick={() => void releaseTrip('reset')}
              disabled={tripActionLoading !== null}
            >
              {tripActionLoading === 'reset' ? 'Resetting…' : 'Continue searching for new passenger'}
            </button>
          </div>
          {tripActionError ? <div className="text-xs font-semibold text-rose-700 mt-2">{tripActionError}</div> : null}
        </div>
      </div>

      <TripMapPanel trip={trip} variant="driver" />

      <TripChatPanel
        threadId={threadId}
        role="driver"
        userId={user?.id ?? trip.driverId ?? ''}
        userName={user?.fullName ?? 'Driver'}
        title={t('chatWithPassenger')}
      />
    </div>
  );
};

export default DriverBackendActiveTripView;
