import { Router } from 'express';
import { attachDpalJwtUser, requireDpalAuth } from '../middleware/dpalJwt';
import {
  createCarbAudit,
  deleteCarbAudit,
  exportCarbAudit,
  getCarbAudit,
  linkCarbAudit,
  listCarbAudits,
  recalculateCarbAudit,
  updateCarbAudit,
} from '../controllers/carbAuditController';

const router = Router();
router.use(attachDpalJwtUser, requireDpalAuth);

router.post('/create', createCarbAudit);
router.get('/list', listCarbAudits);
router.post('/export', exportCarbAudit);
router.get('/:id', getCarbAudit);
router.put('/:id', updateCarbAudit);
router.delete('/:id', deleteCarbAudit);
router.post('/:id/export', exportCarbAudit);
router.post('/:id/recalculate', recalculateCarbAudit);
router.post('/:id/link', linkCarbAudit);

export default router;
