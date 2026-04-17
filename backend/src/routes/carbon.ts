import { Router } from 'express';
import { carbonGasAdapter } from '../services/adapters/carbonGas.adapter';
import { mineralAdapter } from '../services/adapters/mineral.adapter';

const router = Router();

// Air quality monitoring endpoint
router.get('/air-quality', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const data = await carbonGasAdapter.getAirQualityData(parseFloat(lat as string), parseFloat(lng as string));
    res.json(data);
  } catch (error) {
    console.error('Air quality error:', error);
    res.status(500).json({ error: 'Failed to fetch air quality data' });
  }
});

// Mineral mapping endpoint
router.get('/minerals', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const data = await mineralAdapter.getMineralData(parseFloat(lat as string), parseFloat(lng as string));
    res.json(data);
  } catch (error) {
    console.error('Mineral mapping error:', error);
    res.status(500).json({ error: 'Failed to fetch mineral data' });
  }
});

export default router;