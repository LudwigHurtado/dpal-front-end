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

export type DriverVehicleInfo = {
  id: string;
  makeModel: string;
  plateMasked: string;
  seats: number;
  accessibilityReady: boolean;
  verification: 'unverified' | 'pending' | 'verified';
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
};

export type DriverQueueFilterSpec = {
  id: DriverQueueFilterId;
  label: string;
  supportCategoryId?: SupportCategoryId;
  mode?: 'standard' | 'support';
};

