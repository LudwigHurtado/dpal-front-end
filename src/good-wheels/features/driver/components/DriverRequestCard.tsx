import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Trip } from '../../trips/tripTypes';
import TripStatusBadge from '../../trips/components/TripStatusBadge';
import TripSupportCategoryChip from '../../trips/components/TripSupportCategoryChip';
import { MOCK_SUPPORT_CATEGORIES } from '../../../data/mock/mockSupportCategories';
import { useGwLang } from '../../../i18n/useGwLang';
import { goodWheelsCommsService } from '../../../services/goodWheelsCommsService';
import { useAuthStore } from '../../../store/useAuthStore';
import FareBreakdownCard from '../../trips/components/FareBreakdownCard';
import { calculateGoodWheelsFareSplit, formatMoneyFromCents } from '../../trips/utils/fareSplit';
import TripRouteSummaryCard from '../../trips/components/TripRouteSummaryCard';
import DriverCounterOfferPanel from './DriverCounterOfferPanel';
import { GW_PATHS } from '../../../routes/paths';
import { useDriverStore } from '../driverStore';

const DriverRequestCard: React.FC<{
  trip: Trip;
  onAccept?: () => void;
  onDecline: () => void;
  /** When set, this card is a pending counteroffer the driver already sent (server-restored). */
  dealVariant?: 'available' | 'pending_counteroffer';
}> = ({ trip, onAccept, onDecline, dealVariant = 'available' }) => {
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const user = useAuthStore((s) => s.user);
  const sendCounteroffer = useDriverStore((s) => s.sendCounteroffer);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackDone, setAckDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterError, setCounterError] = useState<string | null>(null);
  const [counterBusy, setCounterBusy] = useState(false);

  const category = useMemo(
    () => (trip.supportCategoryId ? MOCK_SUPPORT_CATEGORIES.find((c) => c.id === trip.supportCategoryId) ?? null : null),
    [trip.supportCategoryId],
  );

  /** Prefer explicit passenger offer; never treat system/recommended fare as the passenger offer when both differ. */
  const explicitPassenger =
    typeof trip.offerState?.passengerOfferCents === 'number' && trip.offerState.passengerOfferCents > 0
      ? Math.round(trip.offerState.passengerOfferCents)
      : 0;
  const estimateFare =
    typeof trip.estimate?.totalFareCents === 'number' && trip.estimate.totalFareCents > 0
      ? Math.round(trip.estimate.totalFareCents)
      : 0;
  const passengerOfferCents = explicitPassenger > 0 ? explicitPassenger : estimateFare;
  const recommendedFareCents =
    typeof trip.offerState?.recommendedFareCents === 'number' && trip.offerState.recommendedFareCents > 0
      ? Math.round(trip.offerState.recommendedFareCents)
      : estimateFare > 0
        ? estimateFare
        : passengerOfferCents;
  const showRecommendedRow =
    recommendedFareCents > 0 && passengerOfferCents > 0 && recommendedFareCents !== passengerOfferCents;
  const offerSplit = useMemo(() => calculateGoodWheelsFareSplit(passengerOfferCents), [passengerOfferCents]);
  const isPendingCounter = dealVariant === 'pending_counteroffer';
  const passengerAcceptedCounter =
    isPendingCounter && trip.offerState?.status === 'accepted' && !trip.driverId;
  const counterCents =
    typeof trip.offerState?.driverCounterOfferCents === 'number' && trip.offerState.driverCounterOfferCents > 0
      ? Math.round(trip.offerState.driverCounterOfferCents)
      : 0;
  const counterSplit = useMemo(() => calculateGoodWheelsFareSplit(counterCents), [counterCents]);
  const fareUsd = passengerOfferCents > 0 ? passengerOfferCents / 100 : null;

  const durationMinutes = trip.routeSummary?.durationMinutes ?? Math.max(6, trip.estimate.etaMinutes);

  const offerBadgeLabel = useMemo(() => {
    if (trip.offerState?.status === 'driver_countered') return t('driverCountered');
    if (ackDone) return t('offerStatusAcknowledged');
    if (trip.status === 'requested') return t('offerStatusRequested');
    if (trip.status === 'broadcasted') return t('offerStatusBroadcasted');
    if (trip.status === 'matched') return t('offerStatusPassengerOffered');
    return trip.status.replace(/_/g, ' ');
  }, [ackDone, t, trip.offerState?.status, trip.status]);

  const listenSignal = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const text = [
      t('newRideBroadcast'),
      `${t('pickupLabel')}: ${trip.pickup.addressLine}`,
      `${t('dropoff')}: ${trip.dropoff.addressLine}`,
      `${t('safetyStatusLabel')}: ${(trip.safetyStatus ?? 'standard').replace(/_/g, ' ')}`,
      `${t('estimatedDistance')}: ${trip.estimate.distanceKm.toFixed(1)} km`,
    ]
      .filter(Boolean)
      .join('. ');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  };

  const acknowledge = async () => {
    if (!trip.broadcastId || !user?.id) return;
    setAckBusy(true);
    try {
      await goodWheelsCommsService.acknowledgeBroadcast(trip.broadcastId, user.id);
      setAckDone(true);
    } finally {
      setAckBusy(false);
    }
  };

  const toggleDetails = () => {
    setExpanded((v) => {
      const next = !v;
      if (next && trip.broadcastId && user?.id && !ackDone) void acknowledge();
      return next;
    });
  };

  const chatHref = `${GW_PATHS.driver.active}?tripId=${encodeURIComponent(trip.id)}`;

  return (
    <div className="gw-card overflow-hidden gw-driver-surface border border-slate-200/80 shadow-sm">
      <div className="p-3 sm:p-4">
        {isPendingCounter ? (
          <div
            className={`mb-3 rounded-lg border px-3 py-2 text-xs font-semibold ${
              passengerAcceptedCounter
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                : 'border-sky-200 bg-sky-50 text-sky-950'
            }`}
          >
            {passengerAcceptedCounter ? (
              <>
                <span className="font-extrabold">{t('passengerAcceptedFareBadge')}</span>
                <span className="mx-1">·</span>
                {t('driverPassengerAcceptedCounterBanner')}
              </>
            ) : (
              <>
                {t('counterofferSentLabel')} · {t('waitingForPassengerResponseLabel')}
              </>
            )}
          </div>
        ) : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-extrabold text-slate-900 truncate">
                {trip.pickup.label} → {trip.dropoff.label}
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                {offerBadgeLabel}
              </span>
            </div>
            <div className="text-xs text-slate-600">
              {trip.estimate.distanceKm.toFixed(1)} km · {tf('eta_min', { minutes: durationMinutes })}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <TripStatusBadge status={trip.status} />
              {category ? <TripSupportCategoryChip category={category} /> : null}
            </div>
            {passengerOfferCents > 0 ? (
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <div>
                    <span className="text-slate-600">{t('passengerOffer')}: </span>
                    <span className="font-bold text-slate-900 tabular-nums">{formatMoneyFromCents(passengerOfferCents)}</span>
                  </div>
                  {isPendingCounter && counterCents > 0 ? (
                    <>
                      <div>
                        <span className="text-slate-600">{t('yourCounteroffer')}: </span>
                        <span className="font-bold text-slate-900 tabular-nums">{formatMoneyFromCents(counterCents)}</span>
                      </div>
                      <div>
                        <span className="text-emerald-900 font-semibold">{t('youWouldReceiveIfAccepted')}: </span>
                        <span className="font-extrabold text-emerald-800 tabular-nums">
                          {formatMoneyFromCents(counterSplit.driverPayoutCents)}
                        </span>
                      </div>
                    </>
                  ) : !isPendingCounter ? (
                    <div>
                      <span className="text-emerald-900 font-semibold">{t('youReceive')}: </span>
                      <span className="font-extrabold text-emerald-800 tabular-nums">{formatMoneyFromCents(offerSplit.driverPayoutCents)}</span>
                    </div>
                  ) : null}
                </div>
                {showRecommendedRow ? (
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">{t('recommendedFare')}: </span>
                    <span className="tabular-nums">{formatMoneyFromCents(recommendedFareCents)}</span>
                  </div>
                ) : null}
                {import.meta.env.DEV ? (
                  <div className="rounded border border-amber-200/80 bg-amber-50/90 px-2 py-1.5 text-[10px] font-mono text-amber-950 space-y-0.5">
                    <div>tripId {trip.id}</div>
                    <div>
                      pOffer {trip.offerState?.passengerOfferCents ?? '—'} · rec {trip.offerState?.recommendedFareCents ?? '—'} · drvCo{' '}
                      {trip.offerState?.driverCounterOfferCents ?? '—'} · acc {trip.offerState?.acceptedFareCents ?? '—'}
                    </div>
                    <div>
                      created {trip.createdAtIso} · updated {trip.updatedAtIso}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-xs text-amber-800">{t('farePending')}</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end lg:max-w-md">
            <button type="button" className="gw-button gw-button-secondary text-xs px-3 py-1.5" onClick={listenSignal}>
              {t('listen')}
            </button>
            <button type="button" className="gw-button gw-button-secondary text-xs px-3 py-1.5" onClick={toggleDetails}>
              {expanded ? t('hideDetails') : t('details')}
            </button>
            {isPendingCounter ? (
              <Link to={chatHref} className="gw-button gw-button-secondary text-xs px-3 py-1.5 no-underline inline-flex items-center">
                {t('openTripChat')}
              </Link>
            ) : null}
            {isPendingCounter && passengerAcceptedCounter && onAccept ? (
              <button
                type="button"
                className="gw-button text-xs px-3 py-1.5 font-bold bg-emerald-600 text-white hover:bg-emerald-700 border-0 shadow-sm"
                onClick={onAccept}
              >
                {t('acceptRide')}
              </button>
            ) : null}
            {!isPendingCounter ? (
              <>
                <button
                  type="button"
                  className="gw-button text-xs px-3 py-1.5 border border-amber-500/80 text-amber-900 bg-amber-50 hover:bg-amber-100"
                  onClick={() => {
                    setCounterOpen((c) => !c);
                    setCounterError(null);
                  }}
                >
                  {t('counteroffer')}
                </button>
                {onAccept ? (
                  <button
                    type="button"
                    className="gw-button text-xs px-3 py-1.5 font-bold bg-emerald-600 text-white hover:bg-emerald-700 border-0 shadow-sm"
                    onClick={onAccept}
                  >
                    {t('acceptRide')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  onClick={onDecline}
                  aria-label={t('rejectRide')}
                  title={t('rejectRide')}
                >
                  <span aria-hidden style={{ fontSize: 16, lineHeight: 1, fontWeight: 800 }}>×</span>
                </button>
                {trip.broadcastId ? (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-slate-500 underline-offset-2 hover:underline disabled:opacity-40"
                    disabled={!trip.broadcastId || ackBusy || ackDone}
                    onClick={() => void acknowledge()}
                  >
                    {ackDone ? t('acknowledged') : t('acknowledge')}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {(expanded || counterOpen) && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-3 sm:px-4 space-y-3">
          {counterOpen && passengerOfferCents > 0 && !isPendingCounter && (
            <DriverCounterOfferPanel
              passengerOfferCents={passengerOfferCents}
              recommendedFareCents={recommendedFareCents}
              busy={counterBusy}
              error={counterError}
              onCancel={() => {
                setCounterOpen(false);
                setCounterError(null);
              }}
              onSend={async (amountCents, message) => {
                setCounterBusy(true);
                setCounterError(null);
                try {
                  await sendCounteroffer(trip.id, amountCents, message);
                  setCounterOpen(false);
                } catch (e) {
                  setCounterError(e instanceof Error ? e.message : t('tripStatusUpdateError'));
                } finally {
                  setCounterBusy(false);
                }
              }}
            />
          )}
          {expanded && (
            <>
              <TripRouteSummaryCard trip={trip} />
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{t('safetyStatusLabel')}: </span>
                {(trip.safetyStatus ?? 'standard').replace(/_/g, ' ')}
              </div>
              {trip.notes ? (
                <div className="rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800">
                  <span className="text-xs font-bold text-slate-500 uppercase">{t('passengerNotes')}</span>
                  <p className="mt-1 whitespace-pre-wrap">{trip.notes}</p>
                </div>
              ) : null}
              {fareUsd != null && (
                <details className="rounded-lg border border-slate-200 bg-white">
                  <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold text-slate-600">{t('fareDetails')}</summary>
                  <div className="px-2 pb-2">
                    <FareBreakdownCard variant="driver" totalFareUsd={fareUsd} t={t} titleKey="ridePrice" showTransparentHint={false} defaultExpanded />
                  </div>
                </details>
              )}
              <div className="flex flex-wrap gap-2">
                <Link to={chatHref} className="gw-button gw-button-secondary text-xs px-3 py-1.5 no-underline inline-flex items-center">
                  {t('openTripChat')}
                </Link>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  onClick={onDecline}
                  aria-label={t('rejectRide')}
                  title={t('rejectRide')}
                >
                  <span aria-hidden style={{ fontSize: 16, lineHeight: 1, fontWeight: 800 }}>×</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverRequestCard;
