import { randomUUID } from 'crypto';
import type { ProviderRunInput, ProviderRunResult } from './providerAdapters';
import { PROVIDER_RUN_SAFETY } from './providerAdapters';
import { calculateEvidenceConfidence, type EvidenceConfidenceSummary } from './confidenceEngine';
import { normalizeProviderResultsToEvidenceLanes, type EvidenceLane } from './evidenceNormalizer';
import { runProviderAdapters } from './providerAdapterRegistry';
import { getAllBusinessUseCases } from './businessUseCasesBackend';
import { runSourcesForUseCase, type SkippedSource } from './useCaseSourceRunner';

export type EnvironmentalSourceRunRequest = ProviderRunInput & {
  sourceIds?: string[];
  useCaseId?: string;
};

export type EnvironmentalSourceRunResponse = {
  ok: true;
  runId: string;
  requestedSources: string[];
  results: ProviderRunResult[];
  normalizedEvidenceLanes: EvidenceLane[];
  confidence: EvidenceConfidenceSummary;
  safetyLabels: typeof PROVIDER_RUN_SAFETY;
  limitations: string[];
  skippedSources?: SkippedSource[];
};

function uniqueStrings(ids: string[] | undefined): string[] {
  if (!ids?.length) return [];
  return [...new Set(ids.map((s) => String(s).trim()).filter(Boolean))];
}

function collectGlobalLimitations(results: ProviderRunResult[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    for (const lim of r.limitations) {
      const t = lim.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export async function executeEnvironmentalSourceRun(
  body: EnvironmentalSourceRunRequest,
): Promise<EnvironmentalSourceRunResponse> {
  const runId = randomUUID();
  const baseInput: ProviderRunInput = {
    lat: body.lat,
    lng: body.lng,
    radiusKm: body.radiusKm,
    aoiGeoJson: body.aoiGeoJson,
    baselineDate: body.baselineDate,
    currentDate: body.currentDate,
    companyName: body.companyName,
    facilityId: body.facilityId,
    useCaseId: body.useCaseId,
    projectId: body.projectId,
    roomId: body.roomId,
    reportId: body.reportId,
    evidenceRefs: body.evidenceRefs,
  };

  let results: ProviderRunResult[] = [];
  let requestedSources: string[] = [];
  let skipped: SkippedSource[] | undefined;

  if (body.useCaseId?.trim()) {
    const ucId = body.useCaseId.trim();
    const uc = getAllBusinessUseCases().find((u) => u.id === ucId);
    requestedSources = uc ? [...new Set([...uc.requiredSources, ...uc.optionalSources])] : [];
    const ran = await runSourcesForUseCase(ucId, { ...baseInput, useCaseId: ucId });
    results = ran.results;
    skipped = ran.skippedSources.length ? ran.skippedSources : undefined;
  } else {
    requestedSources = uniqueStrings(body.sourceIds);
    results = await runProviderAdapters(requestedSources, baseInput);
  }

  const normalizedEvidenceLanes = normalizeProviderResultsToEvidenceLanes(results);
  const confidence = calculateEvidenceConfidence(results);
  const limitations = collectGlobalLimitations(results);

  return {
    ok: true,
    runId,
    requestedSources,
    results,
    normalizedEvidenceLanes,
    confidence,
    safetyLabels: PROVIDER_RUN_SAFETY,
    limitations,
    skippedSources: skipped,
  };
}
