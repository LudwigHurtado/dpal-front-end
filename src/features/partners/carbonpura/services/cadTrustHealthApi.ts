import { apiUrl, API_ROUTES } from '../../../../../constants';

export type CadTrustHealthPayload = {
  ok: true;
  status: 'live_connected' | 'not_connected' | 'demo_mode';
  live: boolean;
  message: string;
};

function coerceHealth(body: Record<string, unknown>): CadTrustHealthPayload | null {
  if (body.ok !== true) return null;

  const status = body.status;
  const live = body.live === true;

  if (status === 'live_connected' && live) {
    return {
      ok: true,
      status: 'live_connected',
      live: true,
      message: typeof body.message === 'string' ? body.message : 'CAD Trust API connected',
    };
  }

  if (status === 'not_connected' && body.live === false) {
    return {
      ok: true,
      status: 'not_connected',
      live: false,
      message:
        typeof body.message === 'string' ? body.message : 'CAD Trust API endpoint not reachable',
    };
  }

  if (status === 'demo_mode' && body.live === false) {
    return {
      ok: true,
      status: 'demo_mode',
      live: false,
      message:
        typeof body.message === 'string'
          ? body.message
          : 'CAD Trust connector installed; live sync disabled',
    };
  }

  return null;
}

export async function fetchCadTrustHealth(): Promise<CadTrustHealthPayload | null> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.CADTRUST_HEALTH), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Record<string, unknown>;
    return coerceHealth(raw);
  } catch {
    return null;
  }
}
