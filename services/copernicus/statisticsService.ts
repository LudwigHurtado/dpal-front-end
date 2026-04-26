import { apiUrl, API_ROUTES } from '../../constants';
import { fetchCopernicusSetupState } from './processService';
import type {
  CopernicusAoiGeoJson,
  CopernicusCollection,
  CopernicusDateRange,
  CopernicusStatisticsComparisonResponse,
  CopernicusIndexType,
} from './types';

export async function fetchAoiStatisticsComparison(params: {
  aoiGeoJson: CopernicusAoiGeoJson;
  collection: CopernicusCollection;
  indexType: CopernicusIndexType;
  before: CopernicusDateRange;
  after: CopernicusDateRange;
  signal?: AbortSignal;
}): Promise<CopernicusStatisticsComparisonResponse> {
  const setup = await fetchCopernicusSetupState(params.signal);
  if (!setup.configured) {
    throw new Error(setup.message || 'Copernicus backend not configured');
  }

  const response = await fetch(apiUrl(API_ROUTES.COPERNICUS_STATISTICS), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aoiGeoJson: params.aoiGeoJson,
      collection: params.collection,
      indexType: params.indexType,
      before: { fromDate: params.before.from, toDate: params.before.to },
      after: { fromDate: params.after.from, toDate: params.after.to },
    }),
    signal: params.signal,
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Statistics API error ${response.status}`);
  }
  const payload = (await response.json()) as { comparison?: CopernicusStatisticsComparisonResponse };
  if (!payload.comparison) {
    throw new Error('No comparison response returned by backend.');
  }
  return payload.comparison;
}
