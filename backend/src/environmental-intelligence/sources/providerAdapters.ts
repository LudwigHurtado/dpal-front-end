import { getBackendSourceRegistry, inferCanRunFromStatus } from './sourceRegistry';
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

const SAFETY = {
  pending_verification: true as const,
  human_verified: false as const,
  blockchain_anchored: false as const,
};

function statusFromRegistry(st: SourceStatus): ProviderRunStatus {
  if (st === 'future') return 'future';
  if (st === 'commercial') return 'commercial_required';
  if (st === 'partner_required') return 'commercial_required';
  if (st === 'not_configured') return 'not_configured';
  if (st === 'unavailable') return 'unavailable';
  return 'unavailable';
}

function hasGeo(input: ProviderRunInput): boolean {
  return typeof input.lat === 'number' && typeof input.lng === 'number' && Number.isFinite(input.lat) && Number.isFinite(input.lng);
}

function buildAdapterForSource(row: BackendSourceRecord): ProviderAdapter {
  const sourceId = row.sourceId;

  const canRun = (input: ProviderRunInput): boolean => {
    if (!inferCanRunFromStatus(row.status)) return false;
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
        return {
          sourceId,
          status: 'future',
          signals: [],
          limitations: row.limitations,
          safetyLabels: SAFETY,
        };
      }
      if (row.status === 'commercial' || row.status === 'partner_required') {
        return {
          sourceId,
          status: 'commercial_required',
          signals: [],
          limitations: row.limitations,
          safetyLabels: SAFETY,
        };
      }
      if (row.status === 'not_configured' || row.status === 'unavailable') {
        return {
          sourceId,
          status: statusFromRegistry(row.status),
          signals: [],
          limitations: row.limitations,
          safetyLabels: SAFETY,
        };
      }
      if (!canRun(input)) {
        return {
          sourceId,
          status: 'unavailable',
          signals: [],
          limitations: [...row.limitations, 'Required inputs missing for this source (e.g., coordinates or company id).'],
          safetyLabels: SAFETY,
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
            label: `${row.name} — adapter stub (orchestration wiring pending)`,
            metadata: { category: row.category, useCaseId: input.useCaseId ?? null },
          },
        ],
        limitations: [
          ...row.limitations,
          'Provider execution layer returns structured placeholder until live adapter routes are connected.',
        ],
        safetyLabels: SAFETY,
      };
    },
  };
}

const registry = getBackendSourceRegistry();
export const providerAdaptersBySourceId: Readonly<Record<string, ProviderAdapter>> = Object.fromEntries(
  registry.map((s) => [s.sourceId, buildAdapterForSource(s)]),
);

export function listProviderAdapters(): ProviderAdapter[] {
  return registry.map((s) => providerAdaptersBySourceId[s.sourceId]);
}

export async function runProviderStub(sourceId: string, input: ProviderRunInput): Promise<ProviderRunResult> {
  const ad = providerAdaptersBySourceId[sourceId];
  if (!ad) {
    return {
      sourceId,
      status: 'error',
      signals: [],
      limitations: ['No adapter registered for sourceId.'],
      safetyLabels: SAFETY,
    };
  }
  return ad.run(input);
}
