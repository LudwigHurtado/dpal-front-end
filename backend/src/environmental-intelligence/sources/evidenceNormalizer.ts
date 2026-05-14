import type { ProviderRunResult, ProviderRunStatus } from './providerAdapters';

/** One normalized lane per provider run — shared contract for Command Center and downstream modules. */
export type EvidenceLane = {
  id: string;
  sourceId: string;
  label: string;
  status: ProviderRunStatus;
  detail?: string;
  signals: ProviderRunResult['signals'];
  evidenceRefs?: ProviderRunResult['evidenceRefs'];
  limitations: string[];
  safetyLabels: ProviderRunResult['safetyLabels'];
};

export function normalizeProviderResultToEvidenceLane(result: ProviderRunResult): EvidenceLane {
  return {
    id: `lane-${result.sourceId}`,
    sourceId: result.sourceId,
    label: `${result.sourceId} · ${result.status}`,
    status: result.status,
    detail: result.limitations.length ? result.limitations.join(' | ') : undefined,
    signals: result.signals,
    evidenceRefs: result.evidenceRefs,
    limitations: result.limitations,
    safetyLabels: result.safetyLabels,
  };
}

export function normalizeProviderResultsToEvidenceLanes(results: ProviderRunResult[]): EvidenceLane[] {
  return results.map(normalizeProviderResultToEvidenceLane);
}
