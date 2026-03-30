import type { UserProfile } from '../../types/user';

export const MOCK_USERS: { passenger: UserProfile; driver: UserProfile; worker: UserProfile } = {
  passenger: {
    id: 'usr-passenger-001',
    role: 'passenger',
    fullName: 'Ariana M.',
    phoneMasked: '(•••) •••-1842',
    trust: { trustScore: 92, verifiedUser: 'verified' },
    savedPlaceIds: ['plc-home-001', 'plc-clinic-001'],
    assistancePreferences: ['Medical Transport', 'Family Safe'],
    familySafeMode: true,
  },
  driver: {
    id: 'usr-driver-001',
    role: 'driver',
    fullName: 'Jordan K.',
    phoneMasked: '(•••) •••-5220',
    trust: { trustScore: 95, verifiedUser: 'verified', verifiedDriver: 'verified', verifiedVehicle: 'verified' },
    vehicleId: 'veh-001',
    isOnline: true,
    earningsCents: 18450,
  },
  worker: {
    id: 'usr-worker-001',
    role: 'worker',
    fullName: 'Samira T.',
    phoneMasked: '(•••) •••-9031',
    trust: { trustScore: 97, verifiedUser: 'verified' },
    organization: 'Community Support Desk',
    queueIds: ['tsk-001', 'tsk-002'],
  },
};

