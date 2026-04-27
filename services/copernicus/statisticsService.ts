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
    throw new Error(`credentials_missing: ${setup.message || 'Copernicus backend not configured'}`);
  }

  const payloadBody = {
    aoiGeoJson: params.aoiGeoJson,
    collection: params.collection,
    indexType: params.indexType,
    before: { fromDate: params.before.from, toDate: params.before.to },
    after: { fromDate: params.after.from, toDate: params.after.to },
  };

  if ((import.meta as any).env?.DEV) {
    const firstCoordinate = params.aoiGeoJson.coordinates?.[0]?.[0] ?? null;
    const coordinateCount = params.aoiGeoJson.coordinates?.[0]?.length ?? 0;
    console.info('[AquaScan] Statistics payload', {
      collection: params.collection,
      indexType: params.indexType,
      before: payloadBody.before,
      after: payloadBody.after,
      aoiCoordinateCount: coordinateCount,
      firstCoordinate,
    });
  }

  const response = await fetch(apiUrl(API_ROUTES.COPERNICUS_STATISTICS), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payloadBody),
    signal: params.signal,
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as {
      error?: string;
      reason?: string;
      measurementStatus?: string;
    };
    const status = err.measurementStatus ?? (response.status >= 500 ? 'upstream_error' : 'parser_failed');
    throw new Error(`${status}: ${err.reason ?? err.error ?? `Statistics API error ${response.status}`}`);
  }
  const payload = (await response.json()) as { comparison?: CopernicusStatisticsComparisonResponse };
  if (!payload.comparison) {
    throw new Error('parser_failed: No comparison response returned by backend.');
  }
  return payload.comparison;
}
