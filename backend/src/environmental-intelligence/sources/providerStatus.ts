import { getAllBusinessUseCases } from './businessUseCasesBackend';
import { getBackendSourceRegistry, inferCanRunFromStatus } from './sourceRegistry';
import type { BackendSourceRecord, SourceCategory } from './sourceTypes';
import { getSafetyRulesSummary } from './safetyRules';

export function buildSourcesStatusPayload() {
  const sources = getBackendSourceRegistry();
  const useCases = getAllBusinessUseCases();
  const runnable = sources.filter((s) => inferCanRunFromStatus(s.status)).length;
  const publicRecords = sources.filter((s) => s.status === 'public_record').length;
  const commercial = sources.filter((s) => s.status === 'commercial' || s.status === 'partner_required').length;
  const future = sources.filter((s) => s.status === 'future').length;
  const byCategory = {} as Record<SourceCategory, BackendSourceRecord[]>;
  for (const s of sources) {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category]!.push(s);
  }
  return {
    ok: true as const,
    allSources: sources.length,
    runnable,
    publicRecords,
    commercial,
    future,
    sourcesByCategory: byCategory,
    useCasesCount: useCases.length,
    safetyRules: getSafetyRulesSummary(),
  };
}
