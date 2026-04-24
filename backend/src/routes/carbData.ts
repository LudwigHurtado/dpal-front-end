import { Router } from 'express';
import { attachDpalJwtUser, requireDpalAuth } from '../middleware/dpalJwt';
import { importCarbData, searchCarbData } from '../controllers/carbAuditController';

const router = Router();
router.use(attachDpalJwtUser, requireDpalAuth);
router.get('/search', searchCarbData);
router.post('/import', importCarbData);

export default router;
