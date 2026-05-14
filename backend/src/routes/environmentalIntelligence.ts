import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getAllBusinessUseCases } from '../environmental-intelligence/sources/businessUseCasesBackend';
import { buildSourcesStatusPayload } from '../environmental-intelligence/sources/providerStatus';
import { executeEnvironmentalSourceRun } from '../environmental-intelligence/sources/sourceRunService';

const router = Router();

const sourceRunBodySchema = z.object({
  sourceIds: z.array(z.string()).optional(),
  useCaseId: z.string().optional(),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
  radiusKm: z.number().finite().optional(),
  aoiGeoJson: z.unknown().optional(),
  baselineDate: z.string().optional(),
  currentDate: z.string().optional(),
  companyName: z.string().optional(),
  facilityId: z.string().optional(),
  projectId: z.string().optional(),
  roomId: z.string().optional(),
  reportId: z.string().optional(),
  evidenceRefs: z.array(z.unknown()).optional(),
});

router.get('/sources/status', (_req: Request, res: Response) => {
  res.json(buildSourcesStatusPayload());
});

router.get('/sources/use-cases', (_req: Request, res: Response) => {
  res.json({ ok: true as const, useCases: getAllBusinessUseCases() });
});

router.post('/sources/run', async (req: Request, res: Response) => {
  const parsed = sourceRunBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid request body', issues: parsed.error.flatten() });
    return;
  }
  const { useCaseId, sourceIds, ...rest } = parsed.data;
  const hasUseCase = Boolean(useCaseId?.trim());
  const hasSources = Boolean(sourceIds?.length);
  if (!hasUseCase && !hasSources) {
    res.status(400).json({
      ok: false as const,
      error: 'Provide a non-empty sourceIds array and/or a useCaseId to execute providers.',
    });
    return;
  }
  try {
    const payload = await executeEnvironmentalSourceRun({
      ...rest,
      sourceIds,
      useCaseId: useCaseId?.trim(),
    });
    res.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Provider run failed';
    res.status(500).json({ ok: false as const, error: msg });
  }
});

export default router;
