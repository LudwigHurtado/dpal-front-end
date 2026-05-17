/**
 * Shared DPAL AI detection and guidance client (server + browser modes).
 */
import { API_ROUTES, apiUrl } from '../../constants';
import { getDpalApiConfig, LOCAL_BACKEND_ORIGIN } from '../config/api';

export type AiMode = 'server' | 'browser' | 'offline';

export type AiHealthResponse = {
  ok: boolean;
  configured: boolean;
  provider: 'gemini';
  mode: AiMode;
  missing: string[];
  /** HTTP or network detail — never includes secrets. */
  detail?: string;
  checkedAt: string;
};

export type AiGuidanceRequest = {
  prompt: string;
  model?: string;
  context?: string;
};

export type AiGuidanceResponse = {
  ok: boolean;
  mode: 'live' | 'offline';
  provider: 'gemini';
  text: string;
  suggestions?: string[];
  error?: {
    code: string;
    message: string;
  };
};

export type AiErrorNormalized = {
  code: string;
  message: string;
  mode: AiMode;
};

export const LIVE_AI_UNAVAILABLE_USER_MESSAGE =
  'Live AI guidance is temporarily unavailable. DPAL is using offline guidance based on the current project context.';

const HEALTH_CACHE_MS = 30_000;
let healthCache: { at: number; value: AiHealthResponse } | null = null;

export function shouldUseServerAi(): boolean {
  return String(import.meta.env.VITE_USE_SERVER_AI ?? '').toLowerCase() === 'true';
}

export function hasBrowserGeminiKey(): boolean {
  return Boolean(String(import.meta.env.VITE_GEMINI_API_KEY ?? '').trim());
}

/** True when the app is configured to attempt AI (browser key or server mode). */
export function isAiConfigured(): boolean {
  return hasBrowserGeminiKey() || shouldUseServerAi();
}

export function getNormalizedApiBase(): string {
  const cfg = getDpalApiConfig();
  if (cfg.apiBaseUrl) return cfg.apiBaseUrl;
  const raw = String(import.meta.env.VITE_API_BASE ?? '').trim();
  if (raw) return raw.replace(/\/+$/, '');
  if (import.meta.env.DEV) return LOCAL_BACKEND_ORIGIN;
  return '';
}

function logDevDiagnostics(health: AiHealthResponse): void {
  if (!import.meta.env.DEV) return;
  console.info('[DPAL AI] mode', {
    useServerAi: shouldUseServerAi(),
    apiBase: getNormalizedApiBase(),
    hasBrowserGeminiKey: hasBrowserGeminiKey(),
    health,
  });
}

function mapLegacyStatusToHealth(data: Record<string, unknown>): AiHealthResponse {
  const gemini = Boolean(data.gemini ?? data.hasKey ?? data.configured);
  return {
    ok: gemini,
    configured: gemini,
    provider: 'gemini',
    mode: 'server',
    missing: gemini ? [] : ['GEMINI_API_KEY'],
    checkedAt: new Date().toISOString(),
  };
}

function normalizeHealthPayload(data: Record<string, unknown>, mode: AiMode): AiHealthResponse {
  const configured = Boolean(data.configured ?? data.ok);
  const ok = Boolean(data.ok ?? configured);
  const missing = Array.isArray(data.missing)
    ? data.missing.map((m) => String(m))
    : configured
      ? []
      : ['GEMINI_API_KEY'];
  return {
    ok,
    configured,
    provider: 'gemini',
    mode: (data.mode as AiMode) || mode,
    missing,
    detail: typeof data.detail === 'string' ? data.detail : undefined,
    checkedAt: new Date().toISOString(),
  };
}

async function fetchServerHealthFromApi(): Promise<AiHealthResponse> {
  const mode: AiMode = 'server';
  const explicitBase = String(import.meta.env.VITE_API_BASE ?? '').trim();

  if (!explicitBase && !import.meta.env.DEV && typeof window === 'undefined') {
    return {
      ok: false,
      configured: false,
      provider: 'gemini',
      mode,
      missing: ['VITE_API_BASE'],
      detail: 'VITE_API_BASE is not set on this deployment.',
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    const healthRes = await fetch(apiUrl(API_ROUTES.AI_HEALTH));
    if (healthRes.ok) {
      const data = (await healthRes.json()) as Record<string, unknown>;
      if (typeof data.configured === 'boolean' || typeof data.ok === 'boolean') {
        return normalizeHealthPayload(data, mode);
      }
    }
  } catch {
    /* try legacy status */
  }

  try {
    const statusRes = await fetch(apiUrl(API_ROUTES.AI_STATUS));
    if (statusRes.ok) {
      const data = (await statusRes.json()) as Record<string, unknown>;
      return mapLegacyStatusToHealth(data);
    }
    return {
      ok: false,
      configured: false,
      provider: 'gemini',
      mode,
      missing: [],
      detail:
        statusRes.status === 404
          ? 'API host has no /api/ai/health or /api/ai/status — run backend/ (port 3001) or set VITE_API_BASE.'
          : `AI status HTTP ${statusRes.status}`,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      configured: false,
      provider: 'gemini',
      mode,
      missing: [],
      detail: err instanceof Error ? err.message : 'Cannot reach API for server AI',
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Whether live Gemini should be used right now (health-checked in server mode).
 */
export async function isAiLive(force = false): Promise<boolean> {
  const health = await getAiHealth(force);
  return health.ok && health.configured;
}

export async function getAiHealth(force = false): Promise<AiHealthResponse> {
  if (!force && healthCache && Date.now() - healthCache.at < HEALTH_CACHE_MS) {
    return healthCache.value;
  }

  let value: AiHealthResponse;

  if (shouldUseServerAi()) {
    value = await fetchServerHealthFromApi();
  } else if (hasBrowserGeminiKey()) {
    value = {
      ok: true,
      configured: true,
      provider: 'gemini',
      mode: 'browser',
      missing: [],
      checkedAt: new Date().toISOString(),
    };
  } else {
    value = {
      ok: false,
      configured: false,
      provider: 'gemini',
      mode: 'offline',
      missing: ['VITE_GEMINI_API_KEY'],
      detail: import.meta.env.DEV
        ? 'Set VITE_USE_SERVER_AI=true and run backend/, or VITE_GEMINI_API_KEY for browser mode.'
        : undefined,
      checkedAt: new Date().toISOString(),
    };
  }

  healthCache = { at: Date.now(), value };
  logDevDiagnostics(value);
  return value;
}

export function clearAiHealthCache(): void {
  healthCache = null;
}

export function normalizeAiError(err: unknown, mode: AiMode = 'offline'): AiErrorNormalized {
  if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
    const e = err as { code?: string; message?: string };
    return {
      code: String(e.code ?? 'AI_UNKNOWN'),
      message: String(e.message ?? LIVE_AI_UNAVAILABLE_USER_MESSAGE),
      mode,
    };
  }
  const message = err instanceof Error ? err.message : LIVE_AI_UNAVAILABLE_USER_MESSAGE;
  if (/not configured|no ai key|GEMINI_API_KEY/i.test(message)) {
    return { code: 'AI_NOT_CONFIGURED', message, mode };
  }
  if (/failed to fetch|network/i.test(message)) {
    return { code: 'AI_NETWORK_ERROR', message, mode };
  }
  return { code: 'AI_PROVIDER_UNAVAILABLE', message, mode };
}

export async function sendAiGuidance(request: AiGuidanceRequest): Promise<AiGuidanceResponse> {
  const prompt = request.prompt?.trim();
  if (!prompt) {
    return {
      ok: false,
      mode: 'offline',
      provider: 'gemini',
      text: LIVE_AI_UNAVAILABLE_USER_MESSAGE,
      error: { code: 'AI_EMPTY_PROMPT', message: 'Prompt is required.' },
    };
  }

  if (!shouldUseServerAi() && hasBrowserGeminiKey()) {
    const { runGeminiPrompt } = await import('../../services/geminiService');
    try {
      const text = await runGeminiPrompt(prompt);
      return {
        ok: true,
        mode: 'live',
        provider: 'gemini',
        text: text.trim(),
        suggestions: [],
      };
    } catch (err) {
      const normalized = normalizeAiError(err, 'browser');
      return {
        ok: false,
        mode: 'offline',
        provider: 'gemini',
        text: LIVE_AI_UNAVAILABLE_USER_MESSAGE,
        error: { code: normalized.code, message: normalized.message },
      };
    }
  }

  if (!shouldUseServerAi()) {
    return {
      ok: false,
      mode: 'offline',
      provider: 'gemini',
      text: LIVE_AI_UNAVAILABLE_USER_MESSAGE,
      error: { code: 'AI_NOT_CONFIGURED', message: 'AI is not configured for this deployment.' },
    };
  }

  const live = await isAiLive();
  if (!live) {
    return {
      ok: false,
      mode: 'offline',
      provider: 'gemini',
      text: LIVE_AI_UNAVAILABLE_USER_MESSAGE,
      error: { code: 'AI_NOT_CONFIGURED', message: 'Server AI is not configured or unreachable.' },
    };
  }

  try {
    const res = await fetch(apiUrl(API_ROUTES.AI_GUIDANCE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: request.model,
        context: request.context,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as AiGuidanceResponse & { error?: string };
    if (data && typeof data.ok === 'boolean' && typeof data.text === 'string') {
      return {
        ok: data.ok,
        mode: data.mode ?? (data.ok ? 'live' : 'offline'),
        provider: 'gemini',
        text: data.text,
        suggestions: data.suggestions ?? [],
        error: data.error,
      };
    }
    if (!res.ok) {
      const msg = typeof data.error === 'string' ? data.error : `HTTP ${res.status}`;
      return {
        ok: false,
        mode: 'offline',
        provider: 'gemini',
        text: LIVE_AI_UNAVAILABLE_USER_MESSAGE,
        error: { code: 'AI_PROVIDER_UNAVAILABLE', message: msg },
      };
    }
    return {
      ok: true,
      mode: 'live',
      provider: 'gemini',
      text: String((data as { text?: string }).text ?? ''),
      suggestions: [],
    };
  } catch (err) {
    const normalized = normalizeAiError(err, 'server');
    return {
      ok: false,
      mode: 'offline',
      provider: 'gemini',
      text: LIVE_AI_UNAVAILABLE_USER_MESSAGE,
      error: { code: normalized.code, message: normalized.message },
    };
  }
}

/** Dev-only diagnostics snapshot for UI panels. */
export async function getAiDiagnostics(): Promise<{
  mode: AiMode;
  useServerAi: boolean;
  apiBase: string;
  hasBrowserGeminiKey: boolean;
  health: AiHealthResponse;
}> {
  const health = await getAiHealth(true);
  return {
    mode: health.mode,
    useServerAi: shouldUseServerAi(),
    apiBase: getNormalizedApiBase(),
    hasBrowserGeminiKey: hasBrowserGeminiKey(),
    health,
  };
}
