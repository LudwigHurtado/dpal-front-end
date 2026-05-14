import { businessUseCaseById, businessUseCaseMap } from './businessUseCaseMap';
import type { SourceCategory, SourceStatus } from './sourceTypes';
import { dpalSourceRegistry } from './dpalSourceRegistry';

const ALL_CATEGORIES: SourceCategory[] = [
  'ocean_water',
  'forest_carbon',
  'atmosphere_emissions',
  'heat_land',
  'ground_truth_public_records',
  'commercial_partner',
  'future_mission',
];

const RUNNABLE_STATUSES: ReadonlySet<SourceStatus> = new Set(['live', 'public_record', 'historical']);

export type SourceStatusSummary = {
  allSources: number;
  runnable: number;
  publicRecords: number;
  commercial: number;
  future: number;
  partnerRequired: number;
  notConfigured: number;
  unavailable: number;
  byCategory: Record<SourceCategory, number>;
};

export function getSourceStatusSummary(): SourceStatusSummary {
  const byCategory = {} as Record<SourceCategory, number>;
  for (const c of ALL_CATEGORIES) {
    byCategory[c] = 0;
  }
  for (const s of dpalSourceRegistry) {
    byCategory[s.category] += 1;
  }
  let runnable = 0;
  let publicRecords = 0;
  let commercial = 0;
  let future = 0;
  let partnerRequired = 0;
  let notConfigured = 0;
  let unavailable = 0;
  for (const s of dpalSourceRegistry) {
    if (RUNNABLE_STATUSES.has(s.status)) runnable += 1;
    if (s.status === 'public_record') publicRecords += 1;
    if (s.status === 'commercial') commercial += 1;
    if (s.status === 'future') future += 1;
    if (s.status === 'partner_required') partnerRequired += 1;
    if (s.status === 'not_configured') notConfigured += 1;
    if (s.status === 'unavailable') unavailable += 1;
  }
  return {
    allSources: dpalSourceRegistry.length,
    runnable,
    publicRecords,
    commercial,
    future,
    partnerRequired,
    notConfigured,
    unavailable,
    byCategory,
  };
}

export function getRunnableSources() {
  return dpalSourceRegistry.filter((s) => RUNNABLE_STATUSES.has(s.status));
}

export function getFutureSources() {
  return dpalSourceRegistry.filter((s) => s.status === 'future');
}

export function getCommercialSources() {
  return dpalSourceRegistry.filter((s) => s.status === 'commercial' || s.status === 'partner_required');
}

export function getPublicRecordSources() {
  return dpalSourceRegistry.filter((s) => s.status === 'public_record');
}

export function getSourcesForUseCase(useCaseId: string) {
  const uc = businessUseCaseById[useCaseId as keyof typeof businessUseCaseById];
  if (!uc) return { required: [] as string[], optional: [] as string[] };
  return { required: [...uc.requiredSources], optional: [...uc.optionalSources] };
}

export function getUseCasesForSource(sourceId: string): string[] {
  return dpalSourceRegistry.find((s) => s.sourceId === sourceId)?.businessUseCases.slice() ?? [];
}
