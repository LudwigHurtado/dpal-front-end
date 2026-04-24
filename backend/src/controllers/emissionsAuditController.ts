import type { Request, Response } from 'express';
import { Prisma, DpalUserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { paramId } from '../lib/routeParams';
import {
  emissionsAuditExportSchema,
  emissionsAuditLinkSchema,
  emissionsAuditPayloadSchema,
  type EmissionsAuditPayloadInput,
} from '../schemas/emissionsAudit';
import { runEmissionsAuditCalculations } from '../services/emissionsAuditCalculationService';

type AuditRecord = any;

const toJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;
const prismaDb = prisma as any;

function mapRiskLevel(value: string): 'high' | 'medium' | 'needs_more_data' | 'low' {
  if (value === 'High') return 'high';
  if (value === 'Medium') return 'medium';
  if (value === 'Needs More Data') return 'needs_more_data';
  return 'low';
}

function mapLedgerStatus(value?: string | null): 'pending' | 'linked' | 'exported' | 'failed' | 'not_connected' {
  if (value === 'pending') return 'pending';
  if (value === 'linked') return 'linked';
  if (value === 'exported') return 'exported';
  if (value === 'failed') return 'failed';
  return 'not_connected';
}

function isAdmin(req: Request): boolean {
  return req.dpalUser?.role === DpalUserRole.admin;
}

function buildEvidencePacket(auditId: string, payload: EmissionsAuditPayloadInput, derived: ReturnType<typeof runEmissionsAuditCalculations>) {
  return {
    title: 'DPAL Emissions Integrity Audit Evidence Packet',
    auditId,
    companyName: payload.companyName,
    facilityName: payload.facilityName,
    jurisdiction: payload.jurisdiction,
    industry: payload.industry,
    legalFramework: payload.legalFramework,
    location: {
      lat: payload.location.lat ?? null,
      lng: payload.location.lng ?? null,
    },
    polygon: payload.location.polygonGeoJSON?.coordinates?.[0]?.slice?.(0, -1)?.map?.((pair: [number, number]) => ({ lat: pair[1], lng: pair[0] })) ?? [],
    mapBoundary: payload.location,
    periodComparison: {
      baselinePeriod: payload.baselinePeriod,
      currentPeriod: payload.currentPeriod,
    },
    baselinePeriod: payload.baselinePeriod,
    currentPeriod: payload.currentPeriod,
    dataSources: {
      reportedData: payload.reportedData ?? null,
      satelliteData: payload.satelliteData ?? null,
      productionData: payload.productionData ?? null,
    },
    reportedData: payload.reportedData ?? null,
    satelliteObservations: payload.satelliteData ?? null,
    productionData: payload.productionData ?? null,
    calculations: {
      ...derived.calculations,
      interpretation:
        `The company reported a ${derived.calculations.reportedReductionPct.toFixed(1)}% reduction, ` +
        `while observed indicators suggest ${derived.calculations.observedReductionPct.toFixed(1)}%.`,
    },
    calculationResults: {
      ...derived.calculations,
      interpretation:
        `The company reported a ${derived.calculations.reportedReductionPct.toFixed(1)}% reduction, ` +
        `while observed indicators suggest ${derived.calculations.observedReductionPct.toFixed(1)}%.`,
    },
    ADI: derived.calculations.auditDiscrepancyIndex,
    adiScore: derived.calculations.auditDiscrepancyIndex,
    riskLevel: derived.riskLevel,
    confidence: derived.confidence,
    confidenceScore: derived.confidence.overallConfidence,
    legalContext: payload.legalContext,
    limitations: payload.limitations,
    recommendedNextSteps: payload.recommendedNextSteps,
    generatedAt: new Date().toISOString(),
    checksumPlaceholder: 'pending-checksum',
    dpalLedgerPlaceholder: {
      status: payload.ledgerStatus ?? 'not_connected',
      note: 'Ledger integration placeholder.',
    },
  };
}

function buildFullAudit(auditId: string, payload: EmissionsAuditPayloadInput, derived: ReturnType<typeof runEmissionsAuditCalculations>, userId: string) {
  return {
    id: auditId,
    userId,
    createdBy: userId,
    companyName: payload.companyName,
    facilityName: payload.facilityName,
    industry: payload.industry,
    jurisdiction: payload.jurisdiction,
    legalFramework: payload.legalFramework,
    location: payload.location,
    baselinePeriod: payload.baselinePeriod,
    currentPeriod: payload.currentPeriod,
    reportedData: payload.reportedData ?? null,
    satelliteData: payload.satelliteData ?? null,
    productionData: payload.productionData ?? null,
    calculations: derived.calculations,
    confidence: derived.confidence,
    riskLevel: derived.riskLevel,
    legalContext: payload.legalContext,
    limitations: payload.limitations,
    recommendedNextSteps: payload.recommendedNextSteps,
    evidencePacket: buildEvidencePacket(auditId, payload, derived),
    linkedReportId: payload.linkedReportId ?? null,
    linkedMissionId: payload.linkedMissionId ?? null,
    linkedProjectId: payload.linkedProjectId ?? null,
    linkedMRVProjectId: payload.linkedMRVProjectId ?? null,
    linkedEvidenceVaultId: payload.linkedEvidenceVaultId ?? null,
    ledgerStatus: payload.ledgerStatus ?? 'not_connected',
    version: payload.version ?? 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function toPersistenceData(auditId: string, payload: EmissionsAuditPayloadInput, userId: string, lastModifiedBy: string, version: number) {
  const derived = runEmissionsAuditCalculations(payload);
  const evidencePacket = buildEvidencePacket(auditId, payload, derived);
  const fullAudit = {
    ...buildFullAudit(auditId, payload, derived, userId),
    lastModifiedBy,
    version,
    evidencePacket,
  };

  return {
    derived,
    evidencePacket,
    fullAudit,
    dbData: {
      id: auditId,
      userId,
      createdBy: userId,
      lastModifiedBy,
      companyName: payload.companyName,
      facilityName: payload.facilityName,
      industry: payload.industry,
      jurisdiction: payload.jurisdiction,
      legalFramework: payload.legalFramework,
      locationLat: payload.location.lat ?? null,
      locationLng: payload.location.lng ?? null,
      polygonGeoJSON: payload.location.polygonGeoJSON ? toJson(payload.location.polygonGeoJSON) : Prisma.JsonNull,
      areaEstimate: payload.location.areaEstimate ?? null,
      baselinePeriod: toJson(payload.baselinePeriod),
      currentPeriod: toJson(payload.currentPeriod),
      reportedData: payload.reportedData ? toJson(payload.reportedData) : Prisma.JsonNull,
      satelliteData: payload.satelliteData ? toJson(payload.satelliteData) : Prisma.JsonNull,
      productionData: payload.productionData ? toJson(payload.productionData) : Prisma.JsonNull,
      calculations: toJson(derived.calculations),
      confidence: toJson(derived.confidence),
      adiScore: derived.calculations.auditDiscrepancyIndex,
      riskLevel: mapRiskLevel(derived.riskLevel),
      legalContext: toJson(payload.legalContext),
      limitations: toJson(payload.limitations),
      recommendedNextSteps: toJson(payload.recommendedNextSteps),
      evidencePacket: toJson(evidencePacket),
      fullAudit: toJson(fullAudit),
      linkedReportId: payload.linkedReportId ?? null,
      linkedMissionId: payload.linkedMissionId ?? null,
      linkedProjectId: payload.linkedProjectId ?? null,
      linkedMRVProjectId: payload.linkedMRVProjectId ?? null,
      linkedEvidenceVaultId: payload.linkedEvidenceVaultId ?? null,
      ledgerStatus: mapLedgerStatus(payload.ledgerStatus),
      version,
    },
  };
}

async function findAuditForRequest(req: Request, res: Response): Promise<AuditRecord | null> {
  const id = paramId(req);
  const audit = await prismaDb.emissionsAudit.findUnique({ where: { id } });
  if (!audit || audit.deletedAt) {
    res.status(404).json({ error: 'Not found', message: 'Audit not found.' });
    return null;
  }
  if (audit.userId !== req.dpalUser!.id && !isAdmin(req)) {
    res.status(403).json({ error: 'Forbidden', message: 'You may only access your own audits.' });
    return null;
  }
  return audit;
}

function parseAuditPayload(req: Request, res: Response): EmissionsAuditPayloadInput | null {
  const parsed = emissionsAuditPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
    return null;
  }
  return parsed.data;
}

export async function createEmissionsAudit(req: Request, res: Response): Promise<void> {
  const payload = parseAuditPayload(req, res);
  if (!payload) return;
  const userId = req.dpalUser!.id;
  const nextVersion = 1;
  const auditId = `EIAS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const persistence = toPersistenceData(auditId, payload, userId, userId, nextVersion);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const audit = await (tx as any).emissionsAudit.create({ data: persistence.dbData });
      await (tx as any).emissionsAuditVersion.create({
        data: {
          auditId: audit.id,
          version: nextVersion,
          modifiedBy: userId,
          changeSummary: 'Created audit',
          payload: toJson(persistence.fullAudit),
        },
      });
      return audit;
    });

    res.status(201).json({
      ok: true,
      auditId: created.id,
      audit: persistence.fullAudit,
      summary: {
        id: created.id,
        companyName: created.companyName,
        facilityName: created.facilityName,
        jurisdiction: created.jurisdiction,
        adiScore: created.adiScore,
        riskLevel: created.riskLevel,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    console.error('[createEmissionsAudit]', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to create emissions audit.' });
  }
}

export async function listEmissionsAudits(req: Request, res: Response): Promise<void> {
  try {
    const audits = await prismaDb.emissionsAudit.findMany({
      where: isAdmin(req) ? { deletedAt: null } : { userId: req.dpalUser!.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        companyName: true,
        facilityName: true,
        jurisdiction: true,
        adiScore: true,
        riskLevel: true,
        createdAt: true,
        updatedAt: true,
        linkedReportId: true,
        linkedMissionId: true,
        linkedProjectId: true,
      },
    });
    res.json({ ok: true, audits });
  } catch (error) {
    console.error('[listEmissionsAudits]', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to load audits.' });
  }
}

export async function getEmissionsAudit(req: Request, res: Response): Promise<void> {
  try {
    const audit = await findAuditForRequest(req, res);
    if (!audit) return;

    const versions = await prismaDb.emissionsAuditVersion.findMany({
      where: { auditId: audit.id },
      orderBy: { version: 'desc' },
      select: {
        version: true,
        modifiedBy: true,
        changeSummary: true,
        createdAt: true,
      },
    });

    res.json({
      ok: true,
      audit,
      versionHistory: versions,
    });
  } catch (error) {
    console.error('[getEmissionsAudit]', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to load audit.' });
  }
}

export async function updateEmissionsAudit(req: Request, res: Response): Promise<void> {
  const payload = parseAuditPayload(req, res);
  if (!payload) return;

  try {
    const existing = await findAuditForRequest(req, res);
    if (!existing) return;
    const nextVersion = existing.version + 1;
    const userId = existing.userId;
    const modifierId = req.dpalUser!.id;
    const persistence = toPersistenceData(existing.id, payload, userId, modifierId, nextVersion);

    const updated = await prisma.$transaction(async (tx) => {
      const audit = await (tx as any).emissionsAudit.update({
        where: { id: existing.id },
        data: {
          ...persistence.dbData,
          createdBy: existing.createdBy,
        },
      });
      await (tx as any).emissionsAuditVersion.create({
        data: {
          auditId: audit.id,
          version: nextVersion,
          modifiedBy: modifierId,
          changeSummary: 'Updated audit',
          payload: toJson(persistence.fullAudit),
        },
      });
      return audit;
    });

    res.json({
      ok: true,
      auditId: updated.id,
      audit: persistence.fullAudit,
    });
  } catch (error) {
    console.error('[updateEmissionsAudit]', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to update audit.' });
  }
}

export async function deleteEmissionsAudit(req: Request, res: Response): Promise<void> {
  try {
    const existing = await findAuditForRequest(req, res);
    if (!existing) return;

    await prismaDb.emissionsAudit.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        lastModifiedBy: req.dpalUser!.id,
      },
    });

    res.json({ ok: true, deleted: true, auditId: existing.id });
  } catch (error) {
    console.error('[deleteEmissionsAudit]', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to delete audit.' });
  }
}

async function exportAuditById(auditId: string, req: Request, res: Response): Promise<void> {
  const audit = await prismaDb.emissionsAudit.findUnique({ where: { id: auditId } });
  if (!audit || audit.deletedAt) {
    res.status(404).json({ error: 'Not found', message: 'Audit not found.' });
    return;
  }
  if (audit.userId !== req.dpalUser!.id && !isAdmin(req)) {
    res.status(403).json({ error: 'Forbidden', message: 'You may only access your own audits.' });
    return;
  }
  res.json({
    ok: true,
    export: audit.evidencePacket,
    pdfPlaceholder: {
      status: 'not_implemented',
      note: 'PDF export placeholder only. Render service not connected yet.',
    },
    evidenceBundle: {
      auditId: audit.id,
      fullAudit: audit.fullAudit,
      evidencePacket: audit.evidencePacket,
    },
  });
}

export async function exportEmissionsAudit(req: Request, res: Response): Promise<void> {
  const bodyParsed = emissionsAuditExportSchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    res.status(400).json({ error: 'Validation failed', details: bodyParsed.error.flatten().fieldErrors });
    return;
  }
  const auditId = bodyParsed.data.id;
  if (!auditId) {
    res.status(400).json({ error: 'Validation failed', message: 'Audit id is required for export.' });
    return;
  }
  await exportAuditById(auditId, req, res);
}

export async function exportEmissionsAuditByParam(req: Request, res: Response): Promise<void> {
  await exportAuditById(paramId(req), req, res);
}

export async function linkEmissionsAudit(req: Request, res: Response): Promise<void> {
  const parsed = emissionsAuditLinkSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }
  try {
    const existing = await findAuditForRequest(req, res);
    if (!existing) return;
    const nextVersion = existing.version + 1;
    const updatedFullAudit = {
      ...((existing.fullAudit as Record<string, unknown>) ?? {}),
      ...parsed.data,
      lastModifiedBy: req.dpalUser!.id,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };
    const updated = await prisma.$transaction(async (tx) => {
      const audit = await (tx as any).emissionsAudit.update({
        where: { id: existing.id },
        data: {
          ...parsed.data,
          lastModifiedBy: req.dpalUser!.id,
          version: nextVersion,
          fullAudit: toJson(updatedFullAudit),
        },
      });
      await (tx as any).emissionsAuditVersion.create({
        data: {
          auditId: audit.id,
          version: nextVersion,
          modifiedBy: req.dpalUser!.id,
          changeSummary: 'Linked audit to DPAL module',
          payload: toJson(updatedFullAudit),
        },
      });
      return audit;
    });
    res.json({ ok: true, auditId: updated.id, links: parsed.data });
  } catch (error) {
    console.error('[linkEmissionsAudit]', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to link audit.' });
  }
}

export async function recalculateEmissionsAudit(req: Request, res: Response): Promise<void> {
  try {
    const existing = await findAuditForRequest(req, res);
    if (!existing) return;
    const payload = emissionsAuditPayloadSchema.parse({
      companyName: existing.companyName,
      facilityName: existing.facilityName,
      industry: existing.industry,
      jurisdiction: existing.jurisdiction,
      legalFramework: existing.legalFramework,
      location: {
        lat: existing.locationLat,
        lng: existing.locationLng,
        polygonGeoJSON: existing.polygonGeoJSON ?? undefined,
        areaEstimate: existing.areaEstimate,
      },
      baselinePeriod: existing.baselinePeriod,
      currentPeriod: existing.currentPeriod,
      reportedData: existing.reportedData ?? undefined,
      satelliteData: existing.satelliteData ?? undefined,
      productionData: existing.productionData ?? undefined,
      confidence: existing.confidence,
      legalContext: (existing.legalContext as string[]) ?? [],
      limitations: (existing.limitations as string[]) ?? [],
      recommendedNextSteps: (existing.recommendedNextSteps as string[]) ?? [],
      linkedReportId: existing.linkedReportId,
      linkedMissionId: existing.linkedMissionId,
      linkedProjectId: existing.linkedProjectId,
      linkedMRVProjectId: existing.linkedMRVProjectId,
      linkedEvidenceVaultId: existing.linkedEvidenceVaultId,
      ledgerStatus: existing.ledgerStatus,
      version: existing.version,
    });
    const nextVersion = existing.version + 1;
    const persistence = toPersistenceData(existing.id, payload, existing.userId, req.dpalUser!.id, nextVersion);
    await prisma.$transaction(async (tx) => {
      await (tx as any).emissionsAudit.update({
        where: { id: existing.id },
        data: {
          ...persistence.dbData,
          createdBy: existing.createdBy,
        },
      });
      await (tx as any).emissionsAuditVersion.create({
        data: {
          auditId: existing.id,
          version: nextVersion,
          modifiedBy: req.dpalUser!.id,
          changeSummary: 'Recalculated audit values',
          payload: toJson(persistence.fullAudit),
        },
      });
    });
    res.json({ ok: true, auditId: existing.id, audit: persistence.fullAudit });
  } catch (error) {
    console.error('[recalculateEmissionsAudit]', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to recalculate audit.' });
  }
}
