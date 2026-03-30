import type { Charity, DonationConfig } from '../types';
import { formatMoney } from '../utils';

type DonationPanelProps = {
  fare: number;
  selectedCharity: Charity | null;
  donationConfig: DonationConfig;
  donationAmount: number;
  onChange: (type: DonationConfig['type'], value: number) => void;
  onClear: () => void;
  onOpenCharities: () => void;
};

export default function DonationPanel({
  fare,
  selectedCharity,
  donationConfig,
  donationAmount,
  onChange,
  onClear,
  onOpenCharities,
}: DonationPanelProps) {
  return (
    <div className="gw-card p-5" style={{ background: 'rgba(22,163,74,0.06)' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-lg font-extrabold text-slate-900">Support a nearby cause</div>
          <p className="gw-muted mt-1">
            Add a donation to this ride and help your local community through Good Wheels by DPAL.
          </p>
        </div>

        <button type="button" className="gw-button gw-button-secondary" onClick={onOpenCharities}>
          {selectedCharity ? 'Change Charity' : 'Choose Charity'}
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
          <span className="gw-muted">No charity selected yet.</span>
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
          Round Up
        </button>
        <button type="button" className="gw-button" onClick={onClear} style={{ background: 'rgba(15,23,42,0.03)' }}>
          No Donation
        </button>
      </div>

      <div className="mt-4 gw-card p-4 space-y-2" style={{ boxShadow: 'none', background: 'rgba(255,255,255,0.72)' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 font-bold">Estimated fare</span>
          <strong className="text-sm text-slate-900">{formatMoney(fare)}</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 font-bold">Donation</span>
          <strong className="text-sm text-slate-900">{formatMoney(donationAmount)}</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 font-bold">Total</span>
          <strong className="text-sm text-slate-900">{formatMoney(fare + donationAmount)}</strong>
        </div>
      </div>
    </div>
  );
}

