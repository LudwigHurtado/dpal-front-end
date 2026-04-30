export type RideLifecycleStatus =
  | 'draft'
  | 'requested'
  | 'matching'
  | 'accepted'
  | 'driver_en_route'
  | 'driver_arrived'
  | 'passenger_onboard'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type RidePurposeOption =
  | 'personal_ride'
  | 'medical_appointment'
  | 'school_pickup_dropoff'
  | 'senior_assistance'
  | 'charity_supported_ride'
  | 'emergency_support_non_emergency_assistance'
  | 'delivery_help_mission';

export type LedgerStatus = 'not_logged' | 'pending_verification' | 'ready_to_log' | 'logged' | 'disputed';

/** Optional snapshot aligned with trip estimate fare split (derived from `estimatedFare` when omitted). */
export type RideFareSplitSnapshot = {
  adminCostCents: number;
  netFareCents: number;
  driverPayoutCents: number;
  platformShareCents: number;
  adminPercent: 5;
  driverPercentOfNet: 90;
  platformPercentOfNet: 5;
};

export type RideRequest = {
  id: string;
  passengerId: string;
  passengerName: string;
  driverId?: string;
  driverName?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  ridePurpose: RidePurposeOption;
  charityId?: string;
  charityName?: string;
  urgency: 'low' | 'normal' | 'high' | 'priority';
  requestedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  status: RideLifecycleStatus;
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedFare: number;
  /** Optional cached breakdown; UI may always recompute from `estimatedFare`. */
  fareSplit?: RideFareSplitSnapshot;
  estimatedReward: number;
  qrCodeValue: string;
  blockchainStatus: LedgerStatus;
  evidencePacketId?: string;
};

export type TripMessage = {
  id: string;
  rideId: string;
  senderId: string;
  senderRole: 'passenger' | 'driver' | 'system';
  body: string;
  createdAt: string;
};

export type TripEvidence = {
  id: string;
  rideId: string;
  type: 'qr_scan' | 'photo' | 'status_update' | 'completion_note' | 'location_ping' | 'charity_support';
  label: string;
  value: string;
  createdAt: string;
};

export type RideDraftInput = {
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  destinationAddress: string;
  destinationLat?: number;
  destinationLng?: number;
  ridePurpose: RidePurposeOption;
  charityId?: string;
  charityName?: string;
  urgency: 'low' | 'normal' | 'high' | 'priority';
};

