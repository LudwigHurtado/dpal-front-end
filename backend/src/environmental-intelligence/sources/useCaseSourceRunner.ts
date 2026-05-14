import { getAllBusinessUseCases } from './businessUseCasesBackend';
import { getBackendSourceRegistry, inferCanRunFromStatus } from './sourceRegistry';
import { getProviderAdapter, runProviderAdapter } from './providerAdapterRegistry';
import type { ProviderRunInput, ProviderRunResult } from './providerAdapters';

export type SkippedSource = { sourceId: string; reason: string };

const byId = Object.fromEntries(getBackendSourceRegistry().map((r) => [r.sourceId, r]));

export async function runSourcesForUseCase(
  useCaseId: string,
  input: ProviderRunInput,
): Promise<{ results: ProviderRunResult[]; skippedSources: SkippedSource[] }> {
  const uc = getAllBusinessUseCases().find((u) => u.id === useCaseId);
  if (!uc) {
    return {
      results: [],
      skippedSources: [{ sourceId: '*', reason: `Unknown use case id: ${useCaseId}` }],
    };
  }
  const wanted = [...new Set([...uc.requiredSources, ...uc.optionalSources])];
  const skipped: SkippedSource[] = [];
  const toRun: string[] = [];
  for (const sid of wanted) {
    const row = byId[sid];
    if (!row) {
      skipped.push({ sourceId: sid, reason: 'Not in backend source registry.' });
      continue;
    }
    if (row.status === 'future') {
      skipped.push({ sourceId: sid, reason: 'Future mission — not executed as live provider.' });
      continue;
    }
    if (row.status === 'commercial' || row.status === 'partner_required') {
      skipped.push({ sourceId: sid, reason: 'Commercial or partner source — not run without contract and credentials.' });
      continue;
    }
    if (!inferCanRunFromStatus(row.status)) {
      skipped.push({ sourceId: sid, reason: `Registry status ${row.status} is not runnable.` });
      continue;
    }
    const ad = getProviderAdapter(sid);
    if (!ad || !ad.canRun({ ...input, useCaseId })) {
      skipped.push({ sourceId: sid, reason: 'Adapter missing or required inputs not satisfied for this run.' });
      continue;
    }
    toRun.push(sid);
  }
  const results: ProviderRunResult[] = [];
  for (const sid of toRun) {
    results.push(await runProviderAdapter(sid, { ...input, useCaseId }));
  }
  return { results, skippedSources: skipped };
}
