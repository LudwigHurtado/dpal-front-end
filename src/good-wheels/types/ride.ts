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
  | 'driver_en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

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
  createdAtIso: string;
  updatedAtIso: string;
  timeline: TripTimelineEvent[];
  estimate: {
    etaMinutes: number;
    distanceKm: number;
  };
};

