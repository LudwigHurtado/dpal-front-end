import { Router, type Request, type Response } from 'express';
import {
  estimateClimatiqEmissions,
  isClimatiqConfigured,
  searchClimatiqFactors,
  type ClimatiqEstimatePayload,
} from '../services/climatiqClient';

const router = Router();

/**
 * GET /api/climatiq/health
 * Configuration probe — never returns the API key.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    provider: 'climatiq',
    configured: isClimatiqConfigured(),
    dataVersion: process.env.CLIMATIQ_DATA_VERSION?.trim() || '^21',
  });
});

/**
 * GET /api/climatiq/search?query=electricity&region=US&...
 * Proxies Climatiq emission-factor search (server-held Bearer token).
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    if (!isClimatiqConfigured()) {
      return res.status(503).json({
        ok: false,
        provider: 'climatiq',
        error: 'CLIMATIQ_API_KEY is not configured',
      });
    }

    const data = await searchClimatiqFactors({
      query: String(req.query.query || 'electricity'),
      region: req.query.region ? String(req.query.region) : undefined,
      year: req.query.year ? String(req.query.year) : undefined,
      sector: req.query.sector ? String(req.query.sector) : undefined,
      scope: req.query.scope ? String(req.query.scope) : undefined,
      unit_type: req.query.unit_type ? String(req.query.unit_type) : undefined,
      results_per_page: req.query.results_per_page
        ? String(req.query.results_per_page)
        : '10',
    });

    res.json({
      ok: true,
      provider: 'climatiq',
      data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Climatiq search failed';
    res.status(500).json({
      ok: false,
      provider: 'climatiq',
      error: message,
    });
  }
});

/**
 * POST /api/climatiq/estimate
 * Body: { emission_factor: { activity_id, data_version?, region? }, parameters: { ... } }
 */
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    if (!isClimatiqConfigured()) {
      return res.status(503).json({
        ok: false,
        provider: 'climatiq',
        error: 'CLIMATIQ_API_KEY is not configured',
      });
    }

    const body = req.body as ClimatiqEstimatePayload | undefined;
    const activityId = body?.emission_factor?.activity_id;
    if (!activityId || typeof activityId !== 'string') {
      return res.status(400).json({
        ok: false,
        provider: 'climatiq',
        error: 'emission_factor.activity_id is required',
      });
    }
    if (!body?.parameters || typeof body.parameters !== 'object') {
      return res.status(400).json({
        ok: false,
        provider: 'climatiq',
        error: 'parameters object is required',
      });
    }

    const data = await estimateClimatiqEmissions(body);

    res.json({
      ok: true,
      provider: 'climatiq',
      data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Climatiq estimate failed';
    res.status(500).json({
      ok: false,
      provider: 'climatiq',
      error: message,
    });
  }
});

export default router;
