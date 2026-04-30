import { create } from 'zustand';
import type { Role } from '../types/role';
import type { UserProfile } from '../types/user';
import { GOOD_WHEELS_DEMO_MODE } from '../app/appConfig';
import { mockAuthApi } from '../services/adapters/mockAdapters';
import { goodWheelsAuthApi } from '../services/adapters/goodWheelsApi';

type AuthStatus = 'signed_out' | 'signed_in' | 'loading';

type AuthState = {
  status: AuthStatus;
  user: UserProfile | null;
  activeRole: Role | null;
  error: string | null;
  connectionMode: 'live' | 'fallback_demo';
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
      const api = GOOD_WHEELS_DEMO_MODE ? mockAuthApi : goodWheelsAuthApi;
      const { user } = await api.signIn(email, password);
      set({
        status: 'signed_in',
        user,
        activeRole: user.role,
        connectionMode: GOOD_WHEELS_DEMO_MODE ? 'fallback_demo' : 'live',
      });
    } catch (e) {
      if (!GOOD_WHEELS_DEMO_MODE) {
        try {
          const { user } = await mockAuthApi.signIn(email, password);
          set({
            status: 'signed_in',
            user,
            activeRole: user.role,
            connectionMode: 'fallback_demo',
            error:
              'Live server is unavailable right now. You are connected in Safe Demo Mode so Good Wheels stays usable.',
          });
          return;
        } catch {
          // Fall through to the standard error handling path.
        }
      }
      const msg = e instanceof Error && e.message ? e.message : 'Could not sign in. Please try again.';
      set({ status: 'signed_out', error: msg, connectionMode: GOOD_WHEELS_DEMO_MODE ? 'fallback_demo' : 'live' });
    }
  },
  async signOut() {
    set({ status: 'loading', error: null });
    try {
      const api = GOOD_WHEELS_DEMO_MODE ? mockAuthApi : goodWheelsAuthApi;
      await api.signOut();
    } finally {
      set({
        status: 'signed_out',
        user: null,
        activeRole: null,
        connectionMode: GOOD_WHEELS_DEMO_MODE ? 'fallback_demo' : 'live',
      });
    }
  },
  async switchRole(role) {
    const { status } = get();
    if (status !== 'signed_in') return;
    set({ status: 'loading', error: null });
    try {
      const api = GOOD_WHEELS_DEMO_MODE ? mockAuthApi : goodWheelsAuthApi;
      const { user } = await api.switchRole(role);
      set({ status: 'signed_in', user, activeRole: user.role });
    } catch {
      set({ status: 'signed_in', error: 'Could not switch roles.' });
    }
  },
}));

