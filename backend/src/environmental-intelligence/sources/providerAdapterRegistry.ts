import { carbDatasetAdapter } from '../providers/carbDatasetAdapter';
import { epaDatasetAdapter } from '../providers/epaDatasetAdapter';
import { landsat89Adapter, nasaHlsAdapter, sentinel2Adapter } from '../providers/opticalBaselineAdapter';
import { nasaFirmsAdapter } from '../providers/nasaFirmsAdapter';
import { qrEvidenceAdapter } from '../providers/qrEvidenceAdapter';
import { riverTideDataAdapter } from '../providers/riverTideDataAdapter';
import { sentinel5pTropomiAdapter } from '../providers/sentinel5pTropomiAdapter';
import { weatherDataAdapter } from '../providers/weatherDataAdapter';
import type { ProviderAdapter, ProviderRunInput, ProviderRunResult } from './providerAdapters';
import { createStubProviderAdapter, PROVIDER_RUN_SAFETY } from './providerAdapters';
import { getBackendSourceRegistry, inferCanRunFromStatus } from './sourceRegistry';

const rows = getBackendSourceRegistry();
const byId = Object.fromEntries(rows.map((r) => [r.sourceId, r])) as Record<string, (typeof rows)[number]>;

const LIVE_ADAPTERS: ReadonlyMap<string, ProviderAdapter> = new Map([
  ['EPA_DATASET', epaDatasetAdapter],
  ['CARB_DATASET', carbDatasetAdapter],
  ['NASA_FIRMS', nasaFirmsAdapter],
  ['WEATHER_DATA', weatherDataAdapter],
  ['RIVER_TIDE_DATA', riverTideDataAdapter],
  ['SENTINEL_5P_TROPOMI', sentinel5pTropomiAdapter],
  ['NASA_HLS', nasaHlsAdapter],
  ['LANDSAT_8_9', landsat89Adapter],
  ['SENTINEL_2', sentinel2Adapter],
  ['QR_EVIDENCE', qrEvidenceAdapter],
]);

const stubCache = new Map<string, ProviderAdapter>();

export function getProviderAdapter(sourceId: string): ProviderAdapter | null {
  const hit = LIVE_ADAPTERS.get(sourceId);
  if (hit) return hit;
  const row = byId[sourceId];
  if (!row) return null;
  if (!stubCache.has(sourceId)) {
    stubCache.set(sourceId, createStubProviderAdapter(row));
  }
  return stubCache.get(sourceId)!;
}

function gateByRegistry(sourceId: string): ProviderRunResult | null {
  const row = byId[sourceId];
  if (!row) {
    return {
      sourceId,
      status: 'error',
      signals: [],
      limitations: ['Unknown sourceId — not present in DPAL source registry.'],
      safetyLabels: PROVIDER_RUN_SAFETY,
    };
  }
  if (row.status === 'future') {
    return { sourceId, status: 'future', signals: [], limitations: row.limitations, safetyLabels: PROVIDER_RUN_SAFETY };
  }
  if (row.status === 'commercial' || row.status === 'partner_required') {
    return {
      sourceId,
      status: 'commercial_required',
      signals: [],
      limitations: [...row.limitations, 'Commercial or partner agreement required before execution.'],
      safetyLabels: PROVIDER_RUN_SAFETY,
    };
  }
  return null;
}

export function getRunnableProviderAdapters(sourceIds: string[], input: ProviderRunInput): ProviderAdapter[] {
  const out: ProviderAdapter[] = [];
  for (const id of sourceIds) {
    const row = byId[id];
    if (!row) continue;
    if (!inferCanRunFromStatus(row.status)) continue;
    const ad = getProviderAdapter(id);
    if (ad && ad.canRun(input)) out.push(ad);
  }
  return out;
}

export async function runProviderAdapter(sourceId: string, input: ProviderRunInput): Promise<ProviderRunResult> {
  const gated = gateByRegistry(sourceId);
  if (gated) return gated;
  const ad = getProviderAdapter(sourceId);
  if (!ad) {
    return {
      sourceId,
      status: 'unavailable',
      signals: [],
      limitations: ['No provider adapter is registered for this source.'],
      safetyLabels: PROVIDER_RUN_SAFETY,
    };
  }
  try {
    return await ad.run(input);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Provider run failed';
    return {
      sourceId,
      status: 'error',
      signals: [],
      limitations: [msg],
      safetyLabels: PROVIDER_RUN_SAFETY,
    };
  }
}

export async function runProviderAdapters(sourceIds: string[], input: ProviderRunInput): Promise<ProviderRunResult[]> {
  const settled = await Promise.allSettled(sourceIds.map((id) => runProviderAdapter(id, input)));
  return settled.map((s, i) => {
    const id = sourceIds[i] ?? 'unknown';
    if (s.status === 'fulfilled') return s.value;
    return {
      sourceId: id,
      status: 'error' as const,
      signals: [],
      limitations: [s.reason instanceof Error ? s.reason.message : 'Rejected provider promise'],
      safetyLabels: PROVIDER_RUN_SAFETY,
    };
  });
}

/** @deprecated use runProviderAdapter */
export async function runProviderStub(sourceId: string, input: ProviderRunInput): Promise<ProviderRunResult> {
  return runProviderAdapter(sourceId, input);
}
