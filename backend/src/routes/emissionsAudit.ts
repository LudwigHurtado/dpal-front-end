import { Router } from 'express';
import { attachDpalJwtUser, requireDpalAuth } from '../middleware/dpalJwt';
import {
  createEmissionsAudit,
  deleteEmissionsAudit,
  exportEmissionsAudit,
  exportEmissionsAuditByParam,
  getEmissionsAudit,
  linkEmissionsAudit,
  listEmissionsAudits,
  recalculateEmissionsAudit,
  updateEmissionsAudit,
} from '../controllers/emissionsAuditController';

const router = Router();

router.use(attachDpalJwtUser, requireDpalAuth);

router.post('/create', createEmissionsAudit);
router.get('/list', listEmissionsAudits);
router.post('/export', exportEmissionsAudit);
router.get('/:id', getEmissionsAudit);
router.put('/:id', updateEmissionsAudit);
router.delete('/:id', deleteEmissionsAudit);
router.post('/:id/export', exportEmissionsAuditByParam);
router.post('/:id/link', linkEmissionsAudit);
router.post('/:id/recalculate', recalculateEmissionsAudit);

// Compatibility aliases from earlier DPAL wording.
router.post('/:id/link-report', linkEmissionsAudit);
router.post('/:id/link-mission', linkEmissionsAudit);
router.post('/:id/link-project', linkEmissionsAudit);

export default router;
