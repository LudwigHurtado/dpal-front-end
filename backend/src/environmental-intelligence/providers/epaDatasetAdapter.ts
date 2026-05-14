import { searchRcraFacilityRecords } from '../../services/rcraDataService';
import type { ProviderAdapter, ProviderRunInput, ProviderRunResult } from '../sources/providerAdapters';
import { PROVIDER_RUN_SAFETY, hasGeo } from '../sources/providerAdapters';
import { haversineKm } from './geoUtils';

const SOURCE_ID = 'EPA_DATASET' as const;

export const epaDatasetAdapter: ProviderAdapter = {
  sourceId: SOURCE_ID,
  canRun(input: ProviderRunInput) {
    return hasGeo(input) || Boolean(input.facilityId?.trim()) || Boolean(input.companyName?.trim());
  },
  async run(input: ProviderRunInput): Promise<ProviderRunResult> {
    const lim: string[] = [
      'RCRA/ECHO-style catalog screening only — not a facility compliance determination.',
      'Geo-only queries filter imported/demo rows that include coordinates; sparse coordinates return partial context.',
    ];
    try {
      const params = {
        q: input.companyName?.trim() ?? '',
        epaId: input.facilityId?.trim() ?? '',
        facilityName: '',
        parentCompany: '',
        frsId: '',
        city: '',
        county: '',
        state: '',
        zip: '',
        generatorStatus: '',
        permitStatus: '',
        reportingYear: undefined as number | undefined,
        naicsCode: '',
        limit: 400,
      };
      const { results, count, sourceMode, warnings } = await searchRcraFacilityRecords(params);
      let rows = results;
      if (hasGeo(input)) {
        const rKm = Math.min(Math.max(input.radiusKm ?? 25, 1), 200);
        rows = results.filter((r) => {
          if (typeof r.latitude !== 'number' || typeof r.longitude !== 'number') return false;
          return haversineKm(input.lat!, input.lng!, r.latitude, r.longitude) <= rKm;
        });
      }
      const status = rows.length > 0 ? 'partial' : count > 0 && rows.length === 0 ? 'partial' : 'unavailable';
      if (rows.length === 0 && count > 0) {
        lim.push('Records exist in catalog but none include coordinates within the requested radius for spatial filtering.');
      }
      return {
        sourceId: SOURCE_ID,
        status,
        signals: [
          { key: 'catalog_match_count', label: 'Catalog rows (after spatial filter)', value: rows.length, confidence: 'requires_validation' },
          { key: 'source_mode', label: 'Dataset source mode', value: String(sourceMode), confidence: 'low' },
        ],
        evidenceRefs: rows.slice(0, 8).map((r, i) => ({
          type: 'rcra_facility',
          label: `${r.facilityName} (${r.epaId})`,
          metadata: { index: i, city: r.city, state: r.state, reportingYear: r.reportingYear },
        })),
        limitations: [...lim, ...warnings.slice(0, 3)],
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'RCRA search failed';
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
