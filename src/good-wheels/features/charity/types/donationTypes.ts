export type DonationType = 'fixed' | 'percentage' | 'round_up';

export interface DonationConfig {
  enabled: boolean;
  type: DonationType;
  value: number;
}

export interface DonationResult {
  amount: number;
  type: DonationType;
  value: number;
}

