import { Router } from 'express';
import { attachDpalJwtUser, requireDpalAuth } from '../middleware/dpalJwt';
import {
  createHazardousWasteAudit,
  deleteHazardousWasteAudit,
  exportHazardousWasteAudit,
  getHazardousWasteAudit,
  linkHazardousWasteAudit,
  listHazardousWasteAudits,
  recalculateHazardousWasteAudit,
  updateHazardousWasteAudit,
} from '../controllers/hazardousWasteAuditController';

const router = Router();
router.use(attachDpalJwtUser, requireDpalAuth);

router.post('/create', createHazardousWasteAudit);
router.get('/list', listHazardousWasteAudits);
router.post('/export', exportHazardousWasteAudit);
router.get('/:id', getHazardousWasteAudit);
router.put('/:id', updateHazardousWasteAudit);
router.delete('/:id', deleteHazardousWasteAudit);
router.post('/:id/export', exportHazardousWasteAudit);
router.post('/:id/recalculate', recalculateHazardousWasteAudit);
router.post('/:id/link', linkHazardousWasteAudit);

export default router;
