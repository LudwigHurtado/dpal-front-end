import { Router, type Request, type Response } from 'express';
import { attachDpalJwtUser } from '../middleware/dpalJwt';
import { listProjectNotifications } from '../services/mrvAgentService';

const router = Router();

router.use(attachDpalJwtUser);

/** GET /api/mrv/projects/:projectId/notifications */
router.get('/:projectId/notifications', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const limit = parseInt(String(req.query.limit ?? '30'), 10);
    const notifications = await listProjectNotifications(projectId, limit);
    res.json({ ok: true, notifications });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
