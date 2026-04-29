import React from 'react';
import type { Trip } from '../tripTypes';
import { useGwLang } from '../../../i18n/useGwLang';

type Props = {
  trip: Trip;
  className?: string;
};

/**
 * Polished route summary (no map dependency) — pickup/drop-off, distance, ETA, visual route strip.
 */
const TripRouteSummaryCard: React.FC<Props> = ({ trip, className = '' }) => {
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const distanceKm = trip.routeSummary?.distanceKm ?? trip.estimate.distanceKm;
  const durationMinutes = trip.routeSummary?.durationMinutes ?? Math.max(6, trip.estimate.etaMinutes);

  return (
    <div className={`rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white overflow-hidden ${className}`}>
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('routeSummary')}</span>
        <span className="text-xs text-slate-600 tabular-nums">
          {distanceKm.toFixed(1)} km · {tf('eta_min', { minutes: durationMinutes })}
        </span>
      </div>
      <div className="px-3 py-3 space-y-3">
        <div className="flex items-stretch gap-2">
          <div className="flex flex-col items-center pt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" aria-hidden />
            <div className="flex-1 w-0.5 min-h-[28px] my-1 rounded-full bg-gradient-to-b from-emerald-400/80 via-slate-300 to-rose-400/80" aria-hidden />
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 shrink-0" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">{t('pickupLabel')}</div>
              <div className="font-semibold text-slate-900 truncate">{trip.pickup.label}</div>
              <div className="text-slate-600 text-xs leading-snug">{trip.pickup.addressLine}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-rose-700">{t('dropoff')}</div>
              <div className="font-semibold text-slate-900 truncate">{trip.dropoff.label}</div>
              <div className="text-slate-600 text-xs leading-snug">{trip.dropoff.addressLine}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600 border-t border-slate-100 pt-2">
          <span>
            <span className="font-semibold text-slate-700">{t('distanceShort')}: </span>
            {distanceKm.toFixed(1)} km
          </span>
          <span>
            <span className="font-semibold text-slate-700">{t('etaShort')}: </span>
            {tf('eta_min', { minutes: durationMinutes })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TripRouteSummaryCard;
