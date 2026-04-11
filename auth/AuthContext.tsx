import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "./authApi";
import { fetchMe, loginRequest, logoutRequest, presencePing, registerAccount } from "./authApi";
import { clearTokens, getRefreshToken, setTokens } from "./authStorage";
import { apiUrl, API_ROUTES } from "../constants";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  ready: boolean;
};

type AuthContextValue = AuthState & {
  login: (identifier: string, password: string) => Promise<void>;
  register: (p: {
    fullName: string;
    username: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    const u = await fetchMe();
    setUser(u);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refresh = getRefreshToken();
      if (!refresh) {
        setLoading(false);
        setReady(true);
        return;
      }
      try {
        const base = apiUrl("").replace(/\/$/, "");
        const res = await fetch(`${base}${API_ROUTES.AUTH_REFRESH}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.accessToken && data.refreshToken) {
          setTokens(data.accessToken, data.refreshToken);
          const me = await fetchMe();
          if (!cancelled) setUser(me);
        } else {
          clearTokens();
        }
      } catch {
        clearTokens();
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const id = window.setInterval(() => {
      presencePing("online").catch(() => {});
    }, 45_000);
    return () => window.clearInterval(id);
  }, [user?.id]);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await loginRequest(identifier, password);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (p: {
      fullName: string;
      username: string;
      email: string;
      phone?: string;
      password: string;
      location?: string;
      profileImageUrl?: string;
    }) => {
      const reg = await registerAccount(p);
      if (reg.user && reg.accessToken && reg.refreshToken) {
        setUser(reg.user);
        return;
      }
      const data = await loginRequest(p.email, p.password);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await presencePing("offline");
    } catch {
      /* still log out locally */
    }
    await logoutRequest();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      ready,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, ready, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
