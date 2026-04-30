import React, { useMemo, useState } from 'react';
import { calculateGoodWheelsFareSplit, formatMoneyFromCents } from '../../trips/utils/fareSplit';
import { useGwLang } from '../../../i18n/useGwLang';

type Props = {
  passengerOfferCents: number;
  recommendedFareCents: number;
  onSend: (amountCents: number, message?: string) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
};

const DriverCounterOfferPanel: React.FC<Props> = ({
  passengerOfferCents,
  recommendedFareCents,
  onSend,
  onCancel,
  busy = false,
  error = null,
}) => {
  const t = useGwLang((s) => s.t);
  const [raw, setRaw] = useState('');
  const [message, setMessage] = useState('');

  /** Basis for “you receive” in the summary block: passenger offer when present, otherwise recommended rate (never mixed). */
  const basisCents = useMemo(() => {
    if (passengerOfferCents > 0) return passengerOfferCents;
    return recommendedFareCents > 0 ? recommendedFareCents : 0;
  }, [passengerOfferCents, recommendedFareCents]);

  const basisSplit = useMemo(() => calculateGoodWheelsFareSplit(basisCents), [basisCents]);

  const counterCents = useMemo(() => {
    const n = Number.parseFloat(raw.replace(/,/g, '.'));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  }, [raw]);

  const counterSplit = useMemo(
    () => (counterCents > 0 ? calculateGoodWheelsFareSplit(counterCents) : null),
    [counterCents],
  );

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 space-y-3">
      <div className="text-xs font-bold text-amber-950 uppercase tracking-wide">{t('counteroffer')}</div>
      <div className="grid gap-2 text-sm">
        {passengerOfferCents > 0 ? (
          <div className="flex justify-between gap-2">
            <span className="text-slate-600">{t('passengerOffer')}</span>
            <span className="font-semibold text-slate-900 tabular-nums">{formatMoneyFromCents(passengerOfferCents)}</span>
          </div>
        ) : null}
        {recommendedFareCents > 0 ? (
          <div className="flex justify-between gap-2">
            <span className="text-slate-600">{t('recommendedFare')}</span>
            <span className="font-semibold text-slate-900 tabular-nums">{formatMoneyFromCents(recommendedFareCents)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 border-t border-amber-200/60 pt-2">
          <span className="text-slate-700 font-medium">{t('youReceive')}</span>
          <span className="font-extrabold text-emerald-800 tabular-nums">
            {formatMoneyFromCents(basisSplit.driverPayoutCents)}
          </span>
        </div>
      </div>
      <label className="block text-xs font-semibold text-slate-700">
        {t('yourCounteroffer')}
        <input
          type="text"
          inputMode="decimal"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-900 tabular-nums"
          placeholder="7.00"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          disabled={busy}
        />
      </label>
      {counterSplit && counterCents > 0 && (
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-slate-700">{t('youWouldReceive')}</span>
          <span className="font-extrabold text-emerald-800 tabular-nums">{formatMoneyFromCents(counterSplit.driverPayoutCents)}</span>
        </div>
      )}
      <label className="block text-xs text-slate-600">
        {t('counterofferMessageOptional')}
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={busy}
        />
      </label>
      {error ? <div className="text-xs font-medium text-red-700">{error}</div> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="gw-button px-3 py-1.5 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          disabled={busy || counterCents <= 0}
          onClick={() => void onSend(counterCents, message.trim() || undefined)}
        >
          {t('sendCounteroffer')}
        </button>
        <button
          type="button"
          className="gw-button gw-button-secondary px-3 py-1.5 text-sm"
          disabled={busy}
          onClick={onCancel}
        >
          {t('counterofferCancel')}
        </button>
      </div>
    </div>
  );
};

export default DriverCounterOfferPanel;
