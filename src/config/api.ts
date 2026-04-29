const DEFAULT_API_BASE = 'https://web-production-a27b.up.railway.app';
const LOCAL_DEV_API_BASE = 'http://localhost:3001';

type EnvBag = Record<string, unknown>;

function env(): EnvBag {
  return ((import.meta as unknown as { env?: EnvBag }).env ?? {}) as EnvBag;
}

function normalizeBase(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

function isFrontendHost(host: string): boolean {
  const h = host.toLowerCase();
  return h.includes('dpal-front-end.vercel.app') || h.includes('vercel.app');
}

export type DpalApiConfig = {
  frontendOrigin: string;
  publicFrontendBaseUrl: string;
  apiBaseUrl: string;
  aiServerUrl: string;
  mediaBaseUrl: string;
  source: 'explicit' | 'legacy' | 'dev-fallback' | 'railway-fallback';
  hasExplicitApiConfig: boolean;
};

let warnedMissingApi = false;
let warnedFrontendAsApi = false;

export function getDpalApiConfig(): DpalApiConfig {
  const e = env();
  const frontendOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const isDev = Boolean(e.DEV);
  const fromOverride =
    typeof window !== 'undefined' ? normalizeBase(window.localStorage.getItem('dpal_api_base_override')) : '';
  const fromNew = normalizeBase(e.VITE_DPAL_API_BASE_URL);
  const fromAi = normalizeBase(e.VITE_DPAL_AI_SERVER_URL);
  const fromLegacy = normalizeBase(e.VITE_API_BASE);

  const apiBase =
    fromOverride || fromNew || fromAi || fromLegacy || (isDev ? LOCAL_DEV_API_BASE : DEFAULT_API_BASE);
  const source: DpalApiConfig['source'] = fromOverride || fromNew || fromAi
    ? 'explicit'
    : fromLegacy
      ? 'legacy'
      : isDev
        ? 'dev-fallback'
        : 'railway-fallback';

  if (!fromOverride && !fromNew && !fromAi && !fromLegacy && !warnedMissingApi) {
    warnedMissingApi = true;
    console.warn(
      '[DPAL API] Missing backend URL env. Set VITE_DPAL_API_BASE_URL (preferred) or VITE_API_BASE. Using fallback:',
      apiBase,
    );
  }

  try {
    const host = new URL(apiBase).hostname;
    if (isFrontendHost(host) && !warnedFrontendAsApi) {
      warnedFrontendAsApi = true;
      console.warn(
        '[DPAL API] Backend API points to a frontend host. This can break situation chat/media persistence:',
        apiBase,
      );
    }
  } catch {
    /* no-op */
  }

  const publicFrontendBaseUrl =
    normalizeBase(e.VITE_DPAL_PUBLIC_FRONTEND_URL) || frontendOrigin || 'https://dpal-front-end.vercel.app';
  const mediaBaseUrl = normalizeBase(e.VITE_DPAL_MEDIA_BASE_URL) || apiBase;

  return {
    frontendOrigin,
    publicFrontendBaseUrl,
    apiBaseUrl: apiBase,
    aiServerUrl: fromAi || apiBase,
    mediaBaseUrl,
    source,
    hasExplicitApiConfig: Boolean(fromOverride || fromNew || fromAi || fromLegacy),
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
    configuredApiBaseUrl: cfg.apiBaseUrl,
    apiSource: cfg.source,
    chatEndpoint: input.chatEndpoint ?? `${cfg.apiBaseUrl}/api/situation/:roomId/messages`,
    mediaEndpoint: input.mediaEndpoint ?? `${cfg.apiBaseUrl}/api/situation/media`,
    reportId: input.reportId ?? null,
    roomId: input.roomId ?? null,
  });
}
