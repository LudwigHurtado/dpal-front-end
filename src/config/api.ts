/** Repo Express + Prisma API (`backend/`, default port 3001). */
export const LOCAL_BACKEND_ORIGIN = 'http://127.0.0.1:3001';

type EnvBag = Record<string, unknown>;

function env(): EnvBag {
  return ((import.meta as unknown as { env?: EnvBag }).env ?? {}) as EnvBag;
}

function normalizeBase(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

function isFrontendHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.includes('dpal-front-end.vercel.app') ||
    h.includes('vercel.app') ||
    h === 'dpal.info' ||
    h === 'www.dpal.info'
  );
}

/**
 * When the SPA is served from a host that rewrites `/api/*` to the deployed backend (see `vercel.json`),
 * use same-origin relative paths so the browser never hits cross-origin CORS.
 */
function shouldUseSameOriginApiProxy(apiBase: string, frontendOrigin: string): boolean {
  if (!apiBase || !frontendOrigin || typeof window === 'undefined') return false;
  try {
    const fe = new URL(frontendOrigin);
    const api = new URL(apiBase);
    if (fe.hostname === api.hostname) return false;
    const isLocalDev = fe.hostname === 'localhost' || fe.hostname === '127.0.0.1';
    if (isLocalDev) return false;
    return true;
  } catch {
    return false;
  }
}

export type DpalApiConfig = {
  frontendOrigin: string;
  publicFrontendBaseUrl: string;
  apiBaseUrl: string;
  /** @deprecated Use apiBaseUrl. Kept for geminiService fallback reads only. */
  aiServerUrl: string;
  mediaBaseUrl: string;
  source: 'explicit' | 'legacy' | 'dev-fallback' | 'backend-fallback';
  hasExplicitApiConfig: boolean;
};

let warnedMissingApi = false;
let warnedDeprecatedAiServerUrl = false;
let warnedFrontendAsApi = false;

export function getDpalApiConfig(): DpalApiConfig {
  const e = env();
  const frontendOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const isDev = Boolean(e.DEV);
  const fromOverride =
    typeof window !== 'undefined' ? normalizeBase(window.localStorage.getItem('dpal_api_base_override')) : '';
  const fromNew = normalizeBase(e.VITE_DPAL_API_BASE_URL);
  const fromLegacy = normalizeBase(e.VITE_API_BASE);
  const fromDeprecatedAi = normalizeBase(e.VITE_DPAL_AI_SERVER_URL);
  if (fromDeprecatedAi && !warnedDeprecatedAiServerUrl) {
    warnedDeprecatedAiServerUrl = true;
    console.warn(
      '[DPAL API] VITE_DPAL_AI_SERVER_URL is deprecated. Use VITE_API_BASE or VITE_DPAL_API_BASE_URL (repo backend/ only — not a separate “Deepal” server).',
    );
  }

  /**
   * Dev without explicit env: empty base → relative `/api/*` via Vite proxy to `backend/` (port 3001).
   * Prod without explicit env: empty base → same-origin `/api/*` when hosting rewrites to backend.
   */
  const apiBase =
    fromOverride || fromNew || fromLegacy || fromDeprecatedAi || (isDev ? '' : '');
  const source: DpalApiConfig['source'] = fromOverride || fromNew
    ? 'explicit'
    : fromLegacy || fromDeprecatedAi
      ? 'legacy'
      : isDev
        ? 'dev-fallback'
        : 'backend-fallback';

  if (!fromOverride && !fromNew && !fromLegacy && !fromDeprecatedAi && !warnedMissingApi) {
    warnedMissingApi = true;
    console.warn(
      '[DPAL API] No VITE_API_BASE set. Local dev uses Vite /api proxy → backend/ (port 3001). Production: set VITE_API_BASE to your deployed backend/ origin.',
    );
  }

  if (apiBase) {
    try {
      const host = new URL(apiBase).hostname;
      if (isFrontendHost(host) && !warnedFrontendAsApi) {
        warnedFrontendAsApi = true;
        console.warn(
          '[DPAL API] Backend API points to a frontend host. Set VITE_API_BASE to your backend/ service:',
          apiBase,
        );
      }
    } catch {
      /* no-op */
    }
  }

  const publicFrontendBaseUrl =
    normalizeBase(e.VITE_DPAL_PUBLIC_FRONTEND_URL) || frontendOrigin || 'https://dpal-front-end.vercel.app';
  const resolvedApiBase = shouldUseSameOriginApiProxy(apiBase, frontendOrigin) ? '' : apiBase;
  const mediaBaseUrl =
    normalizeBase(e.VITE_DPAL_MEDIA_BASE_URL) ||
    (resolvedApiBase === '' ? apiBase : resolvedApiBase);

  return {
    frontendOrigin,
    publicFrontendBaseUrl,
    apiBaseUrl: resolvedApiBase,
    aiServerUrl: resolvedApiBase || apiBase,
    mediaBaseUrl,
    source,
    hasExplicitApiConfig: Boolean(fromOverride || fromNew || fromLegacy || fromDeprecatedAi),
  };
}

export function buildApiUrl(path: string): string {
  const { apiBaseUrl } = getDpalApiConfig();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${p}`;
}

export function buildMediaUrl(path: string): string {
  const { mediaBaseUrl } = getDpalApiConfig();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${mediaBaseUrl}${p}`;
}

export function logSituationRoomDiagnostics(input: {
  reportId?: string | null;
  roomId?: string | null;
  chatEndpoint?: string;
  mediaEndpoint?: string;
}): void {
  const cfg = getDpalApiConfig();
  console.info('[DPAL Situation Diagnostics]', {
    frontendOrigin: cfg.frontendOrigin,
    configuredApiBaseUrl: cfg.apiBaseUrl || '(same-origin /api → backend/)',
    apiSource: cfg.source,
    chatEndpoint: input.chatEndpoint ?? `${cfg.apiBaseUrl || ''}/api/situation/:roomId/messages`,
    mediaEndpoint: input.mediaEndpoint ?? `${cfg.apiBaseUrl || ''}/api/situation/media`,
    reportId: input.reportId ?? null,
    roomId: input.roomId ?? null,
  });
}
