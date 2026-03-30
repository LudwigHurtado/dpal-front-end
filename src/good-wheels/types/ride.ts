import type { SupportCategoryId } from './support';

export type RidePurpose =
  | 'normal_ride'
  | 'school_transport'
  | 'medical_visit'
  | 'family_pickup'
  | 'shelter_support'
  | 'elder_assistance'
  | 'emergency_support'
  | 'community_help_errand';

export type TripStatus =
  | 'draft'
  | 'requested'
  | 'matched'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'arrived'
  | 'in_progress'
  | 'support_in_progress'
  | 'completed'
  | 'canceled'
  | 'escalated';

export type SafetyStatus = 'standard' | 'family_safe' | 'accessibility' | 'needs_attention' | 'urgent';

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type PlaceRef = {
  label: string;
  addressLine: string;
  point?: GeoPoint;
};

export type RideRequestDraft = {
  pickup: PlaceRef | null;
  dropoff: PlaceRef | null;
  purpose: RidePurpose;
  supportCategoryId?: SupportCategoryId;
  notes?: string;
  accessibilityNeeds?: string[];
  familySafe?: boolean;
};

export type TripTimelineEvent = {
  id: string;
  atIso: string;
  label: string;
  detail?: string;
};

export type Trip = {
  id: string;
  passengerId: string;
  driverId?: string;
  workerId?: string;
  pickup: PlaceRef;
  dropoff: PlaceRef;
  purpose: RidePurpose;
  supportCategoryId?: SupportCategoryId;
  status: TripStatus;
  safetyStatus?: SafetyStatus;
  createdAtIso: string;
  updatedAtIso: string;
  timeline: TripTimelineEvent[];
  notes?: string;
  trustMarkers?: string[];
  estimate: {
    etaMinutes: number;
    distanceKm: number;
  };
  routeSummary?: {
    distanceKm: number;
    durationMinutes: number;
    previewSteps?: string[];
  };
  /** Optional fare estimate for donation/rewards layer (USD) */
  fareUsd?: number;
  /** Optional charity/donation metadata captured for the trip */
  charityId?: string | null;
  charityName?: string | null;
  donationConfig?: { type: 'none' | 'fixed' | 'percentage' | 'round_up'; value: number } | null;
  donationAmountUsd?: number;
  dpalRewardPoints?: number;
};

