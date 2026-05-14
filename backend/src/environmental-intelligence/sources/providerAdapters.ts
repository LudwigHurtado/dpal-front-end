import type { BackendSourceRecord, SourceStatus } from './sourceTypes';

export interface ProviderRunInput {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  aoiGeoJson?: unknown;
  baselineDate?: string;
  currentDate?: string;
  companyName?: string;
  facilityId?: string;
  useCaseId?: string;
  projectId?: string;
  roomId?: string;
  reportId?: string;
  /** QR / artifact references when running QR_EVIDENCE */
  evidenceRefs?: unknown[];
}

export type ProviderRunStatus =
  | 'success'
  | 'partial'
  | 'unavailable'
  | 'not_configured'
  | 'future'
  | 'commercial_required'
  | 'error';

export interface ProviderRunResult {
  sourceId: string;
  status: ProviderRunStatus;
  signals: Array<{
    key: string;
    label: string;
    value: string | number | boolean | null;
    unit?: string;
    confidence?: 'low' | 'medium' | 'high' | 'requires_validation';
  }>;
  evidenceRefs?: Array<{
    type: string;
    label: string;
    url?: string;
    hash?: string;
    metadata?: Record<string, unknown>;
  }>;
  limitations: string[];
  safetyLabels: {
    pending_verification: boolean;
    human_verified: boolean;
    blockchain_anchored: boolean;
  };
}

export interface ProviderAdapter {
  sourceId: string;
  canRun(input: ProviderRunInput): boolean;
  run(input: ProviderRunInput): Promise<ProviderRunResult>;
}

export const PROVIDER_RUN_SAFETY = {
  pending_verification: true as const,
  human_verified: false as const,
  blockchain_anchored: false as const,
};

export function statusFromRegistryStatus(st: SourceStatus): ProviderRunStatus {
  if (st === 'future') return 'future';
  if (st === 'commercial') return 'commercial_required';
  if (st === 'partner_required') return 'commercial_required';
  if (st === 'not_configured') return 'not_configured';
  if (st === 'unavailable') return 'unavailable';
  return 'unavailable';
}

export function hasGeo(input: ProviderRunInput): boolean {
  return typeof input.lat === 'number' && typeof input.lng === 'number' && Number.isFinite(input.lat) && Number.isFinite(input.lng);
}

/** Fallback stub for registry sources without a Phase-4 live adapter yet. */
export function createStubProviderAdapter(row: BackendSourceRecord): ProviderAdapter {
  const sourceId = row.sourceId;
  const canRun = (input: ProviderRunInput): boolean => {
    if (row.status === 'future' || row.status === 'commercial' || row.status === 'partner_required') return false;
    if (row.status === 'not_configured' || row.status === 'unavailable') return false;
    const disclosure = ['COMPANY_DISCLOSURE', 'ESG_REPORT', 'REGULATORY_FILING'];
    if (disclosure.includes(sourceId)) {
      return Boolean((input.companyName && input.companyName.trim()) || (input.facilityId && String(input.facilityId).trim()));
    }
    if (sourceId === 'EPA_DATASET' || sourceId === 'CARB_DATASET') {
      return hasGeo(input) || Boolean(input.facilityId && String(input.facilityId).trim());
    }
    return hasGeo(input);
  };

  return {
    sourceId,
    canRun,
    async run(input: ProviderRunInput) {
      if (row.status === 'future') {
        return { sourceId, status: 'future', signals: [], limitations: row.limitations, safetyLabels: PROVIDER_RUN_SAFETY };
      }
      if (row.status === 'commercial' || row.status === 'partner_required') {
        return {
          sourceId,
          status: 'commercial_required',
          signals: [],
          limitations: row.limitations,
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
      if (row.status === 'not_configured' || row.status === 'unavailable') {
        return {
          sourceId,
          status: statusFromRegistryStatus(row.status),
          signals: [],
          limitations: row.limitations,
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
      if (!canRun(input)) {
        return {
          sourceId,
          status: 'unavailable',
          signals: [],
          limitations: [...row.limitations, 'Required inputs missing for this source (e.g., coordinates or company id).'],
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
      return {
        sourceId,
        status: 'partial',
        signals: row.signals.map((k) => ({
          key: k,
          label: k,
          value: null,
          confidence: 'requires_validation' as const,
        })),
        evidenceRefs: [
          {
            type: 'registry_lane',
            label: `${row.name} — stub adapter (no live Phase-4 module)`,
            metadata: { category: row.category, useCaseId: input.useCaseId ?? null },
          },
        ],
        limitations: [
          ...row.limitations,
          'No dedicated live provider adapter is registered for this source yet.',
        ],
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    },
  };
}
