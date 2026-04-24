import { z } from 'zod';

const sanitizeText = (value: string): string =>
  value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/[<>]/g, '').trim();

const requiredText = z.string().min(1).max(300).transform(sanitizeText);
const optionalText = z.string().max(4000).transform(sanitizeText).optional().nullable();

export const carbSourceStatusSchema = z.enum([
  'LIVE VERIFIED',
  'CARB PUBLIC DATA',
  'IMPORTED DATASET',
  'DEMO DATA',
  'MISSING',
  'NEEDS REVIEW',
]);

export const carbAuditPayloadSchema = z.object({
  facilityId: requiredText,
  facilityName: requiredText,
  operatorName: requiredText,
  city: requiredText,
  county: requiredText,
  state: requiredText.default('California'),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  sector: requiredText,
  baselineYear: z.number().int().min(1990).max(2100),
  currentYear: z.number().int().min(1990).max(2100),
  baselineEmissions: z.number().finite().min(0),
  currentEmissions: z.number().finite().min(0),
  methaneBaseline: z.number().finite().min(0).default(0),
  methaneCurrent: z.number().finite().min(0).default(0),
  n2oBaseline: z.number().finite().min(0).default(0),
  n2oCurrent: z.number().finite().min(0).default(0),
  co2Baseline: z.number().finite().min(0).default(0),
  co2Current: z.number().finite().min(0).default(0),
  calculatedReductionPct: z.union([z.number().finite(), z.string()]),
  companyClaimText: optionalText,
  claimReductionPct: z.number().finite().optional().nullable(),
  claimGap: z.number().finite().optional().nullable(),
  discrepancyScore: z.number().finite().min(0).max(100).optional().nullable(),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Needs More Data']),
  verificationStatus: requiredText,
  dataSources: z.array(z.record(z.string(), z.unknown())).default([]),
  evidencePacket: z.record(z.string(), z.unknown()).optional(),
  legalContext: z.array(requiredText).default([]),
  limitations: z.array(requiredText).default([]),
  recommendedNextSteps: z.array(requiredText).default([]),
  linkedMRVProjectId: optionalText,
  linkedEvidenceVaultId: optionalText,
  linkedReportId: optionalText,
  version: z.number().int().min(1).optional(),
});

export const carbAuditExportSchema = z.object({
  id: requiredText.optional(),
  format: z.enum(['json', 'pdf_placeholder', 'evidence_bundle']).default('json'),
});

export const carbAuditLinkSchema = z.object({
  linkedMRVProjectId: optionalText,
  linkedEvidenceVaultId: optionalText,
  linkedReportId: optionalText,
});

export type CarbAuditPayloadInput = z.infer<typeof carbAuditPayloadSchema>;
