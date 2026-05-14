import { earthObservationService } from '../../services/earthObservationService';
import type { ProviderAdapter, ProviderRunInput, ProviderRunResult } from '../sources/providerAdapters';
import { PROVIDER_RUN_SAFETY, hasGeo } from '../sources/providerAdapters';

function defaultWindow(input: ProviderRunInput): { start: string; end: string } {
  const end = input.currentDate?.trim() || new Date().toISOString().slice(0, 10);
  const start =
    input.baselineDate?.trim() ||
    new Date(new Date(end).getTime() - 90 * 86400000).toISOString().slice(0, 10);
  return { start, end };
}

export function createOpticalBaselineAdapter(sourceId: 'NASA_HLS' | 'LANDSAT_8_9' | 'SENTINEL_2'): ProviderAdapter {
  return {
    sourceId,
    canRun: hasGeo,
    async run(input: ProviderRunInput): Promise<ProviderRunResult> {
      const lim = [
        'Earth Observation scan aggregates multiple products; interpret as AOI screening, not parcel certification.',
      ];
      if (!hasGeo(input)) {
        return { sourceId, status: 'unavailable', signals: [], limitations: lim, safetyLabels: PROVIDER_RUN_SAFETY };
      }
      const { start, end } = defaultWindow(input);
      try {
        const scan = await earthObservationService.scan({
          analysisType: 'pollution',
          latitude: input.lat!,
          longitude: input.lng!,
          radiusKm: Math.min(Math.max(input.radiusKm ?? 25, 1), 50),
          startDate: start,
          endDate: end,
        });
        const st: ProviderRunResult['status'] =
          scan.signalStatus === 'verified' || scan.signalStatus === 'partially_verified' ? 'partial' : 'partial';
        return {
          sourceId,
          status: st,
          signals: [
            { key: 'ndvi_change', label: 'NDVI change', value: scan.metrics.ndviChange, confidence: 'requires_validation' },
            { key: 'signal_status', label: 'EO signal status', value: scan.signalStatus, confidence: 'low' },
            { key: 'risk_level', label: 'EO risk level', value: scan.riskLevel, confidence: 'low' },
          ],
          evidenceRefs: scan.sources.slice(0, 6).map((s, i) => ({
            type: 'earth_observation_source',
            label: `${s.name}: ${s.product}`,
            url: s.url ?? undefined,
            metadata: { acquisitionDate: s.acquisitionDate, index: i, routingTag: sourceId },
          })),
          limitations: [...lim, ...scan.limitations.slice(0, 6)],
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'earth observation scan failed';
        return {
          sourceId,
          status: 'error',
          signals: [],
          limitations: [...lim, msg],
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
    },
  };
}

export const nasaHlsAdapter = createOpticalBaselineAdapter('NASA_HLS');
export const landsat89Adapter = createOpticalBaselineAdapter('LANDSAT_8_9');
export const sentinel2Adapter = createOpticalBaselineAdapter('SENTINEL_2');
