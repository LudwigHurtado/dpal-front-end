import type { DonationConfig } from './types';

export function formatMoney(usd: number): string {
  const n = Number.isFinite(usd) ? usd : 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
}

export function calculateDonationAmount(fareUsd: number, config: DonationConfig): number {
  const fare = Math.max(0, Number.isFinite(fareUsd) ? fareUsd : 0);
  if (config.type === 'none') return 0;
  if (config.type === 'fixed') return Math.max(0, config.value);
  if (config.type === 'percentage') return Math.round((fare * (config.value / 100)) * 100) / 100;
  // round_up: round total fare up to next whole dollar, donate the difference
  const rounded = Math.ceil(fare);
  return Math.max(0, Math.round((rounded - fare) * 100) / 100);
}

