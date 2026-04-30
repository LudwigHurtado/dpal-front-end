import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Trip } from '../../trips/tripTypes';
import TripRouteSummaryCard from '../../trips/components/TripRouteSummaryCard';
import FareBreakdownCard from '../../trips/components/FareBreakdownCard';
import DriverCounterOfferPanel from './DriverCounterOfferPanel';
import DriverTripRouteMiniMap from './DriverTripRouteMiniMap';
import { useGwLang } from '../../../i18n/useGwLang';
import { calculateGoodWheelsFareSplit, fareBasisForTrip, formatMoneyFromCents } from '../../trips/utils/fareSplit';
import { GW_PATHS } from '../../../routes/paths';
import { useDriverStore } from '../driverStore';

function pickupEtaMinutesStable(tripId: string, km: number): number {
  let h = 0;
  for (let i = 0; i < tripId.length; i++) h = (h + tripId.charCodeAt(i) * (i + 1)) % 17;
  return Math.max(2, Math.min(15, Math.round(km * 0.12 + (h % 6))));
}

/** Compact horizontal trip row + expandable details (dashboard reference layout). */
const DriverDashboardTripCard: React.FC<{
  trip: Trip;
  onAccept?: () => void;
  onDecline: () => void;
  dealVariant?: 'available' | 'pending_counteroffer';
  /** Queue route: optional broadcast listen (no autoplay). */
  showListen?: boolean;
}> = ({ trip, onAccept, onDecline, dealVariant = 'available', showListen = false }) => {
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const sendCounteroffer = useDriverStore((s) => s.sendCounteroffer);
  const [expanded, setExpanded] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterBusy, setCounterBusy] = useState(false);
  const [counterError, setCounterError] = useState<string | null>(null);

  const fareBasis = useMemo(() => fareBasisForTrip(trip), [trip]);
  const { explicitPassengerCents, recommendedFareCents, displayCents, displayKind } = fareBasis;
  const offerSplit = useMemo(() => calculateGoodWheelsFareSplit(displayCents), [displayCents]);
  const fareUsd = displayCents > 0 ? displayCents / 100 : null;
  const durationMinutes = trip.routeSummary?.durationMinutes ?? Math.max(6, trip.estimate?.etaMinutes ?? 8);
  const distKm = Number.isFinite(trip.estimate?.distanceKm) ? (trip.estimate?.distanceKm as number) : 0;
  const pickupShort = trip.pickup.label || trip.pickup.addressLine?.split(',')[0] || trip.pickup.addressLine;
  const dropShort = trip.dropoff.label || trip.dropoff.addressLine?.split(',')[0] || trip.dropoff.addressLine;
  const etaPickupMin = pickupEtaMinutesStable(trip.id, Math.max(distKm, 0.1));
  const isPendingCounter = dealVariant === 'pending_counteroffer';
  const passengerAcceptedCounter =
    isPendingCounter && trip.offerState?.status === 'accepted' && !trip.driverId;
  const counterCents =
    typeof trip.offerState?.driverCounterOfferCents === 'number' && trip.offerState.driverCounterOfferCents > 0
      ? Math.round(trip.offerState.driverCounterOfferCents)
      : 0;
  const chatHref = `${GW_PATHS.driver.active}?tripId=${encodeURIComponent(trip.id)}`;

  const listenSignal = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const tListen = [
      t('newRideBroadcast'),
      `${t('pickupLabel')}: ${trip.pickup.addressLine}`,
      `${t('dropoff')}: ${trip.dropoff.addressLine}`,
      `${t('safetyStatusLabel')}: ${(trip.safetyStatus ?? 'standard').replace(/_/g, ' ')}`,
      `${t('estimatedDistance')}: ${distKm.toFixed(1)} km`,
    ]
      .filter(Boolean)
      .join('. ');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(tListen));
  };

  const canCounteroffer = displayCents > 0 && !isPendingCounter;

  return (
    <div className="gw-driver-dash-trip rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      {isPendingCounter ? (
        <div
          className={`border-b px-3 py-2.5 text-xs font-semibold flex flex-wrap items-center gap-2 ${
            passengerAcceptedCounter
              ? 'border-emerald-200 bg-emerald-50/95 text-emerald-950'
              : 'border-amber-100 bg-amber-50/90 text-amber-950'
          }`}
        >
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${
              passengerAcceptedCounter ? 'bg-emerald-200/90' : 'bg-amber-200/80'
            }`}
          >
            {passengerAcceptedCounter ? t('passengerAcceptedFareBadge') : t('counterofferSentLabel')}
          </span>
          <span className={passengerAcceptedCounter ? 'text-emerald-900/95' : 'text-amber-900/95'}>
            {passengerAcceptedCounter ? t('driverPassengerAcceptedCounterBanner') : t('waitingForPassengerResponseLabel')}
          </span>
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 p-3 sm:p-4">
        {/* Full-width thumb in column layout; fixed width on sm+ row so the details column never collapses to 0 */}
        <div className="gw-driver-dash-trip-thumb shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 w-full min-h-[96px] sm:w-[120px] sm:min-w-[120px] sm:max-w-[120px]">
          <DriverTripRouteMiniMap trip={trip} />
        </div>

        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="text-xs font-semibold text-[#1a73e8]">{tf('pickupEtaMinutesAway', { n: etaPickupMin })}</div>
              <div className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                <span className="font-semibold text-slate-900 truncate">{pickupShort}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" aria-hidden />
                <span className="text-slate-700 truncate">{dropShort}</span>
              </div>
              <div className="text-xs text-slate-500">
                {tf('eta_min', { minutes: durationMinutes })} · {distKm.toFixed(1)} km
              </div>
            </div>
            <div className="text-right shrink-0">
              {displayCents > 0 ? (
                displayKind === 'passenger' ? (
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums">{tf('tripOfferLabel', { amount: formatMoneyFromCents(displayCents) })}</div>
                ) : (
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{t('recommendedFare')}</div>
                    <div className="text-lg font-extrabold text-slate-900 tabular-nums">{formatMoneyFromCents(displayCents)}</div>
                  </div>
                )
              ) : (
                <div className="text-sm font-semibold text-amber-800">{t('farePending')}</div>
              )}
              {!isPendingCounter && displayCents > 0 ? (
                <div className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                  {t('youReceive')} {formatMoneyFromCents(offerSplit.driverPayoutCents)}
                </div>
              ) : null}
              {isPendingCounter && counterCents > 0 ? (
                <div className="text-[11px] font-semibold text-sky-900 mt-0.5">
                  {t('yourCounteroffer')}: {formatMoneyFromCents(counterCents)}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {onAccept && (!isPendingCounter || passengerAcceptedCounter) ? (
              <button
                type="button"
                className="gw-driver-dash-btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
                onClick={onAccept}
              >
                {t('acceptRide')}
              </button>
            ) : null}
            {showListen && !isPendingCounter ? (
              <button
                type="button"
                className="gw-driver-dash-btn-outline px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 text-slate-800 bg-white"
                onClick={listenSignal}
              >
                {t('listen')}
              </button>
            ) : null}
            {!isPendingCounter && canCounteroffer ? (
              <button
                type="button"
                className="gw-driver-dash-btn-outline px-4 py-2 rounded-xl text-sm font-bold border border-[#1a73e8]/35 text-[#1557b0] bg-white"
                onClick={() => {
                  setCounterOpen((c) => !c);
                  setCounterError(null);
                  if (!counterOpen) setExpanded(true);
                }}
              >
                {t('counteroffer')}
              </button>
            ) : null}
            {isPendingCounter ? (
              <Link to={chatHref} className="gw-driver-dash-btn-outline px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 text-slate-800 no-underline inline-flex items-center justify-center">
                {t('openTripChat')}
              </Link>
            ) : null}
            <button
              type="button"
              className="gw-driver-dash-btn-outline px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 text-slate-800 bg-white"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? t('hideDetails') : t('details')}
            </button>
            {!isPendingCounter ? (
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                onClick={onDecline}
                aria-label={t('rejectRide')}
                title={t('rejectRide')}
              >
                <span aria-hidden style={{ fontSize: 16, lineHeight: 1, fontWeight: 800 }}>×</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {(expanded || counterOpen) && (
        <div className="border-t border-slate-100 bg-[#f8f9fa] px-3 py-3 sm:px-4 space-y-3">
          {counterOpen && canCounteroffer && (
            <DriverCounterOfferPanel
              passengerOfferCents={explicitPassengerCents}
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
              {fareUsd != null && (
                <details className="rounded-xl border border-slate-200 bg-white">
                  <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold text-slate-600">{t('fareDetails')}</summary>
                  <div className="px-2 pb-2">
                    <FareBreakdownCard variant="driver" totalFareUsd={fareUsd} t={t} titleKey="ridePrice" showTransparentHint={false} defaultExpanded />
                  </div>
                </details>
              )}
              <div className="flex flex-wrap gap-2">
                <Link to={chatHref} className="gw-driver-dash-btn-outline px-3 py-2 rounded-xl text-xs font-bold no-underline inline-flex items-center border border-slate-200">
                  {t('openTripChat')}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverDashboardTripCard;
