import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Trip } from '../../trips/tripTypes';
import { useTripStore } from '../../trips/tripStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useGwLang } from '../../../i18n/useGwLang';
import { GW_PATHS } from '../../../routes/paths';
import { formatMoneyFromCents } from '../../trips/utils/fareSplit';
import { goodWheelsRideApi } from '../../../services/adapters/goodWheelsApi';
import { GOOD_WHEELS_OFFER_VIDEO_URL } from '../../../data/shelterStoryVideos';

export function passengerHasPendingDriverCounter(trip: Trip | null | undefined): boolean {
  if (!trip?.offerState) return false;
  const c = trip.offerState.driverCounterOfferCents;
  return trip.offerState.status === 'driver_countered' && typeof c === 'number' && Number.isFinite(c) && c > 0;
}

function parseCounterofferTimeline(timeline: Trip['timeline'] | undefined): { fullDetail: string | null; driverNote: string | null } {
  const ev = [...(timeline ?? [])].reverse().find((e) => e.label === 'Driver sent counteroffer');
  const detail = ev?.detail?.trim() || null;
  if (!detail) return { fullDetail: null, driverNote: null };
  const idx = detail.indexOf(' — ');
  if (idx >= 0) {
    const note = detail.slice(idx + 3).trim();
    return { fullDetail: detail, driverNote: note || null };
  }
  return { fullDetail: detail, driverNote: null };
}

type Variant = 'hero' | 'card';

/**
 * Prominent passenger UI when the server reports `driver_countered` + `driverCounterOfferCents`.
 * Shown on Active trip, Dashboard, and Request map so the offer is never tucked away.
 */
const PassengerDriverCounterofferBlock: React.FC<{
  trip: Trip;
  variant?: Variant;
  className?: string;
  /** When true, adds a link to the Active trip page (for map / secondary surfaces). */
  showActiveTripLink?: boolean;
}> = ({ trip, variant = 'card', className = '', showActiveTripLink = false }) => {
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const hydrate = useTripStore((s) => s.hydrate);
  const setActiveTrip = useTripStore((s) => s.setActiveTrip);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  const grossCents = useMemo(() => {
    if (typeof trip.offerState?.passengerOfferCents === 'number' && trip.offerState.passengerOfferCents > 0) {
      return Math.round(trip.offerState.passengerOfferCents);
    }
    if (typeof trip.estimate?.totalFareCents === 'number' && trip.estimate.totalFareCents > 0) {
      return Math.round(trip.estimate.totalFareCents);
    }
    return undefined;
  }, [trip.offerState?.passengerOfferCents, trip.estimate?.totalFareCents]);

  const driverCounterCents = useMemo(() => {
    const c = trip.offerState?.driverCounterOfferCents;
    if (typeof c !== 'number' || !Number.isFinite(c) || c <= 0) return null;
    return Math.round(c);
  }, [trip.offerState?.driverCounterOfferCents]);

  const { fullDetail, driverNote } = useMemo(() => parseCounterofferTimeline(trip.timeline), [trip.timeline]);

  if (!passengerHasPendingDriverCounter(trip) || driverCounterCents == null) return null;

  const isHero = variant === 'hero';
  const wrap = isHero
    ? `rounded-2xl border-[3px] border-amber-400 bg-gradient-to-b from-amber-50 to-amber-100/95 p-5 shadow-lg ring-2 ring-amber-200/80 ${className}`
    : `rounded-xl border-2 border-amber-400 bg-amber-50/95 p-4 space-y-3 shadow-md ${className}`;

  const titleClass = isHero ? 'text-sm font-black uppercase tracking-wide text-amber-950' : 'text-xs font-extrabold uppercase tracking-wide text-amber-950';
  const amountClass = isHero ? 'text-2xl font-black text-amber-950 tabular-nums' : 'text-lg font-extrabold text-amber-950 tabular-nums';

  const respond = async (action: 'accept_driver_counter' | 'keep_passenger_offer') => {
    if (!user?.id) return;
    setOfferBusy(true);
    setOfferError(null);
    try {
      const updated = await goodWheelsRideApi.passengerRespondToDriverCounter(trip.id, user.id, action);
      setActiveTrip(updated);
      await hydrate(user.id);
    } catch (e) {
      setOfferError(e instanceof Error ? e.message : t('tripStatusUpdateError'));
    } finally {
      setOfferBusy(false);
    }
  };

  const closeNegotiation = async () => {
    if (!user?.id) return;
    if (!window.confirm(t('closeNegotiationConfirm'))) return;
    setOfferBusy(true);
    setOfferError(null);
    try {
      const updated = await goodWheelsRideApi.closeTripOffer(trip.id, user.id, t('closeNegotiationReason'));
      setActiveTrip(updated);
      await hydrate(user.id);
    } catch (e) {
      setOfferError(e instanceof Error ? e.message : t('tripStatusUpdateError'));
    } finally {
      setOfferBusy(false);
    }
  };

  return (
    <div className={wrap} data-gw-passenger-counteroffer>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className={titleClass}>{t('passengerDriverCounterTitle')}</div>
        {showActiveTripLink ? (
          <Link
            to={GW_PATHS.passenger.active}
            className="text-xs font-extrabold text-amber-900 underline underline-offset-2 hover:text-amber-950 shrink-0"
          >
            {t('passengerCounterofferOpenActiveTrip')}
          </Link>
        ) : null}
      </div>
      <p className={`text-amber-950/95 leading-snug ${isHero ? 'text-base font-semibold' : 'text-sm'}`}>{t('passengerDriverCounterLead')}</p>

      <div className={`grid gap-3 ${isHero ? 'grid-cols-1 sm:grid-cols-2 gap-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {grossCents != null ? (
          <div className={`rounded-xl border border-white/90 bg-white ${isHero ? 'px-4 py-3' : 'px-3 py-2'}`}>
            <div className="text-[11px] font-bold text-slate-500 uppercase">{t('passengerYourOfferLabel')}</div>
            <div className={isHero ? 'text-xl font-black text-slate-900 tabular-nums' : 'text-lg font-extrabold text-slate-900 tabular-nums'}>
              {formatMoneyFromCents(grossCents)}
            </div>
          </div>
        ) : null}
        <div className={`rounded-xl border-2 border-amber-500/70 bg-amber-200/40 ${isHero ? 'px-4 py-3' : 'px-3 py-2'}`}>
          <div className="text-[11px] font-bold text-amber-950 uppercase">{t('passengerDriverAsksLabel')}</div>
          <div className={amountClass}>{formatMoneyFromCents(driverCounterCents)}</div>
        </div>
      </div>

      {(driverNote || fullDetail) && (
        <div className={`rounded-lg border border-amber-300/90 bg-white/90 text-slate-900 ${isHero ? 'px-4 py-3 text-sm' : 'px-3 py-2 text-xs'}`}>
          {driverNote ? (
            <>
              <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">{t('passengerDriverCounterMessageLabel')}</div>
              <p className="font-medium whitespace-pre-wrap">{driverNote}</p>
            </>
          ) : fullDetail ? (
            <>
              <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">{t('passengerDriverCounterMessageLabel')}</div>
              <p className="font-medium whitespace-pre-wrap">{fullDetail}</p>
            </>
          ) : null}
        </div>
      )}

      <div className="rounded-lg border border-amber-300/90 bg-white/90 p-2">
        <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">Offer video</div>
        <video
          className="w-full max-h-44 rounded-md bg-black object-contain"
          src={GOOD_WHEELS_OFFER_VIDEO_URL}
          controls
          playsInline
          preload="metadata"
        />
      </div>

      {offerError ? <div className="text-xs font-semibold text-red-700">{offerError}</div> : null}

      <div className={`flex flex-wrap gap-2 ${isHero ? 'pt-1' : ''}`}>
        <button
          type="button"
          disabled={offerBusy || !user?.id}
          className={`gw-button gw-button-primary ${isHero ? 'text-sm px-5 py-2.5' : 'text-sm'} disabled:opacity-50`}
          onClick={() => void respond('accept_driver_counter')}
        >
          {offerBusy ? '…' : t('passengerAcceptDriverFare')}
        </button>
        <button
          type="button"
          disabled={offerBusy || !user?.id}
          className={`gw-button gw-button-secondary ${isHero ? 'text-sm px-5 py-2.5' : 'text-sm'} disabled:opacity-50`}
          onClick={() => void respond('keep_passenger_offer')}
        >
          {t('passengerKeepMyOffer')}
        </button>
        <button
          type="button"
          disabled={offerBusy || !user?.id}
          className={`gw-button gw-button-secondary ${isHero ? 'text-sm px-5 py-2.5' : 'text-sm'} disabled:opacity-50`}
          onClick={() => void closeNegotiation()}
        >
          {t('closeNegotiation')}
        </button>
      </div>
    </div>
  );
};

export default PassengerDriverCounterofferBlock;
