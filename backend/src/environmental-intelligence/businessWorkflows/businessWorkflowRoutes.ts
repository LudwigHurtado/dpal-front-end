import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { runBusinessWorkflow } from './businessWorkflowRunner';
import { getBusinessWorkflowTemplates } from './businessWorkflowRegistry';
import { getBusinessWorkflowStore } from './businessWorkflowStore';

const router = Router();

const runBodySchema = z.object({
  workflowId: z.string().min(1),
  companyName: z.string().optional(),
  facilityName: z.string().optional(),
  facilityId: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
  radiusKm: z.number().finite().optional(),
  claimText: z.string().optional(),
  claimSourceUrl: z.string().optional(),
  useCaseId: z.string().optional(),
  profileType: z.string().optional(),
  runEvidenceNow: z.boolean().optional(),
  createValidationRequest: z.boolean().optional(),
  validationRequestType: z.string().optional(),
  priority: z.string().optional(),
  evidenceRefs: z.unknown().optional(),
});

const patchBodySchema = z
  .object({
    companyName: z.string().optional(),
    facilityName: z.string().optional(),
    claimText: z.string().optional(),
    operatorNotes: z.string().optional(),
  })
  .strict();

function paramId(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  return v?.[0];
}

router.get('/', (_req: Request, res: Response) => {
  const templates = getBusinessWorkflowTemplates();
  res.json({
    ok: true as const,
    module: 'environmental_business_workflows',
    templateCount: templates.length,
    endpoints: {
      templates: 'GET /api/environmental-intelligence/business-workflows/templates',
      run: 'POST /api/environmental-intelligence/business-workflows/run',
      listRuns: 'GET /api/environmental-intelligence/business-workflows/runs',
      getRun: 'GET /api/environmental-intelligence/business-workflows/runs/:workflowRunId',
      patchRun: 'PATCH /api/environmental-intelligence/business-workflows/runs/:workflowRunId',
      cancelRun: 'POST /api/environmental-intelligence/business-workflows/runs/:workflowRunId/cancel',
    },
  });
});

router.get('/templates', (_req: Request, res: Response) => {
  res.json({ ok: true as const, templates: getBusinessWorkflowTemplates() });
});

router.post('/run', async (req: Request, res: Response): Promise<void> => {
  const parsed = runBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const out = await runBusinessWorkflow(parsed.data);
  if (!out.ok) {
    res.status(400).json({ ok: false as const, error: out.error });
    return;
  }
  res.status(201).json({
    ok: true as const,
    workflowRunId: out.workflowRun.workflowRunId,
    profileId: out.profile.profileId,
    packetId: out.packet?.packetId,
    validationId: out.validationRequest?.validationId,
    workflowRun: out.workflowRun,
    profile: out.profile,
    packet: out.packet,
    validationRequest: out.validationRequest,
    risk: out.risk,
    safetyLabels: out.safetyLabels,
    limitations: out.limitations,
  });
});

router.get('/runs', async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
  const workflowId = typeof req.query.workflowId === 'string' ? req.query.workflowId : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const runs = await getBusinessWorkflowStore().list(limit, { workflowId, status });
  res.json({ ok: true as const, runs });
});

router.get('/runs/:workflowRunId', async (req: Request, res: Response): Promise<void> => {
  const workflowRunId = paramId(req.params.workflowRunId);
  if (!workflowRunId?.trim()) {
    res.status(400).json({ ok: false as const, error: 'workflowRunId required' });
    return;
  }
  const run = await getBusinessWorkflowStore().get(workflowRunId.trim());
  if (!run) {
    res.status(404).json({ ok: false as const, error: 'Workflow run not found' });
    return;
  }
  res.json({ ok: true as const, workflowRun: run });
});

router.patch('/runs/:workflowRunId', async (req: Request, res: Response): Promise<void> => {
  const workflowRunId = paramId(req.params.workflowRunId);
  if (!workflowRunId?.trim()) {
    res.status(400).json({ ok: false as const, error: 'workflowRunId required' });
    return;
  }
  const parsed = patchBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const updated = await getBusinessWorkflowStore().update(workflowRunId.trim(), parsed.data);
  if (!updated) {
    res.status(404).json({ ok: false as const, error: 'Workflow run not found' });
    return;
  }
  res.json({ ok: true as const, workflowRun: updated });
});

router.post('/runs/:workflowRunId/cancel', async (req: Request, res: Response): Promise<void> => {
  const workflowRunId = paramId(req.params.workflowRunId);
  if (!workflowRunId?.trim()) {
    res.status(400).json({ ok: false as const, error: 'workflowRunId required' });
    return;
  }
  const store = getBusinessWorkflowStore();
  const cur = await store.get(workflowRunId.trim());
  if (!cur) {
    res.status(404).json({ ok: false as const, error: 'Workflow run not found' });
    return;
  }
  if (cur.status === 'cancelled') {
    res.json({ ok: true as const, workflowRun: cur });
    return;
  }
  const now = new Date().toISOString();
  const next = {
    ...cur,
    status: 'cancelled' as const,
    completedAt: now,
    updatedAt: now,
  };
  const saved = await store.save(next);
  res.json({ ok: true as const, workflowRun: saved });
});

export default router;
