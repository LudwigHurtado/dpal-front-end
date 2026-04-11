import { getApiBase, API_ROUTES } from "../constants";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./authStorage";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phone?: string;
  location?: string;
  role: string;
  status: string;
  profilePhotoUrl?: string;
  emailVerified: boolean;
  profileCompleted?: boolean;
  preferences?: Record<string, unknown>;
  createdAt?: string;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
  isOnline?: boolean;
  onlineStatus?: string;
  presenceUpdatedAt?: string | null;
  starterCredits?: number;
  starterCoins?: number;
  heroCredits?: number;
  dpalCoins?: number;
  reputationScore?: number;
  trustScore?: number;
};

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function apiFetch(path: string, init: RequestInit = {}, withAuth = true): Promise<Response> {
  const base = getApiBase().replace(/\/$/, "");
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (withAuth) {
    const t = getAccessToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }
  let res = await fetch(url, { ...init, headers });
  if (res.status === 401 && withAuth && getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const t2 = getAccessToken();
      if (t2) headers.set("Authorization", `Bearer ${t2}`);
      res = await fetch(url, { ...init, headers });
    }
  }
  return res;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  const base = getApiBase().replace(/\/$/, "");
  const res = await fetch(`${base}${API_ROUTES.AUTH_REFRESH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  const data = await parseJson(res);
  if (data.accessToken && data.refreshToken) {
    setTokens(data.accessToken, data.refreshToken);
    return true;
  }
  clearTokens();
  return false;
}

export async function registerAccount(body: {
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
  location?: string;
  profileImageUrl?: string;
}) {
  const res = await apiFetch(
    API_ROUTES.AUTH_REGISTER,
    { method: "POST", body: JSON.stringify(body) },
    false
  );
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  const out = data as {
    ok: boolean;
    user: AuthUser;
    accessToken?: string;
    refreshToken?: string;
    emailVerificationToken?: string;
  };
  if (out.accessToken && out.refreshToken) {
    setTokens(out.accessToken, out.refreshToken);
  }
  return out;
}

export async function loginRequest(identifier: string, password: string) {
  const res = await apiFetch(
    API_ROUTES.AUTH_LOGIN,
    { method: "POST", body: JSON.stringify({ identifier, password }) },
    false
  );
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  if (data.accessToken && data.refreshToken) {
    setTokens(data.accessToken, data.refreshToken);
  }
  return data as { ok: boolean; user: AuthUser; accessToken: string; refreshToken: string };
}

export async function logoutRequest() {
  const refresh = getRefreshToken();
  clearTokens();
  if (refresh) {
    await apiFetch(API_ROUTES.AUTH_LOGOUT, { method: "POST", body: JSON.stringify({ refreshToken: refresh }) }, false);
  }
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await apiFetch(API_ROUTES.AUTH_ME, { method: "GET" });
  if (!res.ok) return null;
  const data = await parseJson(res);
  return data.user as AuthUser;
}

export async function forgotPassword(email: string) {
  const res = await apiFetch(
    API_ROUTES.AUTH_FORGOT,
    { method: "POST", body: JSON.stringify({ email }) },
    false
  );
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await apiFetch(
    API_ROUTES.AUTH_RESET,
    { method: "POST", body: JSON.stringify({ token, newPassword }) },
    false
  );
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await apiFetch(API_ROUTES.AUTH_CHANGE_PASSWORD, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  clearTokens();
  return data;
}

export async function verifyEmailRequest(token: string) {
  const res = await apiFetch(
    API_ROUTES.AUTH_VERIFY_EMAIL,
    { method: "POST", body: JSON.stringify({ token }) },
    false
  );
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

export async function adminListUsers(page = 1, limit = 25) {
  const res = await apiFetch(`${API_ROUTES.ADMIN_USERS}?page=${page}&limit=${limit}`);
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

export async function adminListActivity(page = 1, limit = 50, userId?: string) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (userId) q.set("userId", userId);
  const res = await apiFetch(`${API_ROUTES.ADMIN_ACTIVITY}?${q.toString()}`);
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

export async function presencePing(onlineStatus: "online" | "away" | "offline") {
  const res = await apiFetch(API_ROUTES.AUTH_PRESENCE, {
    method: "POST",
    body: JSON.stringify({ onlineStatus }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data as { ok: boolean; user: AuthUser };
}

export async function updateProfile(patch: {
  displayName?: string;
  phone?: string | null;
  location?: string | null;
  profileImageUrl?: string | null;
}) {
  const res = await apiFetch(API_ROUTES.AUTH_ME, { method: "PATCH", body: JSON.stringify(patch) });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data as { ok: boolean; user: AuthUser };
}

export async function adminPatchUser(
  id: string,
  patch: { role?: string; status?: string }
) {
  const res = await apiFetch(`${API_ROUTES.ADMIN_USERS}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}
