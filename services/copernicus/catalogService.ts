import { apiUrl, API_ROUTES } from '../../constants';
import { fetchCopernicusSetupState } from './processService';
import type { CopernicusCatalogSearchParams, CopernicusSceneMetadata } from './types';

export async function searchCopernicusCatalog(
  params: CopernicusCatalogSearchParams,
  signal?: AbortSignal,
): Promise<{ scenes: CopernicusSceneMetadata[]; source: string }> {
  const setup = await fetchCopernicusSetupState(signal);
  if (!setup.configured) {
    return {
      scenes: [],
      source: setup.message,
    };
  }

  const body = {
    bbox: [params.center.lng - 0.2, params.center.lat - 0.2, params.center.lng + 0.2, params.center.lat + 0.2],
    datetime: `${params.dateRange.from}T00:00:00Z/${params.dateRange.to}T23:59:59Z`,
    collections: params.collections,
    query: params.cloudFilter
      ? { 'eo:cloud_cover': { lte: params.cloudFilter.maxCloudCoverPercent } }
      : undefined,
    intersects: params.aoiGeoJson ?? undefined,
    limit: 20,
  };

  const response = await fetch(apiUrl(API_ROUTES.COPERNICUS_CATALOG_SEARCH), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Catalog API error ${response.status}`);
  }

  const payload = (await response.json()) as { features?: any[]; sourceCitation?: string };
  const scenes: CopernicusSceneMetadata[] = (payload.features ?? []).map((feature) => ({
    id: String(feature.id ?? ''),
    collection: String(feature.collection ?? 'sentinel-2-l2a') as CopernicusSceneMetadata['collection'],
    acquisitionDate: String(feature.properties?.datetime ?? ''),
    cloudCoverPercent: typeof feature.properties?.['eo:cloud_cover'] === 'number' ? feature.properties['eo:cloud_cover'] : null,
    footprintGeoJson: feature.geometry ?? null,
  }));

  return {
    scenes,
    source: payload.sourceCitation ?? 'Copernicus Catalog/STAC API',
  };
}
