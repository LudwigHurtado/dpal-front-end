import { Router } from 'express';
import { deriveClassificationOverlay } from '../services/aquascan/aquascanOverlayService';

const router = Router();

router.post('/overlays/ndwi', async (req, res) => {
  res.json(await deriveClassificationOverlay('ndwi_water_presence', req.body ?? {}));
});

router.post('/overlays/water-extent', async (req, res) => {
  res.json(await deriveClassificationOverlay('water_extent', req.body ?? {}));
});

router.post('/overlays/flood-wet', async (req, res) => {
  res.json(await deriveClassificationOverlay('flood_wet', req.body ?? {}));
});

router.post('/overlays/risk-zones', async (req, res) => {
  res.json(await deriveClassificationOverlay('risk_zones', req.body ?? {}));
});

router.post('/overlays/flow-direction', async (req, res) => {
  res.json(await deriveClassificationOverlay('flow_direction', req.body ?? {}));
});

export default router;
