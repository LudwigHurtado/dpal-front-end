import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Trip } from '../../trips/tripTypes';
import TripRouteSummaryCard from '../../trips/components/TripRouteSummaryCard';
import FareBreakdownCard from '../../trips/components/FareBreakdownCard';
import DriverCounterOfferPanel from './DriverCounterOfferPanel';
import { useGwLang } from '../../../i18n/useGwLang';
import { calculateGoodWheelsFareSplit, formatMoneyFromCents } from '../../trips/utils/fareSplit';
import { GW_PATHS } from '../../../routes/paths';
import { useDriverStore } from '../driverStore';

function offerCents(trip: Trip): number {
  const explicit =
    typeof trip.offerState?.passengerOfferCents === 'number' && trip.offerState.passengerOfferCents > 0
      ? Math.round(trip.offerState.passengerOfferCents)
      : 0;
  const est =
    typeof trip.estimate?.totalFareCents === 'number' && trip.estimate.totalFareCents > 0
      ? Math.round(trip.estimate.totalFareCents)
      : 0;
  return explicit > 0 ? explicit : est;
}

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
}> = ({ trip, onAccept, onDecline, dealVariant = 'available' }) => {
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const sendCounteroffer = useDriverStore((s) => s.sendCounteroffer);
  const [expanded, setExpanded] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterBusy, setCounterBusy] = useState(false);
  const [counterError, setCounterError] = useState<string | null>(null);

  const passengerOfferCents = offerCents(trip);
  const offerSplit = useMemo(() => calculateGoodWheelsFareSplit(passengerOfferCents), [passengerOfferCents]);
  const fareUsd = passengerOfferCents > 0 ? passengerOfferCents / 100 : null;
  const durationMinutes = trip.routeSummary?.durationMinutes ?? Math.max(6, trip.estimate.etaMinutes);
  const distKm = trip.estimate.distanceKm;
  const pickupShort = trip.pickup.label || trip.pickup.addressLine?.split(',')[0] || trip.pickup.addressLine;
  const dropShort = trip.dropoff.label || trip.dropoff.addressLine?.split(',')[0] || trip.dropoff.addressLine;
  const etaPickupMin = pickupEtaMinutesStable(trip.id, distKm);
  const isPendingCounter = dealVariant === 'pending_counteroffer';
  const counterCents =
    typeof trip.offerState?.driverCounterOfferCents === 'number' && trip.offerState.driverCounterOfferCents > 0
      ? Math.round(trip.offerState.driverCounterOfferCents)
      : 0;
  const chatHref = `${GW_PATHS.driver.active}?tripId=${encodeURIComponent(trip.id)}`;
  const svgGradId = `tg-${trip.id.replace(/[^a-zA-Z0-9_-]/g, '') || 'x'}`;

  const recommendedFareCents =
    typeof trip.offerState?.recommendedFareCents === 'number' && trip.offerState.recommendedFareCents > 0
      ? Math.round(trip.offerState.recommendedFareCents)
      : passengerOfferCents;

  return (
    <div className="gw-driver-dash-trip rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 p-3 sm:p-4">
        <div
          className="gw-driver-dash-trip-thumb shrink-0 flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 overflow-hidden"
          style={{ width: '100%', minHeight: 96, maxWidth: '100%' }}
          aria-hidden
        >
          <svg viewBox="0 0 120 96" className="w-full h-24 sm:w-[120px] sm:h-[96px]" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id={svgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
            <rect width="120" height="96" fill={`url(#${svgGradId})`} />
            <path
              d="M12 72 Q40 20 108 28"
              fill="none"
              stroke="#1a73e8"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="14" cy="70" r="5" fill="#16a34a" stroke="#fff" strokeWidth="2" />
            <circle cx="106" cy="26" r="5" fill="#dc2626" stroke="#fff" strokeWidth="2" />
          </svg>
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
              {passengerOfferCents > 0 ? (
                <div className="text-lg font-extrabold text-slate-900 tabular-nums">{tf('tripOfferLabel', { amount: formatMoneyFromCents(passengerOfferCents) })}</div>
              ) : (
                <div className="text-sm font-semibold text-amber-800">{t('farePending')}</div>
              )}
              {!isPendingCounter && passengerOfferCents > 0 ? (
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
            {!isPendingCounter && onAccept ? (
              <button
                type="button"
                className="gw-driver-dash-btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
                onClick={onAccept}
              >
                {t('acceptRide')}
              </button>
            ) : null}
            {!isPendingCounter ? (
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
            ) : (
              <Link to={chatHref} className="gw-driver-dash-btn-outline px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 text-slate-800 no-underline inline-flex items-center justify-center">
                {t('openTripChat')}
              </Link>
            )}
            <button
              type="button"
              className="gw-driver-dash-btn-outline px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 text-slate-800 bg-white"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? t('hideDetails') : t('details')}
            </button>
            {!isPendingCounter ? (
              <button type="button" className="text-xs font-semibold text-slate-500 underline-offset-2 hover:underline px-2 py-2" onClick={onDecline}>
                {t('rejectRide')}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {(expanded || counterOpen) && (
        <div className="border-t border-slate-100 bg-[#f8f9fa] px-3 py-3 sm:px-4 space-y-3">
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
