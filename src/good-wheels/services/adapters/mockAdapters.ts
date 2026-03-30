import { mockDelay } from '../mockDelay';
import { MOCK_USERS } from '../../data/mock/mockUsers';
import { MOCK_TRIPS } from '../../data/mock/mockTrips';
import type { Role } from '../../types/role';
import type { UserProfile } from '../../types/user';
import type { RideRequestDraft, Trip } from '../../types/ride';

export const mockAuthApi = {
  async signIn(_email: string, _password: string): Promise<{ user: UserProfile }> {
    await mockDelay(450);
    return { user: MOCK_USERS.passenger };
  },
  async signOut(): Promise<void> {
    await mockDelay(150);
  },
  async switchRole(role: Role): Promise<{ user: UserProfile }> {
    await mockDelay(250);
    if (role === 'driver') return { user: MOCK_USERS.driver };
    if (role === 'worker') return { user: MOCK_USERS.worker };
    return { user: MOCK_USERS.passenger };
  },
};

export const mockRideApi = {
  async getActiveTrip(userId: string): Promise<Trip | null> {
    await mockDelay(300);
    return MOCK_TRIPS.active.passengerId === userId ? MOCK_TRIPS.active : null;
  },
  async listHistory(userId: string): Promise<Trip[]> {
    await mockDelay(300);
    return MOCK_TRIPS.history.filter((t) => t.passengerId === userId || t.driverId === userId);
  },
  async requestRide(_draft: RideRequestDraft): Promise<Trip> {
    await mockDelay(650);
    // For foundation: return the existing “active” trip shape as if newly created.
    return MOCK_TRIPS.active;
  },
};

