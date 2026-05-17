import { Router, type Request, type Response } from 'express';
import {
  buildLidarContextForAoi,
  get3depProviderStatus,
  getElevationAtPoint,
} from '../services/usgs3depService';

const router = Router();

/**
 * GET /api/providers/usgs-3dep/status
 */
router.get('/status', (_req: Request, res: Response) => {
  try {
    return res.json({ ok: true, ...get3depProviderStatus() });
  } catch {
    return res.status(500).json({
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_STATUS_UNAVAILABLE',
      message: 'Could not read USGS 3DEP provider status.',
    });
  }
});

/**
 * POST /api/providers/usgs-3dep/elevation
 * Body: { lat, lng, units?: "Meters" | "Feet" }
 */
router.post('/elevation', async (req: Request, res: Response) => {
  try {
    const body = req.body as { lat?: unknown; lng?: unknown; units?: string } | undefined;
    const result = await getElevationAtPoint({
      lat: body?.lat as number,
      lng: body?.lng as number,
      units: body?.units,
    });
    if (!result.ok) {
      const status = result.error === 'USGS_3DEP_VALIDATION_ERROR' ? 400 : 503;
      return res.status(status).json(result);
    }
    return res.json(result);
  } catch {
    return res.status(500).json({
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_ELEVATION_UNAVAILABLE',
      message: 'Elevation request failed.',
      fetchedAt: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/providers/usgs-3dep/lidar-context
 * Body: { centerLat?, centerLng?, radiusKm?, aoiGeoJson? }
 */
router.post('/lidar-context', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      centerLat?: unknown;
      centerLng?: unknown;
      radiusKm?: unknown;
      aoiGeoJson?: unknown;
    } | undefined;

    const result = await buildLidarContextForAoi({
      centerLat:
        typeof body?.centerLat === 'number'
          ? body.centerLat
          : typeof body?.centerLat === 'string'
            ? parseFloat(body.centerLat)
            : undefined,
      centerLng:
        typeof body?.centerLng === 'number'
          ? body.centerLng
          : typeof body?.centerLng === 'string'
            ? parseFloat(body.centerLng)
            : undefined,
      radiusKm:
        typeof body?.radiusKm === 'number'
          ? body.radiusKm
          : typeof body?.radiusKm === 'string'
            ? parseFloat(body.radiusKm)
            : undefined,
      aoiGeoJson: body?.aoiGeoJson ?? null,
    });

    if (!result.ok) {
      const status = result.error === 'USGS_3DEP_VALIDATION_ERROR' ? 400 : 503;
      return res.status(status).json(result);
    }
    return res.json(result);
  } catch {
    return res.status(500).json({
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_ELEVATION_UNAVAILABLE',
      message: 'LiDAR context request failed.',
      fetchedAt: new Date().toISOString(),
    });
  }
});

export default router;
