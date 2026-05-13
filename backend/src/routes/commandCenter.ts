import { Router, type Request, type Response } from 'express';
import {
  createQueuedRun,
  getRun,
  parseCreateRunBody,
  requestCancel,
  scheduleRunExecution,
} from '../services/commandCenter/commandCenterRunEngine';
import type { CommandCenterRunDocument } from '../services/commandCenter/commandCenterRunTypes';

function toPublicJson(doc: CommandCenterRunDocument) {
  return {
    ok: true as const,
    runId: doc.runId,
    status: doc.status,
    runMode: doc.runMode,
    modules: doc.modules,
    context: doc.context,
    currentStep: doc.currentStep,
    results: doc.results,
    warnings: doc.warnings,
    safetyLabels: doc.safetyLabels,
    createdAtIso: doc.createdAtIso,
    updatedAtIso: doc.updatedAtIso,
  };
}

const router = Router();

router.post('/runs', (req: Request, res: Response) => {
  const parsed = parseCreateRunBody(req.body ?? {});
  if (!parsed.ok) {
    return res.status(400).json({
      ok: false,
      error: parsed.error,
      ...(parsed.details ? { details: parsed.details } : {}),
    });
  }
  const doc = createQueuedRun(parsed);
  scheduleRunExecution(doc.runId);
  return res.status(201).json({ ok: true, runId: doc.runId, status: doc.status });
});

router.get('/runs/:runId', (req: Request, res: Response) => {
  const doc = getRun(String(req.params.runId ?? ''));
  if (!doc) {
    return res.status(404).json({ ok: false, error: 'Run not found' });
  }
  return res.json(toPublicJson(doc));
});

router.post('/runs/:runId/cancel', (req: Request, res: Response) => {
  const doc = requestCancel(String(req.params.runId ?? ''));
  if (!doc) {
    return res.status(404).json({ ok: false, error: 'Run not found' });
  }
  return res.json(toPublicJson(doc));
});

export default router;
