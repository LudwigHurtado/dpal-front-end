import type { Charity, DonationConfig } from '../types';
import { formatMoney } from '../utils';
import { calculateDonationAmount } from '../utils';
import { useGwLang } from '../../../i18n/useGwLang';

type DonationPanelProps = {
  fare: number;
  selectedCharity: Charity | null;
  donationConfig: DonationConfig;
  donationAmount: number;
  onChange: (type: DonationConfig['type'], value: number) => void;
  onClear: () => void;
  onOpenCharities: () => void;
};

function DonationPanelInline({
  fare,
  selectedCharity,
  donationConfig,
  donationAmount,
  onChange,
  onClear,
  onOpenCharities,
}: DonationPanelProps) {
  const t = useGwLang((s) => s.t);
  return (
    <div className="gw-card p-4" style={{ background: 'rgba(22,163,74,0.06)' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-lg font-extrabold text-slate-900">{t('donationPanelTitle')}</div>
          <p className="gw-muted mt-1">{t('donationPanelIntro')}</p>
          <p className="mt-2 text-[11px] text-slate-600 leading-snug font-medium">{t('driverPayoutProtectedDonationCopy')}</p>
          <p className="mt-1 text-[11px] text-slate-500 leading-snug">{t('donationPercentExplainer')}</p>
        </div>

        <button type="button" className="gw-button gw-button-secondary" onClick={onOpenCharities}>
          {selectedCharity ? t('donationChangeCharity') : t('donationChooseCharity')}
        </button>
      </div>

      <div className="mt-3 text-sm text-slate-700">
        {selectedCharity ? (
          <>
            <strong className="text-slate-900">{selectedCharity.name}</strong>
            <div className="gw-muted">
              {selectedCharity.distanceMiles ?? '—'} mi away • {selectedCharity.category}
            </div>
          </>
        ) : (
          <span className="gw-muted">{t('donationNoCharityYet')}</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={donationConfig.type === 'fixed' && donationConfig.value === 1 ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
          onClick={() => onChange('fixed', 1)}
        >
          $1
        </button>
        <button
          type="button"
          className={donationConfig.type === 'fixed' && donationConfig.value === 2 ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
          onClick={() => onChange('fixed', 2)}
        >
          $2
        </button>
        <button
          type="button"
          className={donationConfig.type === 'fixed' && donationConfig.value === 5 ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
          onClick={() => onChange('fixed', 5)}
        >
          $5
        </button>
        <button
          type="button"
          className={donationConfig.type === 'percentage' && donationConfig.value === 5 ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
          onClick={() => onChange('percentage', 5)}
        >
          5%
        </button>
        <button
          type="button"
          className={donationConfig.type === 'percentage' && donationConfig.value === 10 ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
          onClick={() => onChange('percentage', 10)}
        >
          10%
        </button>
        <button
          type="button"
          className={donationConfig.type === 'round_up' ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
          onClick={() => onChange('round_up', 0)}
        >
          {t('donationRoundUpSection')}
        </button>
        <button type="button" className="gw-button" onClick={onClear} style={{ background: 'rgba(15,23,42,0.03)' }}>
          {t('donationNoDonation')}
        </button>
      </div>

      <div className="mt-3 gw-card p-3.5 space-y-1.5" style={{ boxShadow: 'none', background: 'rgba(255,255,255,0.72)' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 font-bold">{t('donationEstimatedFare')}</span>
          <strong className="text-sm text-slate-900">{formatMoney(fare)}</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 font-bold">{t('donationOptionalShort')}</span>
          <strong className="text-sm text-slate-900">{formatMoney(donationAmount)}</strong>
        </div>
        <div className="flex items-center justify-between border-t border-emerald-200 pt-1.5">
          <span className="text-sm text-slate-600 font-bold">{t('donationTotalYouMayPay')}</span>
          <strong className="text-sm text-slate-900">{formatMoney(fare + donationAmount)}</strong>
        </div>
      </div>
    </div>
  );
}

export default DonationPanelInline;

// Compatibility modal API (close to your snippet) without breaking current inline usage.
export function DonationPanel({
  open,
  fareEstimate,
  value,
  charityName,
  onClose,
  onChange,
}: {
  open: boolean;
  fareEstimate: number;
  value: { enabled: boolean; type: 'fixed' | 'percentage' | 'round_up'; value: number };
  charityName: string | null;
  onClose: () => void;
  onChange: (config: { enabled: boolean; type: 'fixed' | 'percentage' | 'round_up'; value: number }) => void;
}) {
  const t = useGwLang((s) => s.t);
  const previewAmount = value.enabled
    ? calculateDonationAmount(
        fareEstimate,
        value.type === 'round_up'
          ? ({ type: 'round_up', value: 0 } as any)
          : value.type === 'fixed'
            ? ({ type: 'fixed', value: value.value } as any)
            : ({ type: 'percentage', value: value.value } as any)
      )
    : 0;

  if (!open) return null;

  const setType = (type: 'fixed' | 'percentage' | 'round_up', newValue: number) => {
    onChange({ enabled: true, type, value: newValue });
  };

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label={t('donationSettingsTitle')}>
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: 'rgba(2,6,23,0.35)' }}
        onClick={onClose}
        aria-label={t('donationClose')}
      />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full" style={{ maxWidth: 720 }}>
        <div className="gw-card p-6" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="gw-card-title">{t('donationSettingsTitle')}</div>
              <div className="gw-muted mt-1">{charityName ?? t('donationNoCharityYet')}</div>
              <p className="mt-2 text-[11px] text-slate-600 leading-snug">{t('driverPayoutProtectedDonationCopy')}</p>
            </div>
            <button type="button" className="gw-button gw-button-secondary" onClick={onClose}>
              {t('donationClose')}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between gw-card p-4" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.65)' }}>
              <span className="font-extrabold text-slate-900">{t('donationEnableLabel')}</span>
              <input
                type="checkbox"
                checked={value.enabled}
                onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
              />
            </label>

            <div>
              <div className="text-sm font-extrabold text-slate-900 mb-2">{t('donationFixedSection')}</div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setType('fixed', amt)}
                    className={value.type === 'fixed' && value.value === amt ? 'gw-button gw-button-donate' : 'gw-button gw-button-secondary'}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-extrabold text-slate-900 mb-2">{t('donationPercentageSection')}</div>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setType('percentage', pct)}
                    className={value.type === 'percentage' && value.value === pct ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">{t('donationPercentExplainer')}</p>
            </div>

            <div>
              <div className="text-sm font-extrabold text-slate-900 mb-2">{t('donationRoundUpSection')}</div>
              <button
                type="button"
                onClick={() => setType('round_up', 0)}
                className={value.type === 'round_up' ? 'gw-button gw-button-primary w-full' : 'gw-button gw-button-secondary w-full'}
              >
                {t('donationRoundUpCta')}
              </button>
            </div>

            <div className="gw-card p-4" style={{ boxShadow: 'none', background: 'rgba(255,255,255,0.75)' }}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-bold">{t('donationFareEstimateLabel')}</span>
                <span className="text-slate-900 font-extrabold">{formatMoney(fareEstimate)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-600 font-bold">{t('donationPreviewLabel')}</span>
                <span className="text-slate-900 font-extrabold">{formatMoney(previewAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
