import { z } from 'zod';

const sanitizeText = (value: string): string => value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/[<>]/g, '').trim();
const requiredText = z.string().min(1).max(300).transform(sanitizeText);
const optionalText = z.string().max(4000).transform(sanitizeText).optional().nullable();

export const hazardousWasteAuditPayloadSchema = z.object({
  epaId: requiredText,
  facilityName: requiredText,
  operatorName: requiredText,
  address: requiredText,
  city: requiredText,
  county: requiredText,
  state: requiredText,
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  naicsCode: requiredText,
  generatorStatus: z.enum(['LQG', 'SQG', 'VSQG', 'TSDF', 'Transporter', 'Unknown']),
  permitStatus: requiredText,
  complianceStatus: requiredText,
  correctiveActionStatus: requiredText,
  baselineYear: z.number().int().min(1990).max(2100),
  currentYear: z.number().int().min(1990).max(2100),
  baselineHazardousWasteTons: z.number().finite().min(0),
  currentHazardousWasteTons: z.number().finite().min(0),
  baselineManifestCount: z.number().finite().min(0),
  currentManifestCount: z.number().finite().min(0),
  violationsCount: z.number().finite().min(0).default(0),
  enforcementActionsCount: z.number().finite().min(0).default(0),
  complianceRiskScore: z.number().finite().min(0).max(100).nullable().optional(),
  activityDiscrepancy: optionalText,
  claimText: optionalText,
  claimReductionPct: z.number().finite().optional().nullable(),
  claimGap: z.number().finite().optional().nullable(),
  claimAnalysis: requiredText,
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Needs More Data']),
  sourceMode: z.enum(['LIVE', 'IMPORTED', 'DEMO_FALLBACK']).default('IMPORTED'),
  verificationSummary: z.record(z.string(), z.unknown()).default({}),
  dataSources: z.array(z.record(z.string(), z.unknown())).default([]),
  evidencePacket: z.record(z.string(), z.unknown()).optional(),
  limitations: z.array(requiredText).default([]),
  recommendedNextSteps: z.array(requiredText).default([]),
  linkedMRVProjectId: optionalText,
  linkedEvidenceVaultId: optionalText,
  linkedReportId: optionalText,
  version: z.number().int().min(1).optional(),
});

export const hazardousWasteAuditExportSchema = z.object({
  id: requiredText.optional(),
  format: z.enum(['json', 'pdf_placeholder', 'evidence_bundle']).default('json'),
});

export const hazardousWasteAuditLinkSchema = z.object({
  linkedMRVProjectId: optionalText,
  linkedEvidenceVaultId: optionalText,
  linkedReportId: optionalText,
});

export type HazardousWasteAuditPayloadInput = z.infer<typeof hazardousWasteAuditPayloadSchema>;
