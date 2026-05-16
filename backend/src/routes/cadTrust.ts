import { Router } from 'express';

const router = Router();

/** Outbound probe timeout — keeps /health responsive when CAD Trust is slow or down. */
const CADTRUST_PROBE_TIMEOUT_MS = 12_000;

function organizationsProbeUrl(): string | null {
  const base = process.env.CADTRUST_API_BASE?.trim();
  if (!base) return null;
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}/organizations`;
}

router.get('/health', async (_req, res) => {
  const syncEnabled = process.env.CADTRUST_SYNC_ENABLED === 'true';

  if (!syncEnabled) {
    return res.json({
      ok: true,
      status: 'demo_mode',
      live: false,
      message: 'CAD Trust connector installed; live sync disabled',
    });
  }

  const url = organizationsProbeUrl();
  const apiKey = process.env.CADTRUST_API_KEY?.trim();

  if (!url || !apiKey) {
    return res.json({
      ok: true,
      status: 'not_connected',
      live: false,
      message: 'CAD Trust API endpoint not reachable',
    });
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), CADTRUST_PROBE_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
      signal: ac.signal,
    });

    clearTimeout(timer);

    if (upstream.ok) {
      try {
        await upstream.text();
      } catch {
        return res.json({
          ok: true,
          status: 'not_connected',
          live: false,
          message: 'CAD Trust API endpoint not reachable',
        });
      }
      return res.json({
        ok: true,
        status: 'live_connected',
        live: true,
        message: 'CAD Trust API connected',
      });
    }

    return res.json({
      ok: true,
      status: 'not_connected',
      live: false,
      message: 'CAD Trust API endpoint not reachable',
    });
  } catch (err) {
    clearTimeout(timer);
    const code = err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'request_failed';
    console.warn('[cadtrust] health upstream probe failed:', code);
    return res.json({
      ok: true,
      status: 'not_connected',
      live: false,
      message: 'CAD Trust API endpoint not reachable',
    });
  }
});

export default router;
