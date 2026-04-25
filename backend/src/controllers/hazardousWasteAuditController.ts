import type { Request, Response } from 'express';
import { Prisma, DpalUserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { paramId } from '../lib/routeParams';
import {
  hazardousWasteAuditExportSchema,
  hazardousWasteAuditLinkSchema,
  hazardousWasteAuditPayloadSchema,
  type HazardousWasteAuditPayloadInput,
} from '../schemas/hazardousWasteAudit';
import { getRcraImportMeta, importRcraDataset, searchRcraFacilityRecords } from '../services/rcraDataService';

const prismaDb = prisma as any;
const toJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;
const memoryAudits = new Map<string, any>();
const debugLog = (message: string, payload?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[haz-waste-audit] ${message}`, payload ?? '');
  }
};

const isAdmin = (req: Request) => req.dpalUser?.role === DpalUserRole.admin;
const toRisk = (value: string): 'low' | 'medium' | 'high' | 'needs_more_data' => {
  if (value === 'High') return 'high';
  if (value === 'Medium') return 'medium';
  if (value === 'Needs More Data') return 'needs_more_data';
  return 'low';
};

function parsePayload(req: Request, res: Response): HazardousWasteAuditPayloadInput | null {
  const parsed = hazardousWasteAuditPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return null;
  }
  return parsed.data;
}

async function findAudit(req: Request, res: Response): Promise<any | null> {
  const id = paramId(req);
  const memory = memoryAudits.get(id);
  if (memory) {
    if (memory.userId !== req.dpalUser!.id && !isAdmin(req)) {
      res.status(403).json({ error: 'Forbidden', message: 'You may only access your own hazardous waste audits.' });
      return null;
    }
    return memory;
  }
  if (!prismaDb.hazardousWasteAudit) {
    res.status(404).json({ error: 'Not found', message: 'Hazardous waste audit not found.' });
    return null;
  }
  const audit = await prismaDb.hazardousWasteAudit.findUnique({ where: { id } });
  if (!audit || audit.deletedAt) {
    res.status(404).json({ error: 'Not found', message: 'Hazardous waste audit not found.' });
    return null;
  }
  if (audit.userId !== req.dpalUser!.id && !isAdmin(req)) {
    res.status(403).json({ error: 'Forbidden', message: 'You may only access your own hazardous waste audits.' });
    return null;
  }
  return audit;
}

function buildEvidencePacket(auditId: string, payload: HazardousWasteAuditPayloadInput) {
  return {
    hazardousWasteIntegrity: {
      facilityIdentity: {
        epaId: payload.epaId,
        facilityName: payload.facilityName,
        operatorName: payload.operatorName,
        address: payload.address,
        city: payload.city,
        county: payload.county,
        state: payload.state,
      },
      reportingComparison: {
        baselineYear: payload.baselineYear,
        currentYear: payload.currentYear,
        baselineHazardousWasteTons: payload.baselineHazardousWasteTons,
        currentHazardousWasteTons: payload.currentHazardousWasteTons,
        baselineManifestCount: payload.baselineManifestCount,
        currentManifestCount: payload.currentManifestCount,
      },
      complianceSummary: {
        permitStatus: payload.permitStatus,
        complianceStatus: payload.complianceStatus,
        correctiveActionStatus: payload.correctiveActionStatus,
        violationsCount: payload.violationsCount,
        enforcementActionsCount: payload.enforcementActionsCount,
      },
      activityIndicators: {
        activityDiscrepancy: payload.activityDiscrepancy,
      },
      discrepancyScore: payload.complianceRiskScore,
      riskLevel: payload.riskLevel,
      claimAnalysis: payload.claimAnalysis,
      sourceMode: payload.sourceMode,
      dataSources: payload.dataSources,
      limitations: payload.limitations,
      recommendedNextSteps: payload.recommendedNextSteps,
      generatedAt: new Date().toISOString(),
      dpalLedgerPlaceholder: { status: 'not_connected' },
      checksumPlaceholder: 'pending-checksum',
    },
    auditId,
    module: 'Hazardous Waste Integrity Audit',
    generatedAt: new Date().toISOString(),
  };
}

function toDbData(auditId: string, userId: string, payload: HazardousWasteAuditPayloadInput, existingVersion?: number) {
  const evidencePacket = payload.evidencePacket ?? buildEvidencePacket(auditId, payload);
  const wasteChangePct =
    payload.baselineHazardousWasteTons > 0
      ? ((payload.baselineHazardousWasteTons - payload.currentHazardousWasteTons) / payload.baselineHazardousWasteTons) * 100
      : null;
  const manifestChangePct =
    payload.baselineManifestCount > 0
      ? ((payload.baselineManifestCount - payload.currentManifestCount) / payload.baselineManifestCount) * 100
      : null;
  const dbData = {
    id: auditId,
    userId,
    epaId: payload.epaId,
    facilityName: payload.facilityName,
    operatorName: payload.operatorName,
    city: payload.city,
    county: payload.county,
    state: payload.state,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    generatorStatus: payload.generatorStatus,
    permitStatus: payload.permitStatus,
    complianceStatus: payload.complianceStatus,
    correctiveActionStatus: payload.correctiveActionStatus,
    baselineYear: payload.baselineYear,
    currentYear: payload.currentYear,
    baselineHazardousWasteTons: payload.baselineHazardousWasteTons,
    currentHazardousWasteTons: payload.currentHazardousWasteTons,
    baselineManifestCount: payload.baselineManifestCount,
    currentManifestCount: payload.currentManifestCount,
    violationsCount: payload.violationsCount,
    enforcementActionsCount: payload.enforcementActionsCount,
    wasteChangePct,
    manifestChangePct,
    complianceRiskScore: payload.complianceRiskScore ?? null,
    integrityScore: payload.complianceRiskScore ?? null,
    riskLevel: toRisk(payload.riskLevel),
    claimText: payload.claimText ?? null,
    claimAnalysisJson: toJson({
      claimText: payload.claimText ?? null,
      claimReductionPct: payload.claimReductionPct ?? null,
      claimGap: payload.claimGap ?? null,
      classification: payload.claimAnalysis,
    }),
    verificationSummaryJson: toJson(payload.verificationSummary),
    netCarbonRealityJson: toJson({
      activityDiscrepancy: payload.activityDiscrepancy ?? null,
      limitations: payload.limitations,
      recommendedNextSteps: payload.recommendedNextSteps,
    }),
    evidencePacketJson: toJson(evidencePacket),
    sourceMode: payload.sourceMode,
    dataSourcesJson: toJson(payload.dataSources),
    linkedMRVProjectId: payload.linkedMRVProjectId ?? null,
    linkedEvidenceVaultId: payload.linkedEvidenceVaultId ?? null,
    linkedReportId: payload.linkedReportId ?? null,
    version: existingVersion ? existingVersion + 1 : payload.version ?? 1,
    deletedAt: null,
    updatedAt: new Date(),
  };
  debugLog('evidence packet saved', { auditId, sourceMode: payload.sourceMode });
  return dbData;
}

export async function getRcraDataHealth(_req: Request, res: Response): Promise<void> {
  res.json({ ok: true, module: 'rcra-data' });
}

export async function searchRcraData(req: Request, res: Response): Promise<void> {
  const result = await searchRcraFacilityRecords({
    q: String(req.query.q ?? ''),
    epaId: String(req.query.epaId ?? ''),
    facilityName: String(req.query.facilityName ?? ''),
    parentCompany: String(req.query.parentCompany ?? ''),
    frsId: String(req.query.frsId ?? ''),
    city: String(req.query.city ?? ''),
    county: String(req.query.county ?? ''),
    state: String(req.query.state ?? ''),
    zip: String(req.query.zip ?? ''),
    generatorStatus: String(req.query.generatorStatus ?? ''),
    permitStatus: String(req.query.permitStatus ?? ''),
    reportingYear: Number(req.query.reportingYear || 0) || undefined,
    naicsCode: String(req.query.naicsCode ?? ''),
    limit: Number(req.query.limit || 50) || 50,
  });
  const meta = getRcraImportMeta();
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

export async function importRcraData(req: Request, res: Response): Promise<void> {
  const imported = await importRcraDataset({
    records: Array.isArray(req.body?.records) ? req.body.records : undefined,
    csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
    jsonText: typeof req.body?.jsonText === 'string' ? req.body.jsonText : undefined,
    datasetVersion: typeof req.body?.datasetVersion === 'string' ? req.body.datasetVersion : undefined,
    sourceUrl: typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl : undefined,
    dataType: typeof req.body?.dataType === 'string' ? req.body.dataType : undefined,
  });
  res.status(201).json({ ok: true, imported: imported.imported, warnings: imported.warnings, sourceMode: imported.imported > 0 ? 'IMPORTED' : 'DEMO_FALLBACK' });
}

export async function createHazardousWasteAudit(req: Request, res: Response): Promise<void> {
  const payload = parsePayload(req, res);
  if (!payload) return;
  const auditId = `RCRA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const data = toDbData(auditId, req.dpalUser!.id, payload);
  if (prismaDb.hazardousWasteAudit) {
    const created = await prismaDb.hazardousWasteAudit.create({ data });
    res.status(201).json({ ok: true, auditId: created.id, audit: created });
    return;
  }
  memoryAudits.set(auditId, data);
  res.status(201).json({ ok: true, auditId, audit: data });
}

export async function listHazardousWasteAudits(req: Request, res: Response): Promise<void> {
  if (prismaDb.hazardousWasteAudit) {
    const audits = await prismaDb.hazardousWasteAudit.findMany({
      where: isAdmin(req) ? { deletedAt: null } : { userId: req.dpalUser!.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ ok: true, audits });
    return;
  }
  const audits = Array.from(memoryAudits.values()).filter((a) => !a.deletedAt && (isAdmin(req) || a.userId === req.dpalUser!.id));
  res.json({ ok: true, audits });
}

export async function getHazardousWasteAudit(req: Request, res: Response): Promise<void> {
  const audit = await findAudit(req, res);
  if (!audit) return;
  res.json({ ok: true, audit });
}

export async function updateHazardousWasteAudit(req: Request, res: Response): Promise<void> {
  const payload = parsePayload(req, res);
  if (!payload) return;
  const existing = await findAudit(req, res);
  if (!existing) return;
  const next = toDbData(existing.id, existing.userId, payload, existing.version ?? 1);
  if (prismaDb.hazardousWasteAudit) {
    const updated = await prismaDb.hazardousWasteAudit.update({ where: { id: existing.id }, data: next });
    res.json({ ok: true, auditId: updated.id, audit: updated });
    return;
  }
  memoryAudits.set(existing.id, next);
  res.json({ ok: true, auditId: existing.id, audit: next });
}

export async function deleteHazardousWasteAudit(req: Request, res: Response): Promise<void> {
  const existing = await findAudit(req, res);
  if (!existing) return;
  if (prismaDb.hazardousWasteAudit) {
    await prismaDb.hazardousWasteAudit.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  } else {
    memoryAudits.set(existing.id, { ...existing, deletedAt: new Date(), updatedAt: new Date() });
  }
  res.json({ ok: true, deleted: true });
}

export async function exportHazardousWasteAudit(req: Request, res: Response): Promise<void> {
  const parsed = hazardousWasteAuditExportSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const id = parsed.data.id ?? paramId(req);
  debugLog('evidence packet export requested', { auditId: id });
  const memory = memoryAudits.get(id);
  if (memory) {
    if (memory.userId !== req.dpalUser!.id && !isAdmin(req)) {
      res.status(403).json({ error: 'Forbidden', message: 'You may only export your own hazardous waste audits.' });
      return;
    }
    res.json({ ok: true, export: memory.evidencePacketJson ?? memory.evidencePacket, pdfPlaceholder: { status: 'not_implemented' } });
    return;
  }
  if (!prismaDb.hazardousWasteAudit) {
    res.status(404).json({ error: 'Not found', message: 'Hazardous waste audit not found.' });
    return;
  }
  const audit = await prismaDb.hazardousWasteAudit.findUnique({ where: { id } });
  if (!audit) return;
  res.json({ ok: true, export: audit.evidencePacketJson, pdfPlaceholder: { status: 'not_implemented' } });
}

export async function recalculateHazardousWasteAudit(req: Request, res: Response): Promise<void> {
  const existing = await findAudit(req, res);
  if (!existing) return;
  const baseline = Number(existing.baselineHazardousWasteTons);
  const current = Number(existing.currentHazardousWasteTons);
  const manifestBaseline = Number(existing.baselineManifestCount);
  const manifestCurrent = Number(existing.currentManifestCount);
  const wasteChange = baseline > 0 ? ((baseline - current) / baseline) * 100 : 0;
  const manifestChange = manifestBaseline > 0 ? ((manifestBaseline - manifestCurrent) / manifestBaseline) * 100 : 0;
  const discrepancy = Math.abs(wasteChange - manifestChange);
  const score = Math.min(100, Math.max(0, Math.round(discrepancy + Number(existing.violationsCount || 0) * 6 + Number(existing.enforcementActionsCount || 0) * 8)));
  const riskLevel = score <= 25 ? 'Low' : score <= 60 ? 'Medium' : 'High';
  const previousPacketHistory = existing.evidencePacketJson?.packetHistory ?? {};
  const previousEvents = Array.isArray(previousPacketHistory.events) ? previousPacketHistory.events : [];
  const packetHistory = {
    status: 'Regenerated',
    source: 'Recalculation API',
    lastGeneratedAt: new Date().toISOString(),
    lastSavedAt: previousPacketHistory.lastSavedAt ?? null,
    lastExportedAt: previousPacketHistory.lastExportedAt ?? null,
    auditId: existing.id,
    version: (existing.version ?? 1) + 1,
    events: [
      {
        action: 'Recalculated',
        timestamp: new Date().toISOString(),
        source: 'Recalculation API',
        auditId: existing.id,
      },
      ...previousEvents,
    ].slice(0, 3),
  };
  const regeneratedEvidencePacket = {
    packetHistory,
    hazardousWasteIntegrity: {
      facilityIdentity: {
        epaId: existing.epaId,
        facilityName: existing.facilityName,
        operatorName: existing.operatorName,
        city: existing.city,
        county: existing.county,
        state: existing.state,
      },
      reportingComparison: {
        baselineYear: existing.baselineYear,
        currentYear: existing.currentYear,
        baselineHazardousWasteTons: existing.baselineHazardousWasteTons,
        currentHazardousWasteTons: existing.currentHazardousWasteTons,
        baselineManifestCount: existing.baselineManifestCount,
        currentManifestCount: existing.currentManifestCount,
        wasteChangePct: wasteChange,
        manifestChangePct: manifestChange,
      },
      complianceSummary: {
        permitStatus: existing.permitStatus,
        complianceStatus: existing.complianceStatus,
        correctiveActionStatus: existing.correctiveActionStatus,
        violationsCount: existing.violationsCount,
        enforcementActionsCount: existing.enforcementActionsCount,
      },
      activityIndicators: {
        activityDiscrepancy: existing.activityDiscrepancy ?? null,
      },
      integrityScore: score,
      riskLevel,
      claimAnalysis: existing.claimAnalysisJson ?? null,
      verificationSummary: existing.verificationSummaryJson ?? null,
      sourceMode: existing.sourceMode,
      dataSources: existing.dataSourcesJson ?? [],
      limitations: existing.netCarbonRealityJson?.limitations ?? [],
      recommendedNextSteps: existing.netCarbonRealityJson?.recommendedNextSteps ?? [],
      packetHistory,
      generatedAt: new Date().toISOString(),
      dpalLedgerPlaceholder: { status: 'not_connected' },
      checksumPlaceholder: 'pending-checksum',
    },
    auditId: existing.id,
    module: 'Hazardous Waste Integrity Audit',
    generatedAt: new Date().toISOString(),
  };
  const updated = {
    ...existing,
    complianceRiskScore: score,
    integrityScore: score,
    wasteChangePct: wasteChange,
    manifestChangePct: manifestChange,
    riskLevel: toRisk(riskLevel),
    evidencePacketJson: regeneratedEvidencePacket,
    version: (existing.version ?? 1) + 1,
    updatedAt: new Date(),
  };
  debugLog('evidence packet generated', { auditId: existing.id, event: 'recalculate' });
  if (prismaDb.hazardousWasteAudit) {
    const dbUpdated = await prismaDb.hazardousWasteAudit.update({ where: { id: existing.id }, data: updated });
    res.json({ ok: true, auditId: dbUpdated.id, audit: dbUpdated });
    return;
  }
  memoryAudits.set(existing.id, updated);
  res.json({ ok: true, auditId: existing.id, audit: updated });
}

export async function linkHazardousWasteAudit(req: Request, res: Response): Promise<void> {
  const parsed = hazardousWasteAuditLinkSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const existing = await findAudit(req, res);
  if (!existing) return;
  const next = { ...existing, ...parsed.data, version: (existing.version ?? 1) + 1, updatedAt: new Date() };
  if (prismaDb.hazardousWasteAudit) {
    const updated = await prismaDb.hazardousWasteAudit.update({ where: { id: existing.id }, data: next });
    res.json({ ok: true, auditId: updated.id, links: parsed.data });
    return;
  }
  memoryAudits.set(existing.id, next);
  res.json({ ok: true, auditId: existing.id, links: parsed.data });
}
