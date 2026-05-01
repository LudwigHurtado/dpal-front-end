import { create } from 'zustand';
import type { Role } from '../types/role';
import type { UserProfile } from '../types/user';
import { goodWheelsAuthApi, type GwRegisterBody } from '../services/adapters/goodWheelsApi';

type AuthStatus = 'signed_out' | 'signed_in' | 'loading';

const AUTH_STORAGE_KEY = 'good-wheels-auth-v1';

type AuthState = {
  status: AuthStatus;
  user: UserProfile | null;
  activeRole: Role | null;
  error: string | null;
  connectionMode: 'live';
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (body: GwRegisterBody) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
};

function readStoredAuth(): Pick<AuthState, 'status' | 'user' | 'activeRole' | 'connectionMode'> {
  if (typeof window === 'undefined') {
    return { status: 'signed_out', user: null, activeRole: null, connectionMode: 'live' };
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { status: 'signed_out', user: null, activeRole: null, connectionMode: 'live' };
    const parsed = JSON.parse(raw) as { user?: UserProfile; activeRole?: Role };
    if (!parsed.user?.id || !parsed.user.role) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return { status: 'signed_out', user: null, activeRole: null, connectionMode: 'live' };
    }
    return {
      status: 'signed_in',
      user: parsed.user,
      activeRole: parsed.activeRole ?? parsed.user.role,
      connectionMode: 'live',
    };
  } catch {
    return { status: 'signed_out', user: null, activeRole: null, connectionMode: 'live' };
  }
}

function writeStoredAuth(user: UserProfile, activeRole: Role) {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, activeRole }));
  } catch {
    // storage can fail in private mode; in-memory auth still works for this session
  }
}

function clearStoredAuth() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}

const storedAuth = readStoredAuth();

export const useAuthStore = create<AuthState>((set, get) => ({
  status: storedAuth.status,
  user: storedAuth.user,
  activeRole: storedAuth.activeRole,
  error: null,
  connectionMode: storedAuth.connectionMode,
  async signIn(email, password) {
    set({ status: 'loading', error: null });
    try {
      const { user } = await goodWheelsAuthApi.signIn(email, password);
      writeStoredAuth(user, user.role);
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
  async signUp(body) {
    set({ status: 'loading', error: null });
    try {
      const { user } = await goodWheelsAuthApi.signUp(body);
      writeStoredAuth(user, user.role);
      set({
        status: 'signed_in',
        user,
        activeRole: user.role,
        connectionMode: 'live',
      });
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : 'Registration failed. Please try again.';
      set({ status: 'signed_out', error: msg });
    }
  },
  async signOut() {
    set({ status: 'loading', error: null });
    try {
      await goodWheelsAuthApi.signOut();
    } finally {
      clearStoredAuth();
      set({
        status: 'signed_out',
        user: null,
        activeRole: null,
        connectionMode: 'live',
      });
    }
  },
  async switchRole(role) {
    const { status, user: currentUser } = get();
    if (status !== 'signed_in' || !currentUser?.id) return;
    set({ status: 'loading', error: null });
    try {
      const { user } = await goodWheelsAuthApi.switchRole(currentUser.id, role);
      writeStoredAuth(user, user.role);
      set({ status: 'signed_in', user, activeRole: user.role });
    } catch {
      set({ status: 'signed_in', error: 'Could not switch roles.' });
    }
  },
  async forgotPassword(email) {
    return goodWheelsAuthApi.forgotPassword(email);
  },
  async resetPassword(token, newPassword) {
    await goodWheelsAuthApi.resetPassword(token, newPassword);
  },
}));

