import React, { useState } from 'react';
import type { GwTranslationKey } from '../../../i18n/gwTranslations';
import type { FareSplit } from '../utils/fareSplit';
import { calculateGoodWheelsFareSplit, formatMoneyFromCents } from '../utils/fareSplit';

export type FareBreakdownVariant = 'passenger' | 'driver';

type Props = {
  variant: FareBreakdownVariant;
  /** Gross fare in USD (listed ride price) */
  totalFareUsd?: number | null;
  /** Alternative: gross fare in cents */
  totalFareCents?: number | null;
  currency?: string;
  t: (key: GwTranslationKey) => string;
  /** e.g. ride estimate vs negotiation */
  titleKey?: GwTranslationKey;
  showTransparentHint?: boolean;
  defaultExpanded?: boolean;
  className?: string;
};

function resolveSplit(props: Props): FareSplit | null {
  if (typeof props.totalFareCents === 'number' && Number.isFinite(props.totalFareCents) && props.totalFareCents > 0) {
    const s = calculateGoodWheelsFareSplit(props.totalFareCents);
    return s.totalFareCents > 0 ? s : null;
  }
  if (typeof props.totalFareUsd === 'number' && Number.isFinite(props.totalFareUsd) && props.totalFareUsd > 0) {
    const s = calculateGoodWheelsFareSplit(Math.round(props.totalFareUsd * 100));
    return s.totalFareCents > 0 ? s : null;
  }
  return null;
}

const FareBreakdownCard: React.FC<Props> = ({
  variant,
  totalFareUsd,
  totalFareCents,
  currency = 'USD',
  t,
  titleKey = 'rideEstimate',
  showTransparentHint = false,
  defaultExpanded = false,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const split = resolveSplit({ totalFareUsd, totalFareCents, variant, t, currency } as Props);

  const accent = variant === 'passenger' ? '#059669' : '#CA8A04';
  const accentBg = variant === 'passenger' ? 'rgba(5,150,105,0.08)' : 'rgba(202,138,4,0.12)';
  const slate = '#64748B';
  const platformColor = '#475569';

  if (!split) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 ${className}`}>
        <div className="font-semibold text-slate-700">{t(titleKey)}</div>
        <div className="mt-1 text-xs">{t('farePending')}</div>
      </div>
    );
  }

  const driverLabel = variant === 'driver' ? t('youReceive') : t('driverReceives');

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="px-3 py-2.5 border-b border-slate-100">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t(titleKey)}</div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="text-xs text-slate-600">{t('totalFare')}</span>
          <span className="text-base font-extrabold text-slate-900 tabular-nums">{formatMoneyFromCents(split.totalFareCents, currency)}</span>
        </div>
        <div
          className="mt-2 rounded-lg px-2.5 py-2"
          style={{ background: accentBg, borderLeft: `3px solid ${accent}` }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-bold" style={{ color: accent }}>
              {driverLabel}
            </span>
            <span className="text-sm font-extrabold tabular-nums" style={{ color: accent }}>
              {formatMoneyFromCents(split.driverPayoutCents, currency)}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-slate-500">{t('adminCost')}</span>
          <span className="font-semibold text-slate-600 tabular-nums">{formatMoneyFromCents(split.adminCostCents, currency)}</span>
        </div>
        {variant === 'driver' && (
          <div className="mt-1 flex items-baseline justify-between gap-2 text-xs">
            <span style={{ color: platformColor }}>{t('platformCommunityShare')}</span>
            <span className="font-semibold tabular-nums" style={{ color: platformColor }}>
              {formatMoneyFromCents(split.platformShareCents, currency)}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        className="w-full px-3 py-2 text-left text-[11px] font-bold text-sky-700 hover:bg-slate-50"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? t('collapse') : t('expand')} · {t('fareBreakdown')}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-1.5 text-xs text-slate-600 border-t border-slate-100">
          <div className="flex justify-between gap-2 pt-2">
            <span>{t('adminCost5')}</span>
            <span className="font-semibold tabular-nums">{formatMoneyFromCents(split.adminCostCents, currency)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>{t('netAfterAdmin')}</span>
            <span className="font-semibold tabular-nums">{formatMoneyFromCents(split.netFareCents, currency)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>{t('driverReceives90OfNet')}</span>
            <span className="font-semibold tabular-nums">{formatMoneyFromCents(split.driverPayoutCents, currency)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>{t('platformReceives10OfNet')}</span>
            <span className="font-semibold tabular-nums">{formatMoneyFromCents(split.platformShareCents, currency)}</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1 leading-snug">{t('fareSplitRemainingExplainer')}</p>
        </div>
      )}

      {showTransparentHint && (
        <div className="px-3 py-2 bg-emerald-50/80 border-t border-emerald-100 text-[11px] text-emerald-900 leading-snug">
          {t('transparentPricingHint')}
        </div>
      )}

      {variant === 'driver' && (
        <div className="px-3 py-2 bg-amber-50/90 border-t border-amber-100 text-[11px] text-amber-950 leading-snug font-medium">
          {t('driverPayoutExplainer')}
        </div>
      )}
    </div>
  );
};

export default FareBreakdownCard;
