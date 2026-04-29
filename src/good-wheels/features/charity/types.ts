export type Charity = {
  id: string;
  name: string;
  category: string;
  distanceMiles?: number;
};

export type DonationConfig =
  | { type: 'none'; value: 0 }
  | { type: 'fixed'; value: number }
  | { type: 'percentage'; value: number }
  | { type: 'round_up'; value: 0 };

/** Where charity funds come from; driver payout is never reduced in `passenger_addon` mode. */
export type DonationFundingSource = 'passenger_addon' | 'platform_share';

export type DonationRecord = {
  id: string;
  tripId: string;
  userId: string;
  charityId: string;
  charityName?: string;
  amountUsd: number;
  type: DonationConfig['type'];
  createdAt: string;
  /** Default `passenger_addon`: donation is paid on top of listed fare. */
  fundingSource?: DonationFundingSource;
};

export type RewardLedgerEntry = {
  id: string;
  userId: string;
  tripId: string;
  donationId?: string;
  points: number;
  type: 'ride_completed' | 'donation_made' | 'charity_supported';
  createdAt: string;
  note: string;
};

