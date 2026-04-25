import type { Request, Response } from 'express';
import { Prisma, DpalUserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { paramId } from '../lib/routeParams';
import { carbAuditExportSchema, carbAuditLinkSchema, carbAuditPayloadSchema, type CarbAuditPayloadInput } from '../schemas/carbAudit';
import { getCarbImportMeta, importCarbDataset, searchCarbFacilityRecords } from '../services/carbDataService';

const prismaDb = prisma as any;
const toJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

function isAdmin(req: Request): boolean {
  return req.dpalUser?.role === DpalUserRole.admin;
}

function parsePayload(req: Request, res: Response): CarbAuditPayloadInput | null {
  const parsed = carbAuditPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return null;
  }
  return parsed.data;
}

async function findAudit(req: Request, res: Response): Promise<any | null> {
  const audit = await prismaDb.carbAudit.findUnique({ where: { id: paramId(req) } });
  if (!audit || audit.deletedAt) {
    res.status(404).json({ error: 'Not found', message: 'CARB audit not found.' });
    return null;
  }
  if (audit.userId !== req.dpalUser!.id && !isAdmin(req)) {
    res.status(403).json({ error: 'Forbidden', message: 'You may only access your own CARB audits.' });
    return null;
  }
  return audit;
}

function toRisk(value: string): 'low' | 'medium' | 'high' | 'needs_more_data' {
  if (value === 'High') return 'high';
  if (value === 'Medium') return 'medium';
  if (value === 'Needs More Data') return 'needs_more_data';
  return 'low';
}

function buildEvidencePacket(auditId: string, payload: CarbAuditPayloadInput) {
  return {
    auditId,
    module: 'DPAL CARB Emissions Audit',
    facilityName: payload.facilityName,
    operatorName: payload.operatorName,
    CARBFacilityID: payload.facilityId,
    location: {
      city: payload.city,
      county: payload.county,
      state: payload.state,
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
    county: payload.county,
    sector: payload.sector,
    baselineYear: payload.baselineYear,
    currentYear: payload.currentYear,
    baselineEmissions: payload.baselineEmissions,
    currentEmissions: payload.currentEmissions,
    calculatedReduction: payload.calculatedReductionPct,
    companyClaim: payload.companyClaimText ?? null,
    claimComparison: payload.claimGap == null ? 'Claim requires more data' : Math.abs(payload.claimGap) <= 5 ? 'Claim appears consistent' : 'Claim may be inconsistent with reported CARB data',
    discrepancyScore: payload.discrepancyScore ?? null,
    riskLevel: payload.riskLevel,
    verificationStatus: payload.verificationStatus,
    dataSources: payload.dataSources,
    legalContext: payload.legalContext,
    limitations: payload.limitations,
    recommendedNextSteps: payload.recommendedNextSteps,
    generatedAt: new Date().toISOString(),
    dpalLedgerPlaceholder: { status: 'not_connected' },
    checksumPlaceholder: 'pending-checksum',
  };
}

export async function searchCarbData(req: Request, res: Response): Promise<void> {
  const result = await searchCarbFacilityRecords({
    q: String(req.query.q ?? ''),
    facilityId: String(req.query.facilityId ?? ''),
    city: String(req.query.city ?? ''),
    county: String(req.query.county ?? ''),
    sector: String(req.query.sector ?? ''),
    year: Number(req.query.year || 0) || undefined,
    limit: Number(req.query.limit || 50) || 50,
  });
  const meta = getCarbImportMeta();
  res.json({
    ok: true,
    results: result.results,
    count: result.count,
    sourceMode: result.sourceMode,
    warnings: result.warnings,
    datasetVersion: meta.datasetVersion,
    retrievalDate: meta.retrievalDate,
  });
}

export async function importCarbData(req: Request, res: Response): Promise<void> {
  // TODO: wire multipart/form-data upload with multer for large CARB files.
  // For now this endpoint supports JSON body with records[] or csvText/jsonText.
  const imported = await importCarbDataset({
    records: Array.isArray(req.body?.records) ? req.body.records : undefined,
    csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
    jsonText: typeof req.body?.jsonText === 'string' ? req.body.jsonText : undefined,
    datasetVersion: typeof req.body?.datasetVersion === 'string' ? req.body.datasetVersion : undefined,
    sourceUrl: typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl : undefined,
  });
  res.status(201).json({
    ok: true,
    imported: imported.imported,
    acceptedRows: imported.acceptedRows,
    rejectedRows: imported.rejectedRows,
    missingRequiredFields: imported.missingRequiredFields,
    warnings: imported.warnings,
    sourceMode: imported.imported > 0 ? 'IMPORTED' : 'DEMO_FALLBACK',
  });
}

export async function createCarbAudit(req: Request, res: Response): Promise<void> {
  const payload = parsePayload(req, res);
  if (!payload) return;
  const auditId = `CARB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const evidencePacket = buildEvidencePacket(auditId, payload);
  try {
    const created = await prismaDb.carbAudit.create({
      data: {
        id: auditId,
        userId: req.dpalUser!.id,
        ...payload,
        discrepancyScore: payload.discrepancyScore ?? null,
        riskLevel: toRisk(payload.riskLevel),
        dataSources: toJson(payload.dataSources),
        evidencePacket: toJson(payload.evidencePacket ?? evidencePacket),
        legalContext: toJson(payload.legalContext),
        limitations: toJson(payload.limitations),
        recommendedNextSteps: toJson(payload.recommendedNextSteps),
        version: payload.version ?? 1,
      },
    });
    res.status(201).json({ ok: true, auditId: created.id, audit: created });
  } catch (error) {
    console.error('[createCarbAudit]', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to create CARB audit.' });
  }
}

export async function listCarbAudits(req: Request, res: Response): Promise<void> {
  try {
    const audits = await prismaDb.carbAudit.findMany({
      where: isAdmin(req) ? { deletedAt: null } : { userId: req.dpalUser!.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, facilityName: true, operatorName: true, discrepancyScore: true, riskLevel: true, updatedAt: true },
    });
    res.json({ ok: true, audits });
  } catch (error) {
    console.error('[listCarbAudits]', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to list CARB audits.' });
  }
}

export async function getCarbAudit(req: Request, res: Response): Promise<void> {
  const audit = await findAudit(req, res);
  if (!audit) return;
  res.json({ ok: true, audit });
}

export async function updateCarbAudit(req: Request, res: Response): Promise<void> {
  const payload = parsePayload(req, res);
  if (!payload) return;
  const existing = await findAudit(req, res);
  if (!existing) return;
  try {
    const nextVersion = existing.version + 1;
    const evidencePacket = buildEvidencePacket(existing.id, payload);
    const updated = await prismaDb.carbAudit.update({
      where: { id: existing.id },
      data: {
        ...payload,
        discrepancyScore: payload.discrepancyScore ?? null,
        riskLevel: toRisk(payload.riskLevel),
        dataSources: toJson(payload.dataSources),
        evidencePacket: toJson(payload.evidencePacket ?? evidencePacket),
        legalContext: toJson(payload.legalContext),
        limitations: toJson(payload.limitations),
        recommendedNextSteps: toJson(payload.recommendedNextSteps),
        version: nextVersion,
      },
    });
    res.json({ ok: true, auditId: updated.id, audit: updated });
  } catch (error) {
    console.error('[updateCarbAudit]', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to update CARB audit.' });
  }
}

export async function deleteCarbAudit(req: Request, res: Response): Promise<void> {
  const existing = await findAudit(req, res);
  if (!existing) return;
  await prismaDb.carbAudit.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  res.json({ ok: true, deleted: true });
}

export async function exportCarbAudit(req: Request, res: Response): Promise<void> {
  const parsed = carbAuditExportSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const targetId = parsed.data.id ?? paramId(req);
  if (!targetId) {
    res.status(400).json({ error: 'Validation failed', message: 'Audit id is required.' });
    return;
  }
  const audit = await prismaDb.carbAudit.findUnique({ where: { id: targetId } });
  if (!audit || audit.deletedAt) {
    res.status(404).json({ error: 'Not found', message: 'CARB audit not found.' });
    return;
  }
  if (audit.userId !== req.dpalUser!.id && !isAdmin(req)) {
    res.status(403).json({ error: 'Forbidden', message: 'You may only export your own CARB audits.' });
    return;
  }
  res.json({
    ok: true,
    export: audit.evidencePacket,
    pdfPlaceholder: { status: 'not_implemented', note: 'PDF export placeholder only.' },
  });
}

export async function recalculateCarbAudit(req: Request, res: Response): Promise<void> {
  const existing = await findAudit(req, res);
  if (!existing) return;
  const baseline = Number(existing.baselineEmissions);
  const current = Number(existing.currentEmissions);
  const calculatedReductionPct = baseline > 0 ? ((baseline - current) / baseline) * 100 : 'Needs More Data';
  const updated = await prismaDb.carbAudit.update({
    where: { id: existing.id },
    data: {
      calculatedReductionPct: typeof calculatedReductionPct === 'number' ? calculatedReductionPct : null,
      version: existing.version + 1,
    },
  });
  res.json({ ok: true, auditId: updated.id, audit: updated });
}

export async function linkCarbAudit(req: Request, res: Response): Promise<void> {
  const parsed = carbAuditLinkSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const existing = await findAudit(req, res);
  if (!existing) return;
  const updated = await prismaDb.carbAudit.update({
    where: { id: existing.id },
    data: { ...parsed.data, version: existing.version + 1 },
  });
  res.json({ ok: true, auditId: updated.id, links: parsed.data });
}
