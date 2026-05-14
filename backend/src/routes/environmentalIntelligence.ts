import { Router, type Request, type Response } from 'express';
import { getAllBusinessUseCases } from '../environmental-intelligence/sources/businessUseCasesBackend';
import { buildSourcesStatusPayload } from '../environmental-intelligence/sources/providerStatus';

const router = Router();

router.get('/sources/status', (_req: Request, res: Response) => {
  res.json(buildSourcesStatusPayload());
});

router.get('/sources/use-cases', (_req: Request, res: Response) => {
  res.json({ ok: true as const, useCases: getAllBusinessUseCases() });
});

export default router;
