import { Router } from 'express';
import { attachDpalJwtUser } from '../middleware/dpalJwt';
import { requireDpalAdmin } from '../middleware/requireDpalAdmin';
import {
  getCarbDataSmokeHandler,
  getCarbDataStatusHandler,
  importCarbData,
  searchCarbData,
  syncOfficialCarbData,
} from '../controllers/carbAuditController';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, module: 'carb-data' });
});

// Public search endpoint so CARB lookup works before authentication is finalized.
router.get('/status', getCarbDataStatusHandler);
router.get('/smoke', getCarbDataSmokeHandler);
router.get('/search', searchCarbData);
// Import remains protected for admin users only.
router.post('/import', attachDpalJwtUser, requireDpalAdmin, importCarbData);
router.post('/sync-official', attachDpalJwtUser, requireDpalAdmin, syncOfficialCarbData);

export default router;
