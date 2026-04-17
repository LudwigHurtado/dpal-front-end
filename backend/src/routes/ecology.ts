import { Router } from 'express';
import { landsatEcologyAdapter } from '../services/adapters/landsatEcology.adapter';

const router = Router();

router.get('/landsat-scan', async (req, res) => {
  try {
    const lat = Number.parseFloat(String(req.query.lat ?? ''));
    const lng = Number.parseFloat(String(req.query.lng ?? ''));
    const radiusKm = Number.parseFloat(String(req.query.radiusKm ?? '15'));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat and lng required' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'lat/lng out of range' });
    }

    const data = await landsatEcologyAdapter.getFoliageScan(lat, lng, Number.isFinite(radiusKm) ? radiusKm : 15);
    res.json(data);
  } catch (error) {
    console.error('Ecology Landsat scan error:', error);
    res.status(500).json({ error: 'Failed to fetch Landsat ecology data' });
  }
});

export default router;
