import { Router } from 'express';
import { earthObservationService } from '../services/earthObservationService';

const router = Router();

const ALLOWED_TYPES = new Set([
  'deforestation',
  'agriculture',
  'pollution',
  'carbon',
  'flood_fire',
  'urban',
  'water',
  'heat',
]);

router.post('/scan', async (req, res) => {
  const {
    analysisType,
    latitude,
    longitude,
    radiusKm,
    startDate,
    endDate,
  } = req.body ?? {};

  if (!ALLOWED_TYPES.has(String(analysisType))) {
    return res.status(400).json({ ok: false, error: 'analysisType must be one of deforestation, agriculture, pollution, carbon, flood_fire, urban, water, heat' });
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const radius = Number(radiusKm);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ ok: false, error: 'latitude and longitude are required' });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ ok: false, error: 'latitude/longitude out of range' });
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > 250) {
    return res.status(400).json({ ok: false, error: 'radiusKm must be > 0 and <= 250' });
  }

  const start = new Date(String(startDate));
  const end = new Date(String(endDate));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return res.status(400).json({ ok: false, error: 'startDate and endDate must be valid ISO dates' });
  }
  if (start > end) {
    return res.status(400).json({ ok: false, error: 'startDate must be before endDate' });
  }

  try {
    const result = await earthObservationService.scan({
      analysisType,
      latitude: lat,
      longitude: lng,
      radiusKm: radius,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    return res.json(result);
  } catch (error) {
    console.error('Earth observation scan error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to run Earth Observation scan' });
  }
});

export default router;
