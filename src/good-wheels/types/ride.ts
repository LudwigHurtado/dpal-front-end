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
  | 'broadcasted'
  | 'matched'
  | 'accepted'
  | 'driver_en_route'
  | 'driver_arrived'
  | 'passenger_onboard'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'arrived'
  | 'in_progress'
  | 'support_in_progress'
  | 'completed'
  | 'cancelled'
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
  passengerId?: string;
  pickup: PlaceRef | null;
  dropoff: PlaceRef | null;
  purpose: RidePurpose;
  supportCategoryId?: SupportCategoryId;
  notes?: string;
  accessibilityNeeds?: string[];
  familySafe?: boolean;
  /** @deprecated Optional legacy fields; new requests use addresses only. */
  pickupCategoryKey?: string;
  dropoffCategoryKey?: string;
  /** Client route preview — sent to API for broadcast/estimate only */
  estimatePreview?: { etaMinutes: number; distanceKm: number };
  routeSummaryPreview?: { distanceKm: number; durationMinutes: number; previewSteps?: string[] };
  /** Passenger gross offer in whole cents (must match what the passenger typed or accepted). */
  passengerOfferCents?: number;
  /** System suggested fare in whole cents (distance/tier heuristic); never replace `passengerOfferCents`. */
  recommendedFareCents?: number;
  attachedCause?: {
    id: string;
    name: string;
    category: string;
    city: string;
    country: string;
    canDonate?: boolean;
  };
};

export type TripTimelineEvent = {
  id: string;
  atIso: string;
  label: string;
  detail?: string;
};

/** Negotiation state for passenger ↔ driver fare offers (counteroffer flow). */
export type TripOfferNegotiationStatus =
  | 'none'
  | 'passenger_offered'
  | 'driver_countered'
  | 'accepted'
  | 'rejected'
  | 'closed'
  | 'cancelled_by_passenger';

export type TripOfferState = {
  passengerOfferCents?: number;
  recommendedFareCents?: number;
  driverCounterOfferCents?: number;
  acceptedFareCents?: number;
  status: TripOfferNegotiationStatus;
  updatedAtIso: string;
};

/** Matches API `estimate.fareSplit` — gross total lives on `estimate.totalFareCents` */
export type TripEstimateFareSplit = {
  adminCostCents: number;
  netFareCents: number;
  driverPayoutCents: number;
  platformShareCents: number;
  adminPercent: 5;
  driverPercentOfNet: 90;
  platformPercentOfNet: 5;
};

export type Trip = {
  id: string;
  passengerId: string;
  driverId?: string;
  driverSnapshot?: {
    id: string;
    fullName: string;
    vehicle?: {
      makeModel?: string;
      plateMasked?: string;
      colorName?: string;
      seats?: number;
      verification?: string;
      vehicleType?: string;
    };
    trust?: {
      verifiedDriver?: string;
      verifiedVehicle?: string;
    };
  };
  workerId?: string;
  pickup: PlaceRef;
  dropoff: PlaceRef;
  pickupCategory?: string;
  dropoffCategory?: string;
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
    /** Gross listed fare in whole cents (passenger total) */
    totalFareCents?: number;
    currency?: string;
    fareSplit?: TripEstimateFareSplit;
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
  attachedCause?: {
    id: string;
    name: string;
    category: string;
    city: string;
    country: string;
  };
  dpalRewardPoints?: number;
  chatThreadId?: string;
  broadcastId?: string;
  completedAtIso?: string;
  cancelledAtIso?: string;
  cancelReason?: string;
  cancelledByRole?: 'driver' | 'passenger' | 'system';
  cancelledByUserId?: string;
  /** Fare negotiation; gross trip fare on `estimate` until a future accept flow applies `acceptedFareCents`. */
  offerState?: TripOfferState;
  /** Driver in exclusive negotiation (e.g. after sending a counteroffer). */
  negotiationDriverId?: string;
  /** Drivers who dismissed this open request (per-driver queue filtering). */
  rejectedDriverIds?: string[];
  driverResponseState?: {
    driverId: string;
    status: 'unseen' | 'seen' | 'acknowledged' | 'countered' | 'accepted' | 'rejected' | 'expired';
    lastActionAtIso: string;
  };
  acceptedAtIso?: string;
  closedAtIso?: string;
  expirationAtIso?: string;
  driverLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    updatedAtIso: string;
  };
  routeProgress?: {
    currentLeg: 'to_pickup' | 'to_dropoff';
    remainingDistanceKm?: number;
    remainingEtaMinutes?: number;
  };
};

