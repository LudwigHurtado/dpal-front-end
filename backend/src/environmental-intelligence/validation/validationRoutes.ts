import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  assignValidationRequestService,
  cancelValidationRequestService,
  completeValidationRequestService,
  createValidationRequestService,
  patchValidationRequestService,
  startValidationRequestService,
} from './validationService';
import { getValidationRequestStore } from './validationStore';
import type { ValidationRequestListFilters } from './validationTypes';

const router = Router();

const requestTypeSchema = z.enum([
  'human_review',
  'field_inspection',
  'drone_survey',
  'lab_sample',
  'sensor_check',
  'community_followup',
  'document_review',
  'expert_review',
]);

const createBodySchema = z.object({
  packetId: z.string().optional(),
  profileId: z.string().optional(),
  useCaseId: z.string().optional(),
  requestType: z.union([requestTypeSchema, z.string()]),
  priority: z.string().optional(),
  requestedBy: z.string().optional(),
  evidenceRefs: z.unknown().optional(),
});

const patchBodySchema = z
  .object({
    priority: z.string().optional(),
    requestedBy: z.string().optional(),
    useCaseId: z.string().optional(),
    reviewNotes: z.string().optional(),
    limitations: z.array(z.string()).optional(),
    evidenceRefs: z.unknown().optional(),
  })
  .strict();

const assignBodySchema = z.object({
  assignedTo: z.string().optional(),
  reviewerName: z.string().optional(),
  reviewerRole: z.string().optional(),
});

const completeBodySchema = z.object({
  validationResult: z.enum(['validated', 'rejected', 'inconclusive', 'superseded']),
  reviewNotes: z.string().optional(),
});

const cancelBodySchema = z.object({ reviewNotes: z.string().optional() }).strict();

function paramId(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  return v?.[0];
}

router.post('/requests', async (req: Request, res: Response) => {
  const parsed = createBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const hasTarget = Boolean(parsed.data.packetId?.trim() || parsed.data.profileId?.trim());
  if (!hasTarget) {
    res.status(400).json({ ok: false as const, error: 'Provide packetId and/or profileId.' });
    return;
  }
  const out = await createValidationRequestService(parsed.data);
  if (!out.ok) {
    res.status(out.status ?? 400).json({ ok: false as const, error: out.error });
    return;
  }
  res.status(201).json({ ok: true as const, request: out.request });
});

router.get('/requests', async (req: Request, res: Response) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
  const filters: ValidationRequestListFilters = {};
  if (typeof req.query.status === 'string' && req.query.status.trim()) filters.status = req.query.status.trim();
  if (typeof req.query.targetType === 'string' && req.query.targetType.trim())
    filters.targetType = req.query.targetType.trim();
  if (typeof req.query.packetId === 'string' && req.query.packetId.trim()) filters.packetId = req.query.packetId.trim();
  if (typeof req.query.profileId === 'string' && req.query.profileId.trim())
    filters.profileId = req.query.profileId.trim();
  const requests = await getValidationRequestStore().list(limit, filters);
  res.json({ ok: true as const, requests });
});

router.get('/requests/:validationId', async (req: Request, res: Response) => {
  const validationId = paramId(req.params.validationId);
  if (!validationId?.trim()) {
    res.status(400).json({ ok: false as const, error: 'Missing validationId' });
    return;
  }
  const r = await getValidationRequestStore().get(validationId.trim());
  if (!r) {
    res.status(404).json({ ok: false as const, error: 'Not found' });
    return;
  }
  res.json({ ok: true as const, request: r });
});

router.patch('/requests/:validationId', async (req: Request, res: Response) => {
  const validationId = paramId(req.params.validationId);
  if (!validationId?.trim()) {
    res.status(400).json({ ok: false as const, error: 'Missing validationId' });
    return;
  }
  const parsed = patchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const out = await patchValidationRequestService(validationId.trim(), parsed.data);
  if (!out.ok) {
    res.status(out.status ?? 400).json({ ok: false as const, error: out.error });
    return;
  }
  res.json({ ok: true as const, request: out.request });
});

router.post('/requests/:validationId/assign', async (req: Request, res: Response) => {
  const validationId = paramId(req.params.validationId);
  if (!validationId?.trim()) {
    res.status(400).json({ ok: false as const, error: 'Missing validationId' });
    return;
  }
  const parsed = assignBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const out = await assignValidationRequestService(validationId.trim(), parsed.data);
  if (!out.ok) {
    res.status(out.status ?? 400).json({ ok: false as const, error: out.error });
    return;
  }
  res.json({ ok: true as const, request: out.request });
});

router.post('/requests/:validationId/start', async (req: Request, res: Response) => {
  const validationId = paramId(req.params.validationId);
  if (!validationId?.trim()) {
    res.status(400).json({ ok: false as const, error: 'Missing validationId' });
    return;
  }
  const out = await startValidationRequestService(validationId.trim());
  if (!out.ok) {
    res.status(out.status ?? 400).json({ ok: false as const, error: out.error });
    return;
  }
  res.json({ ok: true as const, request: out.request });
});

router.post('/requests/:validationId/complete', async (req: Request, res: Response) => {
  const validationId = paramId(req.params.validationId);
  if (!validationId?.trim()) {
    res.status(400).json({ ok: false as const, error: 'Missing validationId' });
    return;
  }
  const parsed = completeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const out = await completeValidationRequestService(validationId.trim(), parsed.data);
  if (!out.ok) {
    res.status(out.status ?? 400).json({ ok: false as const, error: out.error });
    return;
  }
  res.json({ ok: true as const, request: out.request });
});

router.post('/requests/:validationId/cancel', async (req: Request, res: Response) => {
  const validationId = paramId(req.params.validationId);
  if (!validationId?.trim()) {
    res.status(400).json({ ok: false as const, error: 'Missing validationId' });
    return;
  }
  const parsed = cancelBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const out = await cancelValidationRequestService(validationId.trim(), parsed.data);
  if (!out.ok) {
    res.status(out.status ?? 400).json({ ok: false as const, error: out.error });
    return;
  }
  res.json({ ok: true as const, request: out.request });
});

export default router;
