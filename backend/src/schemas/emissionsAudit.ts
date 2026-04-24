import { z } from 'zod';

const sanitizeText = (value: string): string =>
  value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/[<>]/g, '').trim();

const nonEmptySanitized = z.string().min(1).max(300).transform(sanitizeText);
const optionalSanitized = z.string().max(4000).transform(sanitizeText).optional().nullable();

const coordinateSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

const polygonCoordinateSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);

const polygonGeoJsonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(polygonCoordinateSchema)).min(1),
});

const sourceMetadataSchema = z.object({
  sourceName: nonEmptySanitized,
  sourceUrl: optionalSanitized,
  retrievalDate: nonEmptySanitized,
  datasetVersion: nonEmptySanitized,
  qaFlag: nonEmptySanitized,
  notes: optionalSanitized,
});

const periodSchema = z.object({
  startDate: nonEmptySanitized,
  endDate: nonEmptySanitized,
  label: nonEmptySanitized,
});

const locationSchema = z.object({
  lat: z.number().finite().min(-90).max(90).optional().nullable(),
  lng: z.number().finite().min(-180).max(180).optional().nullable(),
  polygonGeoJSON: polygonGeoJsonSchema.optional().nullable(),
  areaEstimate: z.number().finite().min(0).optional().nullable(),
});

const reportedDataSchema = z.object({
  baselineCO2e: z.number().finite().min(0),
  currentCO2e: z.number().finite().min(0),
  sourceMetadata: sourceMetadataSchema,
});

const satelliteDataSchema = z.object({
  baselineMethaneScore: z.number().finite().min(0),
  currentMethaneScore: z.number().finite().min(0),
  baselineNO2Score: z.number().finite().min(0),
  currentNO2Score: z.number().finite().min(0),
  baselineActivityProxyScore: z.number().finite().min(0).optional(),
  currentActivityProxyScore: z.number().finite().min(0).optional(),
  co2ContextScore: z.number().finite().min(0).max(100).optional(),
  sourceMetadata: sourceMetadataSchema,
});

const productionDataSchema = z.object({
  baselineOutput: z.number().finite().min(0),
  currentOutput: z.number().finite().min(0),
  outputUnit: nonEmptySanitized,
  sourceMetadata: sourceMetadataSchema,
});

export const SUPPORTED_JURISDICTIONS = ['California', 'Arizona', 'New Mexico', 'Federal'] as const;
export const SUPPORTED_INDUSTRIES = [
  'Oil & Gas',
  'Power Plant',
  'Cement',
  'Mining',
  'Manufacturing',
  'Agriculture / AFOLU',
  'Transportation / Logistics',
  'Other',
] as const;

export const emissionsAuditPayloadSchema = z
  .object({
    companyName: nonEmptySanitized,
    facilityName: nonEmptySanitized,
    industry: z.enum(SUPPORTED_INDUSTRIES),
    jurisdiction: z.enum(SUPPORTED_JURISDICTIONS),
    legalFramework: nonEmptySanitized,
    location: locationSchema,
    baselinePeriod: periodSchema,
    currentPeriod: periodSchema,
    reportedData: reportedDataSchema.optional().nullable(),
    satelliteData: satelliteDataSchema.optional().nullable(),
    productionData: productionDataSchema.optional().nullable(),
    confidence: z.object({
      satelliteConfidence: z.number().finite().min(0).max(100),
      regulatoryConfidence: z.number().finite().min(0).max(100),
      weatherQAConfidence: z.number().finite().min(0).max(100),
      overallConfidence: z.number().finite().min(0).max(100).optional(),
    }),
    legalContext: z.array(nonEmptySanitized).default([]),
    limitations: z.array(nonEmptySanitized).default([]),
    recommendedNextSteps: z.array(nonEmptySanitized).default([]),
    linkedReportId: optionalSanitized,
    linkedMissionId: optionalSanitized,
    linkedProjectId: optionalSanitized,
    linkedMRVProjectId: optionalSanitized,
    linkedEvidenceVaultId: optionalSanitized,
    ledgerStatus: nonEmptySanitized.optional(),
    evidencePacket: z.unknown().optional(),
    version: z.number().int().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const hasPoint = typeof value.location.lat === 'number' && typeof value.location.lng === 'number';
    const polygon = value.location.polygonGeoJSON;
    const ring = polygon?.coordinates?.[0] ?? [];
    const hasPolygon = Boolean(polygon) && ring.length >= 4;

    if (!hasPoint && !hasPolygon) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A facility location or polygon boundary is required.',
        path: ['location'],
      });
    }

    if (polygon && ring.length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Polygon boundary must contain at least four coordinates including closure point.',
        path: ['location', 'polygonGeoJSON'],
      });
    }

    if (!value.reportedData && !value.satelliteData && !value.productionData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one data source must be supplied.',
        path: ['reportedData'],
      });
    }

    const baselineStart = new Date(value.baselinePeriod.startDate);
    const baselineEnd = new Date(value.baselinePeriod.endDate);
    const currentStart = new Date(value.currentPeriod.startDate);
    const currentEnd = new Date(value.currentPeriod.endDate);

    if (Number.isNaN(baselineStart.getTime()) || Number.isNaN(baselineEnd.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Baseline period dates are invalid.',
        path: ['baselinePeriod'],
      });
    }

    if (Number.isNaN(currentStart.getTime()) || Number.isNaN(currentEnd.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Current period dates are invalid.',
        path: ['currentPeriod'],
      });
    }

    if (!Number.isNaN(baselineStart.getTime()) && !Number.isNaN(baselineEnd.getTime()) && baselineEnd < baselineStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Baseline period end date must be on or after the start date.',
        path: ['baselinePeriod'],
      });
    }

    if (!Number.isNaN(currentStart.getTime()) && !Number.isNaN(currentEnd.getTime()) && currentEnd < currentStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Current period end date must be on or after the start date.',
        path: ['currentPeriod'],
      });
    }

    if (!Number.isNaN(baselineEnd.getTime()) && !Number.isNaN(currentEnd.getTime()) && currentEnd < baselineEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Current period must not end before the baseline period.',
        path: ['currentPeriod'],
      });
    }
  });

export const emissionsAuditLinkSchema = z.object({
  linkedReportId: optionalSanitized,
  linkedMissionId: optionalSanitized,
  linkedProjectId: optionalSanitized,
  linkedMRVProjectId: optionalSanitized,
  linkedEvidenceVaultId: optionalSanitized,
});

export const emissionsAuditExportSchema = z.object({
  id: nonEmptySanitized.optional(),
  format: z.enum(['json', 'pdf_placeholder', 'evidence_bundle']).default('json'),
});

export type EmissionsAuditPayloadInput = z.infer<typeof emissionsAuditPayloadSchema>;
export type EmissionsAuditLinkInput = z.infer<typeof emissionsAuditLinkSchema>;
export type EmissionsAuditExportInput = z.infer<typeof emissionsAuditExportSchema>;
