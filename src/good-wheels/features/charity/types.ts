export type Charity = {
  id: string;
  name: string;
  category: string;
  distanceMiles?: number;
};

export type CauseLocationMode = 'my_zone' | 'other_city' | 'other_country';
export type CauseRouteMode = 'near_pickup' | 'near_dropoff' | 'along_route' | 'manual_area';
export type CauseSearchRadiusKm = 5 | 10 | 25 | 50;

export type CauseOrganization = {
  id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  address: string;
  coordinates: { lat: number; lng: number };
  mission: string;
  shortDescription: string;
  verified: boolean;
  verificationStatus: 'verified' | 'community_verified' | 'pending';
  distanceKm?: number;
  etaMinutes?: number;
  tags: string[];
  aiReason: string;
  impactStats: {
    animalsRescued?: number;
    mealsServed?: number;
    childrenSupported?: number;
    seniorsServed?: number;
    volunteersActive?: number;
    reportsVerified?: number;
  };
  media: {
    previewImageUrl?: string;
    previewVideoUrl?: string;
    previewGifUrl?: string;
  };
  actions: string[];
  canAttachToRide: boolean;
  canUseAsDestination: boolean;
  canDonate: boolean;
  canSave: boolean;
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

