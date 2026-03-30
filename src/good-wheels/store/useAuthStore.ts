import { create } from 'zustand';
import type { Role } from '../types/role';
import type { UserProfile } from '../types/user';
import { GOOD_WHEELS_DEMO_MODE } from '../app/appConfig';
import { mockAuthApi } from '../services/adapters/mockAdapters';

type AuthStatus = 'signed_out' | 'signed_in' | 'loading';

type AuthState = {
  status: AuthStatus;
  user: UserProfile | null;
  activeRole: Role | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'signed_out',
  user: null,
  activeRole: null,
  error: null,
  async signIn(email, password) {
    set({ status: 'loading', error: null });
    try {
      const api = GOOD_WHEELS_DEMO_MODE ? mockAuthApi : mockAuthApi;
      const { user } = await api.signIn(email, password);
      set({ status: 'signed_in', user, activeRole: user.role });
    } catch {
      set({ status: 'signed_out', error: 'Could not sign in. Please try again.' });
    }
  },
  async signOut() {
    set({ status: 'loading', error: null });
    try {
      const api = GOOD_WHEELS_DEMO_MODE ? mockAuthApi : mockAuthApi;
      await api.signOut();
    } finally {
      set({ status: 'signed_out', user: null, activeRole: null });
    }
  },
  async switchRole(role) {
    const { status } = get();
    if (status !== 'signed_in') return;
    set({ status: 'loading', error: null });
    try {
      const api = GOOD_WHEELS_DEMO_MODE ? mockAuthApi : mockAuthApi;
      const { user } = await api.switchRole(role);
      set({ status: 'signed_in', user, activeRole: user.role });
    } catch {
      set({ status: 'signed_in', error: 'Could not switch roles.' });
    }
  },
}));

