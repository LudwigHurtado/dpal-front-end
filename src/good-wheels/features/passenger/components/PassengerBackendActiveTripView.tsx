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

const PassengerBackendActiveTripView: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const hydrate = useTripStore((s) => s.hydrate);

  useEffect(() => {
    if (!user?.id) return;
    const tick = () => void hydrate(user.id);
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [hydrate, user?.id]);

  const threadId = trip.chatThreadId ?? `good-wheels-trip-${trip.id}`;
  const driverName = trip.driverSnapshot?.fullName ?? t('waitingForDriver');
  const v = trip.driverSnapshot?.vehicle;

  return (
    <div className="space-y-4">
      <div className="gw-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="gw-card-title">{t('activeTrip')}</div>
          <TripStatusBadge status={trip.status} />
        </div>
        <div className="text-sm text-slate-700">
          <span className="font-bold text-emerald-800">{t('pickupLabel')}:</span> {trip.pickup.addressLine}
          <span className="mx-2 text-slate-400">→</span>
          <span className="font-bold text-red-800">{t('dropoff')}:</span> {trip.dropoff.addressLine}
        </div>
        {(trip.pickupCategory || trip.dropoffCategory) && (
          <div className="text-xs text-slate-600">
            {trip.pickupCategory && (
              <span>
                {t('pickupCategoryLabel')}: <strong>{trip.pickupCategory}</strong>
              </span>
            )}
            {trip.pickupCategory && trip.dropoffCategory ? ' · ' : null}
            {trip.dropoffCategory && (
              <span>
                {t('dropoffCategoryLabel')}: <strong>{trip.dropoffCategory}</strong>
              </span>
            )}
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-800">
          <div className="font-extrabold text-slate-900">{driverName}</div>
          {trip.driverSnapshot?.fullName && v && (
            <div className="mt-1 text-xs text-slate-600 space-y-0.5">
              <div>
                {v.makeModel} · {v.plateMasked} · {v.colorName}
                {v.seats != null ? ` · ${v.seats} seats` : null}
              </div>
              <div className="text-emerald-800 font-semibold">
                {trip.driverSnapshot.trust?.verifiedDriver === 'verified' ? t('verifiedDriver') : null}
                {trip.driverSnapshot.trust?.verifiedVehicle === 'verified' ? ` · ${t('verifiedVehicle')}` : null}
              </div>
            </div>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-600">{t('rideNotActiveUntilAccepted')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.passenger.dashboard)}>
            {t('dashboard')}
          </button>
        </div>
      </div>

      <TripMapPanel trip={trip} variant="passenger" />

      <TripChatPanel
        threadId={threadId}
        role="passenger"
        userId={user?.id ?? trip.passengerId}
        userName={user?.fullName ?? 'Passenger'}
        title={t('chatWithDriver')}
      />
    </div>
  );
};

export default PassengerBackendActiveTripView;
