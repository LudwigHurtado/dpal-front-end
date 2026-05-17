import { API_ROUTES, apiUrl } from '../../../../constants';

export type DmrvAiAvailability = {
  configured: boolean;
  serverReachable: boolean;
  geminiReady: boolean;
  message: string;
};

export async function fetchDmrvAiAvailability(): Promise<DmrvAiAvailability> {
  const useServer = import.meta.env.VITE_USE_SERVER_AI === 'true';
  const clientKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim());

  if (!useServer && !clientKey) {
    return {
      configured: false,
      serverReachable: false,
      geminiReady: false,
      message: 'Set VITE_USE_SERVER_AI=true with VITE_API_BASE, or VITE_GEMINI_API_KEY in .env.local',
    };
  }

  if (clientKey && !useServer) {
    return {
      configured: true,
      serverReachable: true,
      geminiReady: true,
      message: 'Browser Gemini key configured',
    };
  }

  try {
    const res = await fetch(apiUrl(API_ROUTES.AI_STATUS), { method: 'GET' });
    if (!res.ok) {
      return {
        configured: useServer || clientKey,
        serverReachable: res.status !== 404,
        geminiReady: false,
        message:
          res.status === 404
            ? 'API host has no /api/ai/status — point VITE_API_BASE at Railway or run local backend with gemini proxy'
            : `AI status HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as { ok?: boolean; gemini?: boolean };
    const geminiReady = Boolean(data.gemini);
    return {
      configured: true,
      serverReachable: true,
      geminiReady,
      message: geminiReady
        ? 'Server Gemini ready'
        : 'Server reachable but GEMINI_API_KEY missing on API host',
    };
  } catch {
    if (clientKey) {
      return {
        configured: true,
        serverReachable: false,
        geminiReady: true,
        message: 'Server AI unreachable — using browser Gemini key',
      };
    }
    return {
      configured: useServer,
      serverReachable: false,
      geminiReady: false,
      message: 'Cannot reach API for server AI — check VITE_API_BASE and network',
    };
  }
}
