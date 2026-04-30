import { create } from 'zustand';
import type { Role } from '../types/role';
import type { UserProfile } from '../types/user';
import { goodWheelsAuthApi } from '../services/adapters/goodWheelsApi';

type AuthStatus = 'signed_out' | 'signed_in' | 'loading';

type AuthState = {
  status: AuthStatus;
  user: UserProfile | null;
  activeRole: Role | null;
  error: string | null;
  connectionMode: 'live';
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'signed_out',
  user: null,
  activeRole: null,
  error: null,
  connectionMode: 'live',
  async signIn(email, password) {
    set({ status: 'loading', error: null });
    try {
      const { user } = await goodWheelsAuthApi.signIn(email, password);
      set({
        status: 'signed_in',
        user,
        activeRole: user.role,
        connectionMode: 'live',
      });
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : 'Could not sign in. Please try again.';
      set({ status: 'signed_out', error: msg, connectionMode: 'live' });
    }
  },
  async signOut() {
    set({ status: 'loading', error: null });
    try {
      await goodWheelsAuthApi.signOut();
    } finally {
      set({
        status: 'signed_out',
        user: null,
        activeRole: null,
        connectionMode: 'live',
      });
    }
  },
  async switchRole(role) {
    const { status } = get();
    if (status !== 'signed_in') return;
    set({ status: 'loading', error: null });
    try {
      const { user } = await goodWheelsAuthApi.switchRole(role);
      set({ status: 'signed_in', user, activeRole: user.role });
    } catch {
      set({ status: 'signed_in', error: 'Could not switch roles.' });
    }
  },
}));

