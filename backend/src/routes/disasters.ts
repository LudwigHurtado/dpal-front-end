import { Router } from 'express';
import { fetchGlobalDisasterEvents } from '../services/globalDisastersFeedService';

const router = Router();

let cache: { fetchedAt: number; events: Awaited<ReturnType<typeof fetchGlobalDisasterEvents>> } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

router.get('/feed', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      return res.json({ ok: true, events: cache.events, cached: true });
    }

    const events = await fetchGlobalDisasterEvents();
    cache = { fetchedAt: now, events };
    res.json({ ok: true, events, cached: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Disaster feed failed';
    console.error('[disasters/feed]', message);
    res.status(502).json({ ok: false, error: message, events: [] });
  }
});

export default router;
