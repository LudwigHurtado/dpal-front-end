import { fetchFirmsHotspotCount } from '../../services/forestIntegrityService';
import type { ProviderAdapter, ProviderRunInput, ProviderRunResult } from '../sources/providerAdapters';
import { PROVIDER_RUN_SAFETY, hasGeo } from '../sources/providerAdapters';

const SOURCE_ID = 'NASA_FIRMS' as const;

function daysBetween(a?: string, b?: string): number {
  if (!a || !b) return 7;
  const t0 = new Date(a).getTime();
  const t1 = new Date(b).getTime();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return 7;
  const d = Math.ceil(Math.abs(t1 - t0) / 86400000);
  return Math.min(Math.max(d, 1), 10);
}

export const nasaFirmsAdapter: ProviderAdapter = {
  sourceId: SOURCE_ID,
  canRun: hasGeo,
  async run(input: ProviderRunInput): Promise<ProviderRunResult> {
    const lim = [
      'FIRMS rows are satellite thermal anomalies, not ground-truthed fire perimeters or enforcement findings.',
    ];
    if (!hasGeo(input)) {
      return {
        sourceId: SOURCE_ID,
        status: 'unavailable',
        signals: [],
        limitations: [...lim, 'Latitude and longitude are required.'],
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    }
    if (!process.env.NASA_FIRMS_MAP_KEY?.trim()) {
      return {
        sourceId: SOURCE_ID,
        status: 'not_configured',
        signals: [],
        limitations: [...lim, 'Set NASA_FIRMS_MAP_KEY on the API host to enable NASA FIRMS area CSV access.'],
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    }
    const days = daysBetween(input.baselineDate, input.currentDate);
    const radiusKm = Math.min(Math.max(input.radiusKm ?? 25, 1), 50);
    const out = await fetchFirmsHotspotCount(input.lat!, input.lng!, radiusKm, days);
    if (!out.ok) {
      return {
        sourceId: SOURCE_ID,
        status: 'unavailable',
        signals: [{ key: 'firms_rows', label: 'VIIRS SNPP NRT CSV rows', value: 0, confidence: 'low' }],
        limitations: [...lim, out.message],
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    }
    const st: ProviderRunResult['status'] = out.count > 0 ? 'success' : 'partial';
    return {
      sourceId: SOURCE_ID,
      status: st,
      signals: [
        {
          key: 'firms_rows',
          label: 'VIIRS SNPP NRT CSV rows (proxy count)',
          value: out.count,
          unit: 'rows',
          confidence: 'requires_validation',
        },
        { key: 'window_days', label: 'Query window (days)', value: days, unit: 'd', confidence: 'low' },
      ],
      evidenceRefs: [
        {
          type: 'firms_csv',
          label: 'NASA FIRMS VIIRS SNPP NRT area CSV',
          metadata: { radiusKm, days, message: out.message },
        },
      ],
      limitations: [...lim, out.message],
      safetyLabels: PROVIDER_RUN_SAFETY,
    };
  },
};
