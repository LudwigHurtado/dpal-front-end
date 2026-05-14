import { getCarbDataStatus, searchCarbFacilityRecords } from '../../services/carbDataService';
import type { ProviderAdapter, ProviderRunInput, ProviderRunResult } from '../sources/providerAdapters';
import { PROVIDER_RUN_SAFETY, hasGeo } from '../sources/providerAdapters';
import { haversineKm } from './geoUtils';

const SOURCE_ID = 'CARB_DATASET' as const;

export const carbDatasetAdapter: ProviderAdapter = {
  sourceId: SOURCE_ID,
  canRun(input: ProviderRunInput) {
    return hasGeo(input) || Boolean(input.facilityId?.trim()) || Boolean(input.companyName?.trim());
  },
  async run(input: ProviderRunInput): Promise<ProviderRunResult> {
    const lim: string[] = [
      'CARB facility catalog screening — reported fields are self-reported regulatory data, not DPAL verification.',
    ];
    try {
      const status = await getCarbDataStatus();
      if (!status.datasetLoaded && status.searchReadiness === 'Not Ready') {
        return {
          sourceId: SOURCE_ID,
          status: 'not_configured',
          signals: [{ key: 'carb_status', label: 'CARB dataset loaded', value: false, confidence: 'low' }],
          limitations: [...lim, ...status.warnings.slice(0, 4)],
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
      const q = (input.companyName ?? input.facilityId ?? '').trim();
      const search = await searchCarbFacilityRecords({
        q,
        facilityId: input.facilityId?.trim() ?? '',
        operatorName: '',
        facilityName: '',
        city: '',
        county: '',
        sector: '',
        year: undefined,
        limit: 80,
        offset: 0,
        includeHistory: false,
      });
      let rows = search.results;
      if (hasGeo(input)) {
        const rKm = Math.min(Math.max(input.radiusKm ?? 25, 1), 200);
        rows = search.results.filter((r) => {
          if (r.latitude == null || r.longitude == null) return false;
          return haversineKm(input.lat!, input.lng!, r.latitude, r.longitude) <= rKm;
        });
      }
      const mode = search.sourceMode;
      const statusRun: ProviderRunResult['status'] =
        mode === 'NEEDS_SOURCE' || mode === 'DEMO_FALLBACK' ? 'partial' : rows.length ? 'partial' : q ? 'unavailable' : 'partial';
      return {
        sourceId: SOURCE_ID,
        status: statusRun,
        signals: [
          { key: 'match_count', label: 'CARB rows (after filter)', value: rows.length, confidence: 'requires_validation' },
          { key: 'source_mode', label: 'CARB source mode', value: String(mode), confidence: 'low' },
        ],
        evidenceRefs: rows.slice(0, 8).map((r, i) => ({
          type: 'carb_facility',
          label: `${r.facilityName ?? 'Facility'} (${r.facilityId ?? 'id'})`,
          metadata: { index: i, reportingYear: r.reportingYear, totalCO2e: r.totalCO2e },
        })),
        limitations: [...lim, ...search.warnings.slice(0, 4)],
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'CARB adapter error';
      return {
        sourceId: SOURCE_ID,
        status: 'error',
        signals: [],
        limitations: [...lim, msg],
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    }
  },
};
