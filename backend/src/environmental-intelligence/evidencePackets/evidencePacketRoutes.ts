import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { buildEvidencePacketFromSourceRun } from './evidencePacketBuilder';
import { getEvidencePacketStore } from './evidencePacketStore';
import { executeEnvironmentalSourceRun, type EnvironmentalSourceRunResponse } from '../sources/sourceRunService';

const router = Router();

const safetyLabelsSchema = z.object({
  pending_verification: z.boolean(),
  human_verified: z.boolean(),
  blockchain_anchored: z.boolean(),
});

const sourceRunResponseSchema = z.object({
  ok: z.literal(true),
  runId: z.string(),
  requestedSources: z.array(z.string()),
  results: z.array(z.unknown()),
  normalizedEvidenceLanes: z.array(z.unknown()),
  confidence: z.object({
    overall: z.string(),
    rationale: z.array(z.string()),
    pendingVerification: z.boolean(),
  }),
  safetyLabels: safetyLabelsSchema,
  limitations: z.array(z.string()),
  skippedSources: z.array(z.object({ sourceId: z.string(), reason: z.string() })).optional(),
});

const createPacketBodySchema = z
  .object({
    sourceRunResponse: sourceRunResponseSchema.optional(),
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
    title: z.string().optional(),
    locationLabel: z.string().optional(),
    situationRoomId: z.string().optional(),
    qrPayload: z.unknown().optional(),
  })
  .superRefine((v, ctx) => {
    const hasSr = v.sourceRunResponse != null;
    const hasExec = Boolean(v.useCaseId?.trim()) || Boolean(v.sourceIds?.length);
    if (!hasSr && !hasExec) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide sourceRunResponse from a completed run, or sourceIds / useCaseId so the server can execute providers first.',
        path: [],
      });
    }
  });

const situationLinkBodySchema = z.object({
  reportId: z.string().optional(),
  projectId: z.string().optional(),
  sourceType: z.string().optional(),
  title: z.string().optional(),
});

function serviceBaseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3001';
  return `${proto}://${host}`;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createPacketBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  let sourceRun: EnvironmentalSourceRunResponse;
  if (body.sourceRunResponse) {
    sourceRun = body.sourceRunResponse as EnvironmentalSourceRunResponse;
  } else {
    try {
      sourceRun = await executeEnvironmentalSourceRun({
        sourceIds: body.sourceIds,
        useCaseId: body.useCaseId?.trim(),
        lat: body.lat,
        lng: body.lng,
        radiusKm: body.radiusKm,
        aoiGeoJson: body.aoiGeoJson,
        baselineDate: body.baselineDate,
        currentDate: body.currentDate,
        companyName: body.companyName,
        facilityId: body.facilityId,
        projectId: body.projectId,
        roomId: body.roomId,
        reportId: body.reportId,
        evidenceRefs: body.evidenceRefs,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Source run failed';
      res.status(500).json({ ok: false as const, error: msg });
      return;
    }
  }

  const packet = buildEvidencePacketFromSourceRun({
    sourceRunResponse: sourceRun,
    useCaseId: body.useCaseId?.trim() || undefined,
    title: body.title,
    locationLabel: body.locationLabel,
    lat: body.lat,
    lng: body.lng,
    radiusKm: body.radiusKm,
    aoiGeoJson: body.aoiGeoJson,
    baselineDate: body.baselineDate,
    currentDate: body.currentDate,
    situationRoomId: body.situationRoomId,
    projectId: body.projectId,
    qrPayload: body.qrPayload,
  });

  const store = getEvidencePacketStore();
  await store.save(packet);
  res.status(201).json({ ok: true as const, packet });
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
  const store = getEvidencePacketStore();
  const packets = await store.list(limit);
  res.json({ ok: true as const, packets });
});

router.get('/:packetId', async (req: Request, res: Response): Promise<void> => {
  const packetId = typeof req.params.packetId === 'string' ? req.params.packetId : req.params.packetId?.[0];
  if (!packetId) {
    res.status(400).json({ ok: false as const, error: 'packetId required' });
    return;
  }
  const store = getEvidencePacketStore();
  const packet = await store.get(packetId);
  if (!packet) {
    res.status(404).json({ ok: false as const, error: 'Evidence packet not found' });
    return;
  }
  res.json({ ok: true as const, packet });
});

router.post('/:packetId/situation-room', async (req: Request, res: Response): Promise<void> => {
  const packetId = typeof req.params.packetId === 'string' ? req.params.packetId : req.params.packetId?.[0];
  if (!packetId) {
    res.status(400).json({ ok: false as const, error: 'packetId required' });
    return;
  }
  const parsed = situationLinkBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const { reportId, projectId, sourceType, title } = parsed.data;
  const rid = reportId?.trim();
  const pid = projectId?.trim();
  if (!rid && !pid) {
    res.status(400).json({
      ok: false as const,
      error:
        'Linking requires an existing reportId or projectId for the Situation Room API. DPAL does not invent project or report identifiers.',
    });
    return;
  }

  const store = getEvidencePacketStore();
  const packet = await store.get(packetId);
  if (!packet) {
    res.status(404).json({ ok: false as const, error: 'Evidence packet not found' });
    return;
  }

  const base = serviceBaseUrl(req);
  const location =
    packet.lat != null && packet.lng != null
      ? { label: packet.locationLabel, lat: packet.lat, lng: packet.lng }
      : packet.locationLabel
        ? { label: packet.locationLabel }
        : undefined;

  try {
    if (rid) {
      const r = await fetch(`${base}/api/situation/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: rid,
          title: title || packet.title,
          evidencePacket: packet,
          location,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; room?: { roomId?: string }; error?: string };
      if (!r.ok || !j.ok || !j.room?.roomId) {
        res.status(r.ok ? 502 : r.status).json({
          ok: false as const,
          error: j.error || `Situation Room report link failed (${r.status})`,
        });
        return;
      }
      const updated = await store.update(packet.packetId, {
        situationRoomId: j.room.roomId,
      });
      res.status(200).json({ ok: true as const, situationRoomId: j.room.roomId, packet: updated });
      return;
    }

    const st = (sourceType || 'manual').trim();
    const r = await fetch(`${base}/api/situation/project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: pid,
        sourceType: st,
        title: title || packet.title,
        evidencePacket: packet,
        location,
      }),
    });
    const j = (await r.json()) as { ok?: boolean; room?: { roomId?: string }; error?: string };
    if (!r.ok || !j.ok || !j.room?.roomId) {
      res.status(r.ok ? 502 : r.status).json({
        ok: false as const,
        error: j.error || `Situation Room project link failed (${r.status})`,
      });
      return;
    }
    const updated = await store.update(packet.packetId, {
      situationRoomId: j.room.roomId,
      projectId: pid,
    });
    res.status(200).json({ ok: true as const, situationRoomId: j.room.roomId, packet: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Situation Room request failed';
    res.status(502).json({ ok: false as const, error: msg });
  }
});

export default router;
