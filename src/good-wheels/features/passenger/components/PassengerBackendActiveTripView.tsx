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

const PassengerBackendActiveTripView: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const hydrate = useTripStore((s) => s.hydrate);

  const storyPayload = useMemo(() => getShelterStoryPayload(trip), [trip]);
  const ridePhaseOk = isShelterStoryStatus(trip.status) && !TERMINAL_STATUSES.has(trip.status);
  const [shelterStoryOpen, setShelterStoryOpen] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const tick = () => void hydrate(user.id);
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [hydrate, user?.id]);

  useEffect(() => {
    setShelterStoryOpen(true);
  }, [trip.id, trip.status]);

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

  return (
    <div className="space-y-4 relative">
      {ridePhaseOk && storyPayload.urls.length > 0 ? (
        <ShelterRideStoryOverlay
          open={showShelterOverlay}
          title={storyPayload.title}
          subtitle={storyPayload.subtitle}
          videoUrls={storyPayload.urls}
          onBackToMap={() => setShelterStoryOpen(false)}
        />
      ) : null}

      {ridePhaseOk && storyPayload.urls.length > 0 && !shelterStoryOpen ? (
        <div className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 z-[120] -translate-x-1/2 px-3 w-full max-w-md flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={() => setShelterStoryOpen(true)}
            className="pointer-events-auto rounded-full border border-sky-200 bg-white/95 px-4 py-2.5 text-sm font-extrabold text-sky-900 shadow-lg backdrop-blur-sm hover:bg-sky-50"
          >
            {t('shelterStoryOpenAgain')}
          </button>
        </div>
      ) : null}

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
        {grossCents != null ? (
          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm font-semibold text-emerald-950 tabular-nums">
            {t('totalFare')}: {formatMoneyFromCents(grossCents)}
          </div>
        ) : null}
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
