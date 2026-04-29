import type { Trip } from '../trips/tripTypes';
import type { SupportCategoryId } from '../trips/tripTypes';

export type DriverAvailabilityStatus = 'offline' | 'online' | 'busy' | 'paused';

export type DriverQueueFilterId =
  | 'all'
  | 'standard'
  | 'support'
  | 'nearby'
  | 'medical'
  | 'school'
  | 'family'
  | 'emergency';

export type DriverQueueItem = Trip;

/** Which type of vehicle — drives the map marker shape */
export type VehicleMapType = 'car' | 'moto' | 'truck' | 'van';

export type DriverVehicleInfo = {
  id: string;
  makeModel: string;
  plateMasked: string;
  seats: number;
  accessibilityReady: boolean;
  verification: 'unverified' | 'pending' | 'verified';
  /** Hex color of the vehicle body, e.g. "#EAB308" for yellow */
  color: string;
  /** Human-readable color name shown in UI */
  colorName: string;
  /** Vehicle type — controls the map marker shape */
  vehicleType: VehicleMapType;
};

export type DriverPerformanceSummary = {
  rating: number; // 0-5
  completedTrips: number;
  responseTimeSeconds: number;
  trustScore: number; // 0-100
  safetyCompliance: 'good' | 'needs_attention';
};

export type DriverProfile = {
  id: string;
  fullName: string;
  isVerifiedDriver: boolean;
  isVerifiedVehicle: boolean;
  availability?: 'online' | 'offline' | 'busy';
};

export type DriverDashboardSummary = {
  availableCount: number;
  pendingDealCount: number;
  activeTripStatus: string | null;
  completedToday: number;
  completedTrips: number;
};

export type DriverDashboardPayload = {
  driver: DriverProfile;
  availability: 'online' | 'offline' | 'busy' | string;
  activeTrip: Trip | null;
  pendingDeals: Trip[];
  counteredDeals: Trip[];
  availableRequests: Trip[];
  recentCompletedTrips: Trip[];
  summary: DriverDashboardSummary;
};

export type DriverQueueFilterSpec = {
  id: DriverQueueFilterId;
  label: string;
  supportCategoryId?: SupportCategoryId;
  mode?: 'standard' | 'support';
};

