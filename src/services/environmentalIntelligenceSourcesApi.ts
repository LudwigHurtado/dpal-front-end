import { apiUrl, API_ROUTES } from '../../constants';

export type EnvironmentalSourceStatusPayload = {
  ok: true;
  allSources: number;
  runnable: number;
  publicRecords: number;
  commercial: number;
  future: number;
  sourcesByCategory: Record<string, unknown[]>;
  useCasesCount: number;
  safetyRules: { rules: string[]; blocksAutomaticClaims: string[] };
};

export type EnvironmentalUseCasesPayload = {
  ok: true;
  useCases: Array<{
    id: string;
    name: string;
    description: string;
    requiredSources: string[];
    optionalSources: string[];
    validationRequired: boolean;
    safetyLanguage: string;
  }>;
};

export async function fetchEnvironmentalSourceStatus(): Promise<EnvironmentalSourceStatusPayload | null> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_SOURCES_STATUS));
    if (!res.ok) return null;
    const j = (await res.json()) as EnvironmentalSourceStatusPayload;
    return j?.ok ? j : null;
  } catch {
    return null;
  }
}

export async function fetchEnvironmentalUseCases(): Promise<EnvironmentalUseCasesPayload | null> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_SOURCES_USE_CASES));
    if (!res.ok) return null;
    const j = (await res.json()) as EnvironmentalUseCasesPayload;
    return j?.ok ? j : null;
  } catch {
    return null;
  }
}

export type EnvironmentalSourceRunPayload = {
  sourceIds?: string[];
  useCaseId?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  aoiGeoJson?: unknown;
  baselineDate?: string;
  currentDate?: string;
  companyName?: string;
  facilityId?: string;
  projectId?: string;
  roomId?: string;
  reportId?: string;
  evidenceRefs?: unknown[];
};

export type EnvironmentalSkippedSource = { sourceId: string; reason: string };

export type EnvironmentalProviderSignal = {
  key: string;
  label: string;
  value: string | number | boolean | null;
  unit?: string;
  confidence?: string;
};

export type EnvironmentalProviderEvidenceRef = {
  type: string;
  label: string;
  url?: string;
  hash?: string;
  metadata?: Record<string, unknown>;
};

export type EnvironmentalSourceRunResultRow = {
  sourceId: string;
  status: string;
  signals: EnvironmentalProviderSignal[];
  evidenceRefs?: EnvironmentalProviderEvidenceRef[];
  limitations: string[];
  safetyLabels: { pending_verification: boolean; human_verified: boolean; blockchain_anchored: boolean };
};

export type EnvironmentalEvidenceLane = {
  id: string;
  sourceId: string;
  label: string;
  status: string;
  detail?: string;
  signals: EnvironmentalProviderSignal[];
  evidenceRefs?: EnvironmentalProviderEvidenceRef[];
  limitations: string[];
  safetyLabels: EnvironmentalSourceRunResultRow['safetyLabels'];
};

export type EnvironmentalSourceRunResponse = {
  ok: true;
  runId: string;
  requestedSources: string[];
  results: EnvironmentalSourceRunResultRow[];
  normalizedEvidenceLanes: EnvironmentalEvidenceLane[];
  confidence: {
    overall: string;
    rationale: string[];
    pendingVerification: boolean;
  };
  safetyLabels: { pending_verification: boolean; human_verified: boolean; blockchain_anchored: boolean };
  limitations: string[];
  skippedSources?: EnvironmentalSkippedSource[];
};

export async function runEnvironmentalSources(
  payload: EnvironmentalSourceRunPayload,
): Promise<EnvironmentalSourceRunResponse | null> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_SOURCES_RUN), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as EnvironmentalSourceRunResponse;
    return j?.ok ? j : null;
  } catch {
    return null;
  }
}
