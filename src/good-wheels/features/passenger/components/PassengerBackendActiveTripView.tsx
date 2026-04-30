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
import { goodWheelsRideApi } from '../../../services/adapters/goodWheelsApi';

const PassengerBackendActiveTripView: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const user = useAuthStore((s) => s.user);
  const hydrate = useTripStore((s) => s.hydrate);
  const setActiveTrip = useTripStore((s) => s.setActiveTrip);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

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

  const driverCounterCents =
    typeof trip.offerState?.driverCounterOfferCents === 'number' &&
    Number.isFinite(trip.offerState.driverCounterOfferCents) &&
    trip.offerState.driverCounterOfferCents > 0
      ? Math.round(trip.offerState.driverCounterOfferCents)
      : null;

  const showDriverCounterPanel =
    trip.offerState?.status === 'driver_countered' && driverCounterCents != null && trip.negotiationDriverId;

  const driverCounterDetail = useMemo(() => {
    const ev = [...(trip.timeline ?? [])].reverse().find((e) => e.label === 'Driver sent counteroffer');
    return ev?.detail?.trim() || null;
  }, [trip.timeline]);

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

        {showDriverCounterPanel ? (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50/95 p-4 space-y-3 shadow-sm">
            <div className="text-xs font-extrabold uppercase tracking-wide text-amber-950">{t('passengerDriverCounterTitle')}</div>
            <p className="text-sm text-amber-950/90 leading-snug">{t('passengerDriverCounterLead')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {grossCents != null ? (
                <div className="rounded-lg border border-white/80 bg-white/90 px-3 py-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">{t('passengerYourOfferLabel')}</div>
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums">{formatMoneyFromCents(grossCents)}</div>
                </div>
              ) : null}
              <div className="rounded-lg border border-amber-400/60 bg-amber-100/80 px-3 py-2">
                <div className="text-[11px] font-bold text-amber-900 uppercase">{t('passengerDriverAsksLabel')}</div>
                <div className="text-lg font-extrabold text-amber-950 tabular-nums">{formatMoneyFromCents(driverCounterCents!)}</div>
              </div>
            </div>
            {driverCounterDetail ? (
              <div className="rounded-lg border border-amber-200/80 bg-white/80 px-3 py-2 text-xs text-slate-800">
                <span className="font-bold text-slate-600">{t('passengerDriverCounterMessageLabel')}: </span>
                {driverCounterDetail}
              </div>
            ) : null}
            {offerError ? <div className="text-xs font-semibold text-red-700">{offerError}</div> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={offerBusy || !user?.id}
                className="gw-button gw-button-primary text-sm disabled:opacity-50"
                onClick={() => {
                  if (!user?.id) return;
                  setOfferBusy(true);
                  setOfferError(null);
                  void (async () => {
                    try {
                      const updated = await goodWheelsRideApi.passengerRespondToDriverCounter(trip.id, user.id, 'accept_driver_counter');
                      setActiveTrip(updated);
                      await hydrate(user.id);
                    } catch (e) {
                      setOfferError(e instanceof Error ? e.message : t('tripStatusUpdateError'));
                    } finally {
                      setOfferBusy(false);
                    }
                  })();
                }}
              >
                {offerBusy ? '…' : t('passengerAcceptDriverFare')}
              </button>
              <button
                type="button"
                disabled={offerBusy || !user?.id}
                className="gw-button gw-button-secondary text-sm disabled:opacity-50"
                onClick={() => {
                  if (!user?.id) return;
                  setOfferBusy(true);
                  setOfferError(null);
                  void (async () => {
                    try {
                      const updated = await goodWheelsRideApi.passengerRespondToDriverCounter(trip.id, user.id, 'keep_passenger_offer');
                      setActiveTrip(updated);
                      await hydrate(user.id);
                    } catch (e) {
                      setOfferError(e instanceof Error ? e.message : t('tripStatusUpdateError'));
                    } finally {
                      setOfferBusy(false);
                    }
                  })();
                }}
              >
                {t('passengerKeepMyOffer')}
              </button>
            </div>
          </div>
        ) : null}

        {trip.offerState?.status === 'accepted' &&
        typeof trip.offerState.acceptedFareCents === 'number' &&
        trip.offerState.acceptedFareCents > 0 &&
        !trip.driverId ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50/90 px-3 py-2 text-sm font-semibold text-sky-950">
            {tf('passengerAcceptedDriverFareNote', { amount: formatMoneyFromCents(Math.round(trip.offerState.acceptedFareCents)) })}
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
