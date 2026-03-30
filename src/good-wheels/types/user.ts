import type { Role } from './role';

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export type TrustProfile = {
  trustScore: number; // 0-100
  verifiedUser: VerificationStatus;
  verifiedDriver?: VerificationStatus;
  verifiedVehicle?: VerificationStatus;
};

export type BaseUser = {
  id: string;
  role: Role;
  fullName: string;
  phoneMasked: string;
  avatarUrl?: string;
  trust: TrustProfile;
};

export type PassengerProfile = BaseUser & {
  role: 'passenger';
  savedPlaceIds: string[];
  assistancePreferences: string[];
  familySafeMode: boolean;
};

export type DriverProfile = BaseUser & {
  role: 'driver';
  vehicleId: string;
  isOnline: boolean;
  earningsCents: number;
};

export type WorkerProfile = BaseUser & {
  role: 'worker';
  organization?: string;
  queueIds: string[];
};

export type UserProfile = PassengerProfile | DriverProfile | WorkerProfile;

