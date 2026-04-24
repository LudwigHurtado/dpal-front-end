import { Router } from 'express';
import { attachDpalJwtUser } from '../middleware/dpalJwt';
import { requireDpalAdmin } from '../middleware/requireDpalAdmin';
import { getRcraDataHealth, importRcraData, searchRcraData } from '../controllers/hazardousWasteAuditController';

const router = Router();

router.get('/health', getRcraDataHealth);
router.get('/search', searchRcraData);
router.post('/import', attachDpalJwtUser, requireDpalAdmin, importRcraData);

export default router;
