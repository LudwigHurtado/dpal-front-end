import { Router } from 'express';
import { z } from 'zod';
import {
  CARBONPURA_DEFAULT_PARTNER_KEY,
  CARBONPURA_EVIDENCE_SOURCE_LIMITATION,
} from '../services/carbonpura/carbonPuraEvidenceTypes';
import { getActiveCarbonPuraEvidenceStoreMode, getCarbonPuraEvidenceStore } from '../services/carbonpura/carbonPuraEvidenceStore';

const router = Router();

const createProjectSchema = z.object({
  projectId: z.string().min(1).max(120),
  partnerKey: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(240),
  status: z.string().min(1).max(64).optional(),
  locationLabel: z.string().max(500).optional().nullable(),
});

const createEventSchema = z.object({
  partnerKey: z.string().min(1).max(64).optional(),
  moduleId: z.string().max(120).optional().nullable(),
  moduleName: z.string().min(1).max(240),
  sourceSuite: z.string().max(64).optional().nullable(),
  eventType: z.string().min(1).max(120).optional(),
  title: z.string().min(1).max(500),
  summary: z.string().max(4000).optional().nullable(),
  status: z.string().min(1).max(120).optional(),
  coordinates: z.unknown().optional().nullable(),
  aoiGeoJson: z.unknown().optional().nullable(),
  provider: z.string().max(240).optional().nullable(),
  confidenceUse: z.string().max(2000).optional().nullable(),
  rawPayloadJson: z.unknown().optional().nullable(),
  limitationsJson: z.union([z.array(z.string()), z.unknown()]).optional().nullable(),
});

const draftPacketSchema = z.object({
  partnerKey: z.string().min(1).max(64).optional(),
  title: z.string().min(1).max(500).optional(),
  summary: z.string().max(4000).optional().nullable(),
  eventIds: z.array(z.string().min(1)).min(1),
});

router.get('/projects', async (req, res) => {
  try {
    const partnerKey = String(req.query.partnerKey ?? CARBONPURA_DEFAULT_PARTNER_KEY).trim();
    const store = getCarbonPuraEvidenceStore();
    const projects = await store.listProjects(partnerKey);
    return res.json({
      ok: true,
      partnerKey,
      persistenceMode: getActiveCarbonPuraEvidenceStoreMode(),
      projects,
    });
  } catch (error) {
    console.error('[carbonpura] list projects error:', error);
    return res.status(500).json({ ok: false, error: 'list_projects_failed' });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_body', details: parsed.error.flatten() });
    }
    const body = parsed.data;
    const store = getCarbonPuraEvidenceStore();
    const project = await store.createProject({
      projectId: body.projectId,
      partnerKey: body.partnerKey ?? CARBONPURA_DEFAULT_PARTNER_KEY,
      name: body.name,
      status: body.status ?? 'draft',
      locationLabel: body.locationLabel ?? null,
    });
    return res.status(201).json({
      ok: true,
      persistenceMode: getActiveCarbonPuraEvidenceStoreMode(),
      project,
    });
  } catch (error) {
    console.error('[carbonpura] create project error:', error);
    return res.status(500).json({ ok: false, error: 'create_project_failed' });
  }
});

router.get('/projects/:projectId/evidence-events', async (req, res) => {
  try {
    const projectId = String(req.params.projectId ?? '').trim();
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId_required' });
    const store = getCarbonPuraEvidenceStore();
    const project = await store.getProject(projectId);
    if (!project) return res.status(404).json({ ok: false, error: 'project_not_found' });
    const events = await store.listEvents(projectId);
    return res.json({
      ok: true,
      projectId,
      persistenceMode: getActiveCarbonPuraEvidenceStoreMode(),
      events,
    });
  } catch (error) {
    console.error('[carbonpura] list events error:', error);
    return res.status(500).json({ ok: false, error: 'list_events_failed' });
  }
});

router.post('/projects/:projectId/evidence-events', async (req, res) => {
  try {
    const projectId = String(req.params.projectId ?? '').trim();
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId_required' });
    const parsed = createEventSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_body', details: parsed.error.flatten() });
    }
    const body = parsed.data;
    const store = getCarbonPuraEvidenceStore();
    const project = await store.getProject(projectId);
    if (!project) return res.status(404).json({ ok: false, error: 'project_not_found' });

    const limitations =
      body.limitationsJson == null
        ? [CARBONPURA_EVIDENCE_SOURCE_LIMITATION]
        : Array.isArray(body.limitationsJson)
          ? body.limitationsJson
          : [CARBONPURA_EVIDENCE_SOURCE_LIMITATION];

    const event = await store.createEvent({
      projectId,
      partnerKey: body.partnerKey ?? project.partnerKey,
      moduleId: body.moduleId ?? null,
      moduleName: body.moduleName,
      sourceSuite: body.sourceSuite ?? null,
      eventType: body.eventType ?? 'evidence_source_selected',
      title: body.title,
      summary: body.summary ?? null,
      status: body.status ?? 'evidence_source_selected',
      coordinates: body.coordinates ?? null,
      aoiGeoJson: body.aoiGeoJson ?? null,
      provider: body.provider ?? null,
      confidenceUse: body.confidenceUse ?? null,
      rawPayloadJson: body.rawPayloadJson ?? null,
      limitationsJson: limitations,
    });

    return res.status(201).json({
      ok: true,
      persistenceMode: getActiveCarbonPuraEvidenceStoreMode(),
      event,
      disclaimer:
        'Evidence event records source selection or attached module output. It is not validator-approved verification.',
    });
  } catch (error) {
    console.error('[carbonpura] create event error:', error);
    return res.status(500).json({ ok: false, error: 'create_event_failed' });
  }
});

router.get('/projects/:projectId/evidence-packets', async (req, res) => {
  try {
    const projectId = String(req.params.projectId ?? '').trim();
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId_required' });
    const store = getCarbonPuraEvidenceStore();
    const project = await store.getProject(projectId);
    if (!project) return res.status(404).json({ ok: false, error: 'project_not_found' });
    const packets = await store.listPackets(projectId);
    return res.json({
      ok: true,
      projectId,
      persistenceMode: getActiveCarbonPuraEvidenceStoreMode(),
      packets,
    });
  } catch (error) {
    console.error('[carbonpura] list packets error:', error);
    return res.status(500).json({ ok: false, error: 'list_packets_failed' });
  }
});

router.post('/projects/:projectId/evidence-packets/draft', async (req, res) => {
  try {
    const projectId = String(req.params.projectId ?? '').trim();
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId_required' });
    const parsed = draftPacketSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_body', details: parsed.error.flatten() });
    }
    const body = parsed.data;
    const store = getCarbonPuraEvidenceStore();
    const project = await store.getProject(projectId);
    if (!project) return res.status(404).json({ ok: false, error: 'project_not_found' });

    const events = await store.listEvents(projectId);
    const knownIds = new Set(events.map((e) => e.eventId));
    const missing = body.eventIds.filter((id) => !knownIds.has(id));
    if (missing.length > 0) {
      return res.status(400).json({
        ok: false,
        error: 'unknown_event_ids',
        missingEventIds: missing,
      });
    }

    const packet = await store.createDraftPacket({
      projectId,
      partnerKey: body.partnerKey ?? project.partnerKey,
      title: body.title ?? `CarbonPura draft evidence packet — ${project.name}`,
      summary:
        body.summary ??
        'Draft aggregated packet from CarbonPura evidence events. Not validator-approved. QR and exports pending.',
      eventIds: body.eventIds,
    });

    return res.status(201).json({
      ok: true,
      persistenceMode: getActiveCarbonPuraEvidenceStoreMode(),
      packet,
      pendingIntegrations: ['qr_living_evidence_page', 'json_export_url', 'pdf_export_url', 'validator_review'],
      disclaimer:
        'Draft packet only. Cross-module scan attachment and validator review remain pending at the CarbonPura hub layer.',
    });
  } catch (error) {
    console.error('[carbonpura] create draft packet error:', error);
    return res.status(500).json({ ok: false, error: 'create_draft_packet_failed' });
  }
});

export default router;
