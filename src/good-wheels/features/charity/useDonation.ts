import { useMemo, useState } from 'react';
import type { Charity, DonationConfig } from './types';
import { calculateDonationAmount } from './utils';

export function useDonation(initialFareUsd: number) {
  const [fareUsd, setFareUsd] = useState(initialFareUsd);
  const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
  const [donationConfig, setDonationConfig] = useState<DonationConfig>({ type: 'none', value: 0 });

  const donationAmountUsd = useMemo(() => calculateDonationAmount(fareUsd, donationConfig), [fareUsd, donationConfig]);

  const updateDonation = (type: DonationConfig['type'], value: number) => {
    if (type === 'none') setDonationConfig({ type: 'none', value: 0 });
    else if (type === 'fixed') setDonationConfig({ type: 'fixed', value });
    else if (type === 'percentage') setDonationConfig({ type: 'percentage', value });
    else setDonationConfig({ type: 'round_up', value: 0 });
  };

  const clearDonation = () => setDonationConfig({ type: 'none', value: 0 });

  return {
    fareUsd,
    setFareUsd,
    selectedCharity,
    setSelectedCharity,
    donationConfig,
    donationAmountUsd,
    updateDonation,
    clearDonation,
  };
}

