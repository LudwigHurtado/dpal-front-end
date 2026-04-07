import { Router, Request, Response } from 'express';
import { ResolutionEventType, ResolutionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { broadcastResolutionEvent, registerResolutionStreamClient, removeResolutionStreamClient } from '../lib/resolutionRealtime';
import { canTransitionResolutionStatus } from '../lib/resolutionState';

const router = Router();

const statusByEvent: Partial<Record<string, ResolutionStatus>> = {
  'case.filed': ResolutionStatus.filed,
  'case.verified': ResolutionStatus.verified,
};

const parseSlaHours = (value: unknown, fallback = 48): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(24 * 30, Math.floor(n));
};

async function appendEvent(caseRefId: string, eventType: ResolutionEventType, actor: string, note?: string, payload?: unknown) {
  const created = await prisma.resolutionEvent.create({
    data: { caseRefId, eventType, actor, note, payload: payload ?? undefined },
  });
  broadcastResolutionEvent({
    type: 'case.event',
    caseRefId,
    eventType,
    createdAt: created.createdAt.toISOString(),
  });
}

async function updateCaseStatus(caseId: string, nextStatus: ResolutionStatus, actor: string, eventType: ResolutionEventType, note?: string) {
  const row = await prisma.resolutionCase.findUnique({ where: { caseId } });
  if (!row) return { ok: false as const, status: 404, error: 'Case not found' };
  if (!canTransitionResolutionStatus(row.status, nextStatus)) {
    return { ok: false as const, status: 409, error: `Invalid transition ${row.status} -> ${nextStatus}` };
  }
  const updated = await prisma.resolutionCase.update({
    where: { id: row.id },
    data: { status: nextStatus, updatedAt: new Date() },
  });
  await appendEvent(updated.id, eventType, actor, note, { from: row.status, to: nextStatus });
  return { ok: true as const, row: updated };
}

router.get('/stream', (_req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = registerResolutionStreamClient(res);
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);
  const timer = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', at: new Date().toISOString() })}\n\n`);
  }, 20000);

  res.on('close', () => {
    clearInterval(timer);
    removeResolutionStreamClient(clientId);
  });
});

router.get('/cases', async (req: Request, res: Response): Promise<void> => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const rows = await prisma.resolutionCase.findMany({
    where: status ? { status: status as ResolutionStatus } : undefined,
    orderBy: { updatedAt: 'desc' },
    take: Math.min(parseInt(String(req.query.limit ?? '200'), 10), 500),
  });
  res.json({ ok: true, cases: rows });
});

router.get('/cases/:caseId', async (req: Request, res: Response): Promise<void> => {
  const caseId = String(req.params.caseId);
  const row = await prisma.resolutionCase.findUnique({
    where: { caseId },
    include: {
      routes: true,
      artifacts: { orderBy: { createdAt: 'desc' } },
      events: { orderBy: { createdAt: 'desc' }, take: 300 },
    },
  });
  if (!row) {
    res.status(404).json({ ok: false, error: 'Case not found' });
    return;
  }
  res.json({ ok: true, case: row });
});

router.post('/events', async (req: Request, res: Response): Promise<void> => {
  const eventType = String(req.body?.eventType ?? '').trim();
  const caseId = String(req.body?.caseId ?? '').trim();
  if (!eventType || !caseId) {
    res.status(400).json({ ok: false, error: 'eventType and caseId are required' });
    return;
  }

  const mappedStatus = statusByEvent[eventType] ?? ResolutionStatus.verified;
  const payload = req.body?.payload ?? {};
  const title = String(req.body?.title ?? payload?.title ?? 'Resolution Case');
  const category = String(req.body?.category ?? payload?.category ?? 'Other');
  const location = String(req.body?.location ?? payload?.location ?? 'Unknown');
  const severity = String(req.body?.severity ?? payload?.severity ?? 'Medium');

  const row = await prisma.resolutionCase.upsert({
    where: { caseId },
    create: {
      caseId,
      reportId: req.body?.reportId ? String(req.body.reportId) : null,
      validatorNodeId: req.body?.validatorNodeId ? String(req.body.validatorNodeId) : null,
      title,
      category,
      location,
      severity,
      status: mappedStatus,
      entity: req.body?.entity ? String(req.body.entity) : null,
      reporter: req.body?.reporter ? String(req.body.reporter) : null,
      verifier: req.body?.verifier ? String(req.body.verifier) : null,
      resolutionScore: Number(req.body?.resolutionScore ?? 0),
      responseSlaHours: parseSlaHours(req.body?.responseSlaHours),
      summary: req.body?.summary ? String(req.body.summary) : null,
      publicImpact: req.body?.publicImpact ? String(req.body.publicImpact) : null,
      nextAction: req.body?.nextAction ? String(req.body.nextAction) : null,
      walletAddress: req.body?.walletAddress ? String(req.body.walletAddress) : null,
      metadata: payload ?? null,
    },
    update: {
      reportId: req.body?.reportId ? String(req.body.reportId) : undefined,
      validatorNodeId: req.body?.validatorNodeId ? String(req.body.validatorNodeId) : undefined,
      title,
      category,
      location,
      severity,
      status: mappedStatus,
      updatedAt: new Date(),
      metadata: payload ?? undefined,
    },
  });

  await appendEvent(
    row.id,
    eventType === 'case.filed' ? ResolutionEventType.case_filed : ResolutionEventType.case_verified,
    req.body?.actor ? String(req.body.actor) : 'validator-node',
    req.body?.note ? String(req.body.note) : undefined,
    payload
  );

  res.status(201).json({ ok: true, case: row });
});

router.post('/cases', async (req: Request, res: Response): Promise<void> => {
  const caseId = String(req.body?.caseId ?? '').trim();
  if (!caseId) {
    res.status(400).json({ ok: false, error: 'caseId is required' });
    return;
  }
  const row = await prisma.resolutionCase.upsert({
    where: { caseId },
    create: {
      caseId,
      title: String(req.body?.title ?? 'Resolution Case'),
      category: String(req.body?.category ?? 'Other'),
      location: String(req.body?.location ?? 'Unknown'),
      severity: String(req.body?.severity ?? 'Medium'),
      status: ResolutionStatus.verified,
      entity: req.body?.entity ? String(req.body.entity) : null,
      reporter: req.body?.reporter ? String(req.body.reporter) : null,
      verifier: req.body?.verifier ? String(req.body.verifier) : null,
      resolutionScore: Number(req.body?.resolutionScore ?? 0),
      responseSlaHours: parseSlaHours(req.body?.responseSlaHours),
      summary: req.body?.summary ? String(req.body.summary) : null,
      publicImpact: req.body?.publicImpact ? String(req.body.publicImpact) : null,
      nextAction: req.body?.nextAction ? String(req.body.nextAction) : null,
      walletAddress: req.body?.walletAddress ? String(req.body.walletAddress) : null,
      metadata: req.body?.metadata ?? null,
    },
    update: {
      title: req.body?.title ? String(req.body.title) : undefined,
      category: req.body?.category ? String(req.body.category) : undefined,
      location: req.body?.location ? String(req.body.location) : undefined,
      severity: req.body?.severity ? String(req.body.severity) : undefined,
      entity: req.body?.entity ? String(req.body.entity) : undefined,
      reporter: req.body?.reporter ? String(req.body.reporter) : undefined,
      verifier: req.body?.verifier ? String(req.body.verifier) : undefined,
      resolutionScore: req.body?.resolutionScore != null ? Number(req.body.resolutionScore) : undefined,
      responseSlaHours: req.body?.responseSlaHours != null ? parseSlaHours(req.body.responseSlaHours) : undefined,
      summary: req.body?.summary ? String(req.body.summary) : undefined,
      publicImpact: req.body?.publicImpact ? String(req.body.publicImpact) : undefined,
      nextAction: req.body?.nextAction ? String(req.body.nextAction) : undefined,
      walletAddress: req.body?.walletAddress ? String(req.body.walletAddress) : undefined,
      metadata: req.body?.metadata ?? undefined,
      updatedAt: new Date(),
    },
  });
  await appendEvent(row.id, ResolutionEventType.case_verified, 'resolution-layer', 'Case upserted from UI', { caseId });
  res.status(201).json({ ok: true, case: row });
});

router.post('/escalate', async (req: Request, res: Response): Promise<void> => {
  const caseId = String(req.body?.caseId ?? '').trim();
  if (!caseId) {
    res.status(400).json({ ok: false, error: 'caseId is required' });
    return;
  }
  const updated = await updateCaseStatus(caseId, ResolutionStatus.escalated, 'resolution-layer', ResolutionEventType.case_escalated);
  if (!updated.ok) {
    res.status(updated.status).json(updated);
    return;
  }

  const routes = Array.isArray(req.body?.routes)
    ? req.body.routes
    : [
        { destination: 'Municipal Housing Office', channel: 'email', target: null },
        { destination: 'Community Legal Aid Network', channel: 'api', target: null },
        { destination: 'Family Safety Volunteer Team', channel: 'queue', target: null },
      ];

  for (const route of routes) {
    await prisma.resolutionRoute.create({
      data: {
        caseRefId: updated.row.id,
        destination: String(route.destination ?? 'Unknown destination'),
        channel: String(route.channel ?? 'queue'),
        target: route.target ? String(route.target) : null,
      },
    });
  }

  await appendEvent(updated.row.id, ResolutionEventType.route_dispatch_attempted, 'resolution-layer', 'Escalation routes queued', {
    routeCount: routes.length,
  });
  res.json({ ok: true, case: updated.row, queuedRoutes: routes.length });
});

router.post('/cases/:caseId/respond', async (req: Request, res: Response): Promise<void> => {
  const result = await updateCaseStatus(
    String(req.params.caseId),
    ResolutionStatus.responded,
    req.body?.actor ? String(req.body.actor) : 'agency',
    ResolutionEventType.agency_responded,
    req.body?.note ? String(req.body.note) : 'Agency response received'
  );
  if (!result.ok) {
    res.status(result.status).json(result);
    return;
  }
  res.json({ ok: true, case: result.row });
});

router.post('/cases/:caseId/proof', async (req: Request, res: Response): Promise<void> => {
  const caseId = String(req.params.caseId);
  const row = await prisma.resolutionCase.findUnique({ where: { caseId } });
  if (!row) {
    res.status(404).json({ ok: false, error: 'Case not found' });
    return;
  }
  const artifact = await prisma.resolutionArtifact.create({
    data: {
      caseRefId: row.id,
      kind: String(req.body?.kind ?? 'proof'),
      title: String(req.body?.title ?? 'Proof of correction'),
      url: req.body?.url ? String(req.body.url) : null,
      sha256: req.body?.sha256 ? String(req.body.sha256) : null,
      uploadedBy: req.body?.uploadedBy ? String(req.body.uploadedBy) : 'system',
      metadata: req.body?.metadata ?? null,
    },
  });
  await appendEvent(row.id, ResolutionEventType.correction_submitted, 'resolution-layer', 'Proof uploaded', { artifactId: artifact.id });
  res.status(201).json({ ok: true, artifact });
});

router.post('/cases/:caseId/correct', async (req: Request, res: Response): Promise<void> => {
  const result = await updateCaseStatus(
    String(req.params.caseId),
    ResolutionStatus.corrected,
    req.body?.actor ? String(req.body.actor) : 'resolution-reviewer',
    ResolutionEventType.correction_submitted,
    req.body?.note ? String(req.body.note) : 'Correction accepted'
  );
  if (!result.ok) {
    res.status(result.status).json(result);
    return;
  }
  res.json({ ok: true, case: result.row });
});

router.post('/cases/:caseId/resolve', async (req: Request, res: Response): Promise<void> => {
  const result = await updateCaseStatus(
    String(req.params.caseId),
    ResolutionStatus.resolved,
    req.body?.actor ? String(req.body.actor) : 'resolution-reviewer',
    ResolutionEventType.case_resolved,
    req.body?.note ? String(req.body.note) : 'Case resolved'
  );
  if (!result.ok) {
    res.status(result.status).json(result);
    return;
  }
  res.json({ ok: true, case: result.row });
});

router.get('/cases/:caseId/audit', async (req: Request, res: Response): Promise<void> => {
  const caseId = String(req.params.caseId);
  const row = await prisma.resolutionCase.findUnique({ where: { caseId }, select: { id: true } });
  if (!row) {
    res.status(404).json({ ok: false, error: 'Case not found' });
    return;
  }
  const events = await prisma.resolutionEvent.findMany({
    where: { caseRefId: row.id },
    orderBy: { createdAt: 'desc' },
    take: 400,
  });
  res.json({ ok: true, events });
});

export default router;
