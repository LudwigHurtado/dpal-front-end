import {
  getAiHealth,
  hasBrowserGeminiKey,
  isAiConfigured,
  shouldUseServerAi,
  type AiHealthResponse,
} from '../../../services/dpalAiClient';

export type DmrvAiAvailability = {
  configured: boolean;
  serverReachable: boolean;
  geminiReady: boolean;
  message: string;
  health?: AiHealthResponse;
};

function availabilityMessage(health: AiHealthResponse, geminiReady: boolean): string {
  if (geminiReady) {
    return health.mode === 'browser'
      ? 'Browser Gemini configured'
      : 'Server Gemini ready';
  }
  if (health.missing.includes('VITE_API_BASE')) {
    return health.detail ?? 'VITE_API_BASE is required for server AI mode.';
  }
  if (health.missing.includes('GEMINI_API_KEY')) {
    return 'Server reachable but GEMINI_API_KEY is missing on backend/.';
  }
  return health.detail ?? 'Live AI is not available right now.';
}

export async function fetchDmrvAiAvailability(force = false): Promise<DmrvAiAvailability> {
  if (!isAiConfigured()) {
    return {
      configured: false,
      serverReachable: false,
      geminiReady: false,
      message: shouldUseServerAi()
        ? 'Set VITE_USE_SERVER_AI=true and run backend/ (port 3001), or set VITE_API_BASE=http://127.0.0.1:3001.'
        : 'Set VITE_GEMINI_API_KEY or VITE_USE_SERVER_AI=true with backend/ running.',
    };
  }

  const health = await getAiHealth(force);
  const geminiReady = health.ok && health.configured;
  const serverReachable =
    health.mode === 'browser' || health.mode === 'offline'
      ? hasBrowserGeminiKey()
      : geminiReady || Boolean(health.detail && !/cannot reach/i.test(health.detail));

  return {
    configured: true,
    serverReachable,
    geminiReady,
    message: availabilityMessage(health, geminiReady),
    health,
  };
}
