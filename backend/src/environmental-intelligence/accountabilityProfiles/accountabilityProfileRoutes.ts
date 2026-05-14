import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { buildAccountabilityProfile } from './accountabilityProfileBuilder';
import { calculateAccountabilityRisk } from './accountabilityProfileRisk';
import { getAccountabilityProfileStore } from './accountabilityProfileStore';
import type { DpalAccountabilityProfile, UpdateAccountabilityProfileInput } from './accountabilityProfileTypes';
import { buildEvidencePacketFromSourceRun } from '../evidencePackets/evidencePacketBuilder';
import { getEvidencePacketStore } from '../evidencePackets/evidencePacketStore';
import type { DpalEvidencePacket } from '../evidencePackets/evidencePacketTypes';
import { executeEnvironmentalSourceRun, type EnvironmentalSourceRunResponse } from '../sources/sourceRunService';

const router = Router();

const profileTypeSchema = z.enum([
  'company',
  'facility',
  'project',
  'site',
  'incident',
  'supplier',
  'property',
  'public_asset',
]);

const createBodySchema = z.object({
  profileType: z.union([profileTypeSchema, z.string()]),
  companyName: z.string().optional(),
  facilityName: z.string().optional(),
  facilityId: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
  radiusKm: z.number().finite().optional(),
  useCaseId: z.string().optional(),
  claimText: z.string().optional(),
  claimSourceUrl: z.string().optional(),
  runEvidenceNow: z.boolean().optional(),
});

const patchBodySchema = z
  .object({
    profileType: profileTypeSchema.optional(),
    companyName: z.string().optional(),
    facilityName: z.string().optional(),
    facilityId: z.string().optional(),
    address: z.string().optional(),
    lat: z.number().finite().optional(),
    lng: z.number().finite().optional(),
    radiusKm: z.number().finite().optional(),
    useCaseId: z.string().optional(),
    claimText: z.string().optional(),
    claimSourceUrl: z.string().optional(),
    status: z.string().optional(),
    riskLevel: z.string().optional(),
    anomalySummary: z.string().optional(),
    validationStatus: z.string().optional(),
    safetyLabels: z
      .object({
        pending_verification: z.boolean().optional(),
        human_verified: z.boolean().optional(),
        blockchain_anchored: z.boolean().optional(),
      })
      .optional(),
    limitations: z.array(z.string()).optional(),
    evidencePacketIds: z.array(z.string()).optional(),
    situationRoomIds: z.array(z.string()).optional(),
    projectIds: z.array(z.string()).optional(),
  })
  .strict();

const runEvidenceBodySchema = z.object({
  sourceIds: z.array(z.string()).optional(),
  baselineDate: z.string().optional(),
  currentDate: z.string().optional(),
  evidenceRefs: z.array(z.unknown()).optional(),
});

const situationLinkBodySchema = z.object({
  reportId: z.string().optional(),
  projectId: z.string().optional(),
  sourceType: z.string().optional(),
  title: z.string().optional(),
});

function paramId(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  return v?.[0];
}

function serviceBaseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3001';
  return `${proto}://${host}`;
}

export async function recalculateAndPersistProfileRisk(profileId: string) {
  const ps = getAccountabilityProfileStore();
  const es = getEvidencePacketStore();
  const p = await ps.get(profileId);
  if (!p) return null;
  const packets = (await Promise.all(p.evidencePacketIds.map((id) => es.get(id)))).filter(Boolean) as DpalEvidencePacket[];
  const risk = calculateAccountabilityRisk(p, packets);
  const mergedLimitations = [...new Set([...p.limitations, ...risk.limitations])];
  return ps.update(profileId, {
    riskLevel: risk.riskLevel,
    anomalySummary: risk.anomalySummary,
    limitations: mergedLimitations,
  });
}

export async function runEvidenceForProfile(
  profileId: string,
  overrides: z.infer<typeof runEvidenceBodySchema>,
): Promise<{ profile: DpalAccountabilityProfile; packet: DpalEvidencePacket; risk: ReturnType<typeof calculateAccountabilityRisk> } | null> {
  const ps = getAccountabilityProfileStore();
  const es = getEvidencePacketStore();
  const profile = await ps.get(profileId);
  if (!profile) return null;

  const hasExec = Boolean(profile.useCaseId?.trim()) || Boolean(overrides.sourceIds?.length);
  if (!hasExec) {
    throw new Error('Profile must have useCaseId or run-evidence body must include sourceIds.');
  }

  const sourceRun = await executeEnvironmentalSourceRun({
    sourceIds: overrides.sourceIds,
    useCaseId: profile.useCaseId?.trim(),
    lat: profile.lat,
    lng: profile.lng,
    radiusKm: profile.radiusKm,
    baselineDate: overrides.baselineDate,
    currentDate: overrides.currentDate,
    companyName: profile.companyName,
    facilityId: profile.facilityId,
    evidenceRefs: overrides.evidenceRefs,
  });

  const titleParts = [profile.companyName, profile.facilityName].filter(Boolean).join(' — ');
  const packet = buildEvidencePacketFromSourceRun({
    sourceRunResponse: sourceRun as EnvironmentalSourceRunResponse,
    useCaseId: profile.useCaseId,
    title: titleParts || `Accountability profile ${profile.profileId}`,
    locationLabel: profile.address ?? profile.facilityName,
    lat: profile.lat,
    lng: profile.lng,
    radiusKm: profile.radiusKm,
    currentDate: overrides.currentDate,
    baselineDate: overrides.baselineDate,
  });

  await es.save(packet);
  await ps.addEvidencePacket(profileId, packet.packetId);
  await recalculateAndPersistProfileRisk(profileId);
  const after = await ps.get(profileId);
  if (!after) return null;
  const packetsLoaded = (await Promise.all(after.evidencePacketIds.map((id) => es.get(id)))).filter(
    Boolean,
  ) as DpalEvidencePacket[];
  const risk = calculateAccountabilityRisk(after, packetsLoaded);
  return { profile: after, packet, risk };
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  let profile = buildAccountabilityProfile(body);
  const store = getAccountabilityProfileStore();
  profile = await store.save(profile);

  if (body.runEvidenceNow) {
    try {
      const ran = await runEvidenceForProfile(profile.profileId, {});
      if (!ran) {
        res.status(500).json({ ok: false as const, error: 'Profile save succeeded but evidence run failed.' });
        return;
      }
      res.status(201).json({ ok: true as const, profile: ran.profile, packet: ran.packet, risk: ran.risk });
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Evidence run failed';
      res.status(400).json({ ok: false as const, error: msg });
      return;
    }
  }

  res.status(201).json({ ok: true as const, profile });
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
  const useCaseId = typeof req.query.useCaseId === 'string' ? req.query.useCaseId : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const companyName = typeof req.query.companyName === 'string' ? req.query.companyName : undefined;
  const store = getAccountabilityProfileStore();
  const profiles = await store.list(limit, { useCaseId, status, companyName });
  res.json({ ok: true as const, profiles });
});

router.post('/:profileId/run-evidence', async (req: Request, res: Response): Promise<void> => {
  const profileId = paramId(req.params.profileId);
  if (!profileId) {
    res.status(400).json({ ok: false as const, error: 'profileId required' });
    return;
  }
  const parsed = runEvidenceBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  try {
    const ran = await runEvidenceForProfile(profileId, parsed.data);
    if (!ran) {
      res.status(404).json({ ok: false as const, error: 'Profile not found' });
      return;
    }
    res.json({ ok: true as const, profile: ran.profile, packet: ran.packet, risk: ran.risk });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Evidence run failed';
    res.status(400).json({ ok: false as const, error: msg });
  }
});

router.post('/:profileId/evidence-packets/:packetId', async (req: Request, res: Response): Promise<void> => {
  const profileId = paramId(req.params.profileId);
  const packetId = paramId(req.params.packetId);
  if (!profileId || !packetId) {
    res.status(400).json({ ok: false as const, error: 'profileId and packetId required' });
    return;
  }
  const es = getEvidencePacketStore();
  const packet = await es.get(packetId);
  if (!packet) {
    res.status(404).json({ ok: false as const, error: 'Evidence packet not found' });
    return;
  }
  const store = getAccountabilityProfileStore();
  const updated = await store.addEvidencePacket(profileId, packetId);
  if (!updated) {
    res.status(404).json({ ok: false as const, error: 'Profile not found' });
    return;
  }
  const profile = await recalculateAndPersistProfileRisk(profileId);
  const base = profile ?? updated;
  const packets = (await Promise.all(base.evidencePacketIds.map((id) => es.get(id)))).filter(Boolean) as DpalEvidencePacket[];
  const risk = calculateAccountabilityRisk(base, packets);
  res.json({ ok: true as const, profile: base, risk });
});

router.post('/:profileId/situation-room', async (req: Request, res: Response): Promise<void> => {
  const profileId = paramId(req.params.profileId);
  if (!profileId) {
    res.status(400).json({ ok: false as const, error: 'profileId required' });
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

  const store = getAccountabilityProfileStore();
  const es = getEvidencePacketStore();
  const profile = await store.get(profileId);
  if (!profile) {
    res.status(404).json({ ok: false as const, error: 'Profile not found' });
    return;
  }

  const packets = (await Promise.all(profile.evidencePacketIds.map((id) => es.get(id)))).filter(Boolean) as DpalEvidencePacket[];
  const summaries = packets.map((p) => ({
    packetId: p.packetId,
    title: p.title,
    runId: p.runId,
    useCaseId: p.useCaseId,
    limitations: p.limitations.slice(0, 5),
    validationStatus: p.validationStatus,
  }));
  const evidencePayload = {
    accountabilityProfile: {
      profileId: profile.profileId,
      profileType: profile.profileType,
      companyName: profile.companyName,
      facilityName: profile.facilityName,
      useCaseId: profile.useCaseId,
      claimText: profile.claimText,
      riskLevel: profile.riskLevel,
      anomalySummary: profile.anomalySummary,
      validationStatus: profile.validationStatus,
    },
    evidencePacketSummaries: summaries,
  };

  const base = serviceBaseUrl(req);
  const location =
    profile.lat != null && profile.lng != null
      ? { label: profile.address ?? profile.facilityName, lat: profile.lat, lng: profile.lng }
      : profile.address || profile.facilityName
        ? { label: profile.address ?? profile.facilityName }
        : undefined;

  try {
    if (rid) {
      const r = await fetch(`${base}/api/situation/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: rid,
          title: title || profile.companyName || profile.facilityName || `Profile ${profileId}`,
          evidencePacket: evidencePayload,
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
      const roomIds = [...new Set([...profile.situationRoomIds, j.room.roomId])];
      const updated = await store.update(profileId, { situationRoomIds: roomIds });
      res.status(200).json({ ok: true as const, situationRoomId: j.room.roomId, profile: updated });
      return;
    }

    const st = (sourceType || 'manual').trim();
    const r = await fetch(`${base}/api/situation/project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: pid,
        sourceType: st,
        title: title || profile.companyName || profile.facilityName || `Profile ${profileId}`,
        evidencePacket: evidencePayload,
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
    const roomIds = [...new Set([...profile.situationRoomIds, j.room.roomId])];
    const projectIds = [...new Set([...profile.projectIds, pid as string])];
    const updated = await store.update(profileId, { situationRoomIds: roomIds, projectIds });
    res.status(200).json({ ok: true as const, situationRoomId: j.room.roomId, profile: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Situation Room request failed';
    res.status(502).json({ ok: false as const, error: msg });
  }
});

router.get('/:profileId', async (req: Request, res: Response): Promise<void> => {
  const profileId = paramId(req.params.profileId);
  if (!profileId) {
    res.status(400).json({ ok: false as const, error: 'profileId required' });
    return;
  }
  const store = getAccountabilityProfileStore();
  const profile = await store.get(profileId);
  if (!profile) {
    res.status(404).json({ ok: false as const, error: 'Profile not found' });
    return;
  }
  res.json({ ok: true as const, profile });
});

router.patch('/:profileId', async (req: Request, res: Response): Promise<void> => {
  const profileId = paramId(req.params.profileId);
  if (!profileId) {
    res.status(400).json({ ok: false as const, error: 'profileId required' });
    return;
  }
  const parsed = patchBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false as const, error: 'Invalid body', issues: parsed.error.flatten() });
    return;
  }
  const store = getAccountabilityProfileStore();
  const updated = await store.update(profileId, parsed.data as UpdateAccountabilityProfileInput);
  if (!updated) {
    res.status(404).json({ ok: false as const, error: 'Profile not found' });
    return;
  }
  let out = updated;
  if (parsed.data.evidencePacketIds) {
    const r = await recalculateAndPersistProfileRisk(profileId);
    if (r) out = r;
  }
  res.json({ ok: true as const, profile: out });
});

export default router;
