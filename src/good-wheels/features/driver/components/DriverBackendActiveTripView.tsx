import React, { useEffect } from 'react';
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

const DriverBackendActiveTripView: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const hydrate = useTripStore((s) => s.hydrate);
  const { markDriverArriving, markDriverArrived, startTrip, completeTrip } = useTripActions('driver', trip);

  useEffect(() => {
    if (!user?.id) return;
    const tick = () => void hydrate(user.id);
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [hydrate, user?.id]);

  const threadId = trip.chatThreadId ?? `good-wheels-trip-${trip.id}`;

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
