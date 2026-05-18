import { Router, type Request, type Response } from 'express';
import { attachDpalJwtUser } from '../middleware/dpalJwt';
import {
  ensureMrvAgentSchedule,
  getLatestAgentReport,
  listAgentRuns,
  runMrvSuperAgentMission,
  syncMrvProjectConfig,
} from '../services/mrvAgentService';
import { prisma } from '../lib/prisma';

const router = Router({ mergeParams: true });

router.use(attachDpalJwtUser);

/** GET /api/mrv/projects/:projectId/agent/schedule */
router.get('/schedule', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const schedule = await ensureMrvAgentSchedule(projectId);
    res.json({ ok: true, schedule });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

/** PUT /api/mrv/projects/:projectId/agent/schedule */
router.put('/schedule', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const body = req.body ?? {};
    const schedule = await ensureMrvAgentSchedule(projectId);
    const updated = await prisma.mrvAgentSchedule.update({
      where: { id: schedule.id },
      data: {
        name: body.name != null ? String(body.name) : undefined,
        cronExpression: body.cronExpression != null ? String(body.cronExpression) : undefined,
        timezone: body.timezone != null ? String(body.timezone) : undefined,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        nextRunHint: body.nextRunHint != null ? String(body.nextRunHint) : undefined,
      },
    });
    res.json({ ok: true, schedule: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

/** PUT /api/mrv/projects/:projectId/agent/project-config — sync Field OS snapshot for cron */
router.put('/project-config', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const configJson = req.body?.configJson ?? req.body;
    if (!configJson || typeof configJson !== 'object') {
      return res.status(400).json({ ok: false, error: 'configJson_required' });
    }
    const ownerUserId = req.dpalUser?.id;
    const row = await syncMrvProjectConfig(
      projectId,
      { ...configJson, projectId, ownerUserId },
      ownerUserId,
    );
    res.json({ ok: true, projectId: row.projectId, updatedAt: row.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

/** POST /api/mrv/projects/:projectId/agent/run-now */
router.post('/run-now', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    if (req.body?.configJson && typeof req.body.configJson === 'object') {
      await syncMrvProjectConfig(projectId, req.body.configJson, req.dpalUser?.id);
    }
    const result = await runMrvSuperAgentMission({
      projectId,
      missionType: 'MANUAL_RUN',
      createdBy: req.dpalUser?.id ? `user:${req.dpalUser.id}` : 'DPAL_SUPER_AGENT',
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

/** GET /api/mrv/projects/:projectId/agent/latest-report */
router.get('/latest-report', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const payload = await getLatestAgentReport(projectId);
    res.json({ ok: true, ...payload });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

/** GET /api/mrv/projects/:projectId/agent/runs */
router.get('/runs', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const limit = parseInt(String(req.query.limit ?? '20'), 10);
    const runs = await listAgentRuns(projectId, limit);
    res.json({ ok: true, runs });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
