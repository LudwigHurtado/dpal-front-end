import { parseRetryAfterSeconds } from "./environmentalHubConnectivity";

/** Thrown at request time when a production build has no integrations API base configured. */
export const DPAL_INTEGRATIONS_MISSING_BASE_MESSAGE =
  "Production API base URL is not configured. Set VITE_DPAL_API_BASE_URL.";

const integrationsDebugEnabled = (): boolean =>
  String(import.meta.env.VITE_DPAL_API_DEBUG ?? "").toLowerCase() === "true";

function dpalIntegrationsDebugLog(event: string, payload: Record<string, unknown>): void {
  if (!integrationsDebugEnabled()) return;
  console.info(`[DPAL integrations] ${event}`, payload);
}

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/**
 * Resolves the origin (or empty string for same-origin) used for `/api/integrations/*` and related routes.
 *
 * - **Production:** requires `VITE_DPAL_API_BASE_URL` (never defaults to localhost or an implicit host).
 * - **Development:** prefers explicit vars, then same-origin `/api` (Vite proxy), then `http://127.0.0.1:3001`.
 */
export function getApiBaseUrl(): string {
  const explicit = typeof import.meta.env.VITE_DPAL_API_BASE_URL === "string" ? import.meta.env.VITE_DPAL_API_BASE_URL.trim() : "";
  if (explicit) return normalizeOrigin(explicit);

  if (import.meta.env.DEV) {
    const legacy =
      (typeof import.meta.env.VITE_API_BASE_URL === "string" && import.meta.env.VITE_API_BASE_URL.trim()) ||
      (typeof import.meta.env.VITE_BACKEND_URL === "string" && import.meta.env.VITE_BACKEND_URL.trim()) ||
      (typeof import.meta.env.VITE_API_BASE === "string" && import.meta.env.VITE_API_BASE.trim()) ||
      "";
    if (legacy) return normalizeOrigin(legacy);
    return "";
  }

  throw new Error(DPAL_INTEGRATIONS_MISSING_BASE_MESSAGE);
}

/**
 * Build fetch URL without duplicating `/api` when the env base already ends with `/api`
 * and paths are written as `/api/...` (same pitfall as Verifier UI + VITE_API_BASE_URL).
 */
export function integrationRequestUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (base.endsWith("/api") && (p === "/api" || p.startsWith("/api/"))) {
    const tail = p === "/api" ? "/" : p.replace(/^\/api/, "") || "/";
    const normalized = tail.startsWith("/") ? tail : `/${tail}`;
    return `${base}${normalized}`;
  }
  if (!base) return p;
  return `${base}${p}`;
}

export class DpalIntegrationHttpError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  readonly bodySnippet: string;

  constructor(message: string, status: number, retryAfterSeconds: number | null, bodySnippet: string) {
    super(message);
    this.name = "DpalIntegrationHttpError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.bodySnippet = bodySnippet;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

/** Preview-only packet — no live environmental measurements (honest labeling). */
export function buildDryRunCityIntelligencePacket(lat: number, lng: number, city: string) {
  return {
    ok: true as const,
    mode: "dry_run_preview" as const,
    packet: {
      disclaimer:
        "Dry Run preview only — no live integration adapters were called. Do not treat as verified environmental truth.",
      coordinates: { lat, lng, city },
      modules: {
        floodguard: {
          floodRisk: { level: "dry_run_preview", score: null as number | null },
          note: "No live FloodGuard request executed.",
        },
        airQuality: {
          risk: "dry_run_preview",
          note: "No live air-quality request executed.",
        },
      },
      evidenceHash: `dry-run-preview-${Math.round(lat * 1000)}-${Math.round(lng * 1000)}`,
    },
  };
}

/** Shown on network failures and mirrored in Water Alert UI when the browser only reports “Failed to fetch”. */
export const DPAL_INTEGRATIONS_BACKEND_UNREACHABLE_MESSAGE =
  "DPAL could not reach the backend API. Check VITE_DPAL_API_BASE_URL (Vercel) matches your deployed integrations host, CORS allows this origin, and the backend is running.";

function isLikelyNetworkFailure(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string };
  if (e.name === "TypeError") return true;
  const m = typeof e.message === "string" ? e.message : "";
  return /failed to fetch|networkerror|load failed|network request failed/i.test(m);
}

async function fetchIntegrationJson<T>(path: string, init?: RequestInit): Promise<T> {
  let url: string;
  try {
    url = integrationRequestUrl(path);
  } catch (configErr) {
    dpalIntegrationsDebugLog("request_failed", {
      phase: "resolve_base",
      endpointPath: path,
      error: configErr instanceof Error ? configErr.message : String(configErr),
    });
    throw configErr;
  }

  const method = (init?.method ?? "GET").toUpperCase();
  dpalIntegrationsDebugLog("request_started", { method, endpointPath: path, finalRequestUrl: url });

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    dpalIntegrationsDebugLog("request_failed", {
      method,
      endpointPath: path,
      finalRequestUrl: url,
      error: err instanceof Error ? err.message : String(err),
      httpStatus: null,
    });
    if (isLikelyNetworkFailure(err)) {
      throw new Error(DPAL_INTEGRATIONS_BACKEND_UNREACHABLE_MESSAGE);
    }
    throw err;
  }

  const retryAfter = res.status === 429 ? parseRetryAfterSeconds(res.headers) : null;
  const text = await res.text();
  if (!res.ok) {
    dpalIntegrationsDebugLog("request_failed", {
      method,
      endpointPath: path,
      finalRequestUrl: url,
      httpStatus: res.status,
    });
    throw new DpalIntegrationHttpError(
      `DPAL API ${res.status}: ${text.slice(0, 240)}`,
      res.status,
      retryAfter,
      text.slice(0, 600),
    );
  }
  dpalIntegrationsDebugLog("request_completed", {
    method,
    endpointPath: path,
    finalRequestUrl: url,
    httpStatus: res.status,
  });
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new DpalIntegrationHttpError("Invalid JSON from DPAL API", res.status, null, text.slice(0, 200));
  }
}

async function getJson<T>(path: string): Promise<T> {
  return fetchIntegrationJson<T>(path);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return fetchIntegrationJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getDpalIntegrationStatus() {
  return getJson<{ ok: boolean; providers: any[] }>("/api/integrations/status");
}

export function getDpalCityIntelligence(lat: number, lng: number, city = "Selected City") {
  const q = new URLSearchParams({ lat: String(lat), lng: String(lng), city });
  return getJson<{ ok: boolean; packet: any }>(`/api/integrations/city-intelligence?${q.toString()}`);
}

export function getDpalFloodRisk(lat: number, lng: number) {
  const q = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return getJson<{ ok: boolean; result: any }>(`/api/integrations/flood-risk?${q.toString()}`);
}

export function getDpalAirQuality(lat: number, lng: number) {
  const q = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return getJson<{ ok: boolean; result: any }>(`/api/integrations/air-quality?${q.toString()}`);
}

export function geocodeDpalLocation(text: string) {
  const q = new URLSearchParams({ text });
  return getJson<{ ok: boolean; result: any }>(`/api/integrations/geocode?${q.toString()}`);
}

export function estimateDpalEmissions(body: {
  activity_id: string;
  data_version?: string;
  parameters: Record<string, unknown>;
}) {
  return postJson<{ ok: boolean; result: any }>("/api/integrations/emissions/estimate", body);
}

export function createDpalEvidencePacketPreview(body: Record<string, unknown>) {
  return postJson<{ ok: boolean; packet: any }>("/api/integrations/evidence/packet-preview", body);
}

export type WaterAlertEvidencePacketParams = {
  lat: number;
  lng: number;
  label?: string;
  usgsSite?: string;
};

/** Same-query concurrent GETs share one network request (tabs, refresh races, Strict Mode). */
const waterAlertPacketInflight = new Map<string, Promise<{ ok?: boolean; packet?: any; [key: string]: any }>>();

export function getWaterAlertEvidencePacket(params: WaterAlertEvidencePacketParams) {
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.label?.trim()) q.set("label", params.label.trim());
  if (params.usgsSite?.trim()) q.set("usgsSite", params.usgsSite.trim());
  const dedupeKey = q.toString();
  const existing = waterAlertPacketInflight.get(dedupeKey);
  if (existing) {
    if (import.meta.env.DEV) {
      console.info("[DPAL water alert evidence] deduped concurrent packet request", {
        lat: params.lat,
        lng: params.lng,
      });
    }
    return existing;
  }
  const path = `/api/integrations/water/alert-evidence-packet?${dedupeKey}`;
  const p = getJson<{ ok?: boolean; packet?: any; [key: string]: any }>(path).finally(() => {
    waterAlertPacketInflight.delete(dedupeKey);
  });
  waterAlertPacketInflight.set(dedupeKey, p);
  return p;
}
