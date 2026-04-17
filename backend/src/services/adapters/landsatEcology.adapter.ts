import axios from 'axios';

const PC_STAC_SEARCH = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
const PC_DATA_ITEM_STATS = 'https://planetarycomputer.microsoft.com/api/data/v1/item/statistics';
const LANDSAT_COLLECTION = 'landsat-c2-l2';
const LANDSAT_SCALE = 0.0000275;
const LANDSAT_OFFSET = -0.2;

type HabitatRisk = 'low' | 'moderate' | 'high' | 'unknown';

interface EcologyScanResult {
  dataAvailable: boolean;
  ndvi: number | null;
  foliageHealth: string | null;
  canopyChangePercent: number | null;
  habitatRisk: HabitatRisk;
  primaryConcern: string | null;
  captureDate: string | null;
  cloudCoverPercent: number | null;
  source: string;
  message: string;
}

interface StacFeature {
  id: string;
  properties?: {
    datetime?: string;
    platform?: string;
    'eo:cloud_cover'?: number;
    'landsat:scene_id'?: string;
  };
}

const emptyResult = (message: string): EcologyScanResult => ({
  dataAvailable: false,
  ndvi: null,
  foliageHealth: null,
  canopyChangePercent: null,
  habitatRisk: 'unknown',
  primaryConcern: null,
  captureDate: null,
  cloudCoverPercent: null,
  source: 'Microsoft Planetary Computer STAC / USGS Landsat Collection 2 Level-2',
  message,
});

function scanBbox(lat: number, lng: number, radiusKm: number): [number, number, number, number] {
  const clampedRadius = Math.max(1, Math.min(50, radiusKm || 15));
  const latDelta = clampedRadius / 111.32;
  const lngDelta = clampedRadius / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

function reflectanceFromDn(value: number | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value * LANDSAT_SCALE + LANDSAT_OFFSET;
}

function ndviFromStats(stats: any): number | null {
  const red = reflectanceFromDn(stats?.red_b1?.mean);
  const nir = reflectanceFromDn(stats?.nir08_b1?.mean);
  if (red === null || nir === null || Math.abs(nir + red) < 0.0001) return null;
  const ndvi = (nir - red) / (nir + red);
  if (!Number.isFinite(ndvi)) return null;
  return Number(Math.max(-1, Math.min(1, ndvi)).toFixed(3));
}

function classifyFoliage(ndvi: number): string {
  if (ndvi >= 0.65) return 'Dense healthy foliage';
  if (ndvi >= 0.45) return 'Healthy vegetation';
  if (ndvi >= 0.25) return 'Sparse or stressed vegetation';
  if (ndvi >= 0.1) return 'Low vegetation cover';
  return 'Bare ground, water, or severely stressed foliage';
}

function classifyRisk(ndvi: number, canopyChangePercent: number | null, cloudCoverPercent: number | null): HabitatRisk {
  if (ndvi < 0.2 || (canopyChangePercent !== null && canopyChangePercent <= -15)) return 'high';
  if (ndvi < 0.35 || (canopyChangePercent !== null && canopyChangePercent <= -7) || (cloudCoverPercent ?? 0) > 40) return 'moderate';
  return 'low';
}

function primaryConcern(ndvi: number, canopyChangePercent: number | null, cloudCoverPercent: number | null): string {
  if ((cloudCoverPercent ?? 0) > 40) return 'Cloud cover reduces confidence; compare with a clearer follow-up scene.';
  if (canopyChangePercent !== null && canopyChangePercent <= -15) return 'Large vegetation decline compared with the previous clear Landsat scene.';
  if (ndvi < 0.2) return 'Very low live vegetation signal; check for clearing, drought damage, bare soil, burn scar, or water.';
  if (ndvi < 0.35) return 'Sparse or stressed vegetation signal; verify drought stress, grazing pressure, or restoration needs.';
  return 'No immediate canopy-loss signal from the latest Landsat red/NIR statistics.';
}

async function searchLandsatScenes(lat: number, lng: number, radiusKm: number, platform: 'landsat-9' | 'landsat-8'): Promise<StacFeature[]> {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - 18);

  const response = await axios.post(
    PC_STAC_SEARCH,
    {
      collections: [LANDSAT_COLLECTION],
      bbox: scanBbox(lat, lng, radiusKm),
      datetime: `${start.toISOString().slice(0, 10)}/${end.toISOString().slice(0, 10)}`,
      limit: 8,
      query: {
        'eo:cloud_cover': { lt: 65 },
        platform: { in: [platform] },
      },
      sortby: [{ field: 'properties.datetime', direction: 'desc' }],
    },
    { timeout: 15000 }
  );

  return Array.isArray(response.data?.features) ? response.data.features : [];
}

async function fetchNdviForItem(itemId: string): Promise<number | null> {
  const params = new URLSearchParams();
  params.append('collection', LANDSAT_COLLECTION);
  params.append('item', itemId);
  params.append('assets', 'red');
  params.append('assets', 'nir08');

  const response = await axios.get(`${PC_DATA_ITEM_STATS}?${params.toString()}`, { timeout: 20000 });
  return ndviFromStats(response.data);
}

export const landsatEcologyAdapter = {
  async getFoliageScan(lat: number, lng: number, radiusKm = 15): Promise<EcologyScanResult> {
    try {
      const scenes9 = await searchLandsatScenes(lat, lng, radiusKm, 'landsat-9');
      const scenes = scenes9.length > 0 ? scenes9 : await searchLandsatScenes(lat, lng, radiusKm, 'landsat-8');
      if (scenes.length === 0) {
        return emptyResult('No recent low-cloud Landsat 8/9 Collection 2 Level-2 scene was found for this scan area.');
      }

      const latest = scenes[0];
      const previous = scenes.slice(1).find((scene) => scene.id !== latest.id);
      const [latestNdvi, previousNdvi] = await Promise.all([
        fetchNdviForItem(latest.id),
        previous ? fetchNdviForItem(previous.id) : Promise.resolve<number | null>(null),
      ]);

      if (latestNdvi === null) {
        return emptyResult(`A Landsat scene was found (${latest.id}), but red/NIR statistics were not readable from the public data API.`);
      }

      const canopyChangePercent = previousNdvi !== null && Math.abs(previousNdvi) > 0.001
        ? Number((((latestNdvi - previousNdvi) / Math.abs(previousNdvi)) * 100).toFixed(1))
        : null;
      const cloudCoverPercent = typeof latest.properties?.['eo:cloud_cover'] === 'number'
        ? Number(latest.properties['eo:cloud_cover'].toFixed(1))
        : null;
      const habitatRisk = classifyRisk(latestNdvi, canopyChangePercent, cloudCoverPercent);
      const platform = latest.properties?.platform || 'landsat-9';
      const sceneId = latest.properties?.['landsat:scene_id'] || latest.id;

      return {
        dataAvailable: true,
        ndvi: latestNdvi,
        foliageHealth: classifyFoliage(latestNdvi),
        canopyChangePercent,
        habitatRisk,
        primaryConcern: primaryConcern(latestNdvi, canopyChangePercent, cloudCoverPercent),
        captureDate: latest.properties?.datetime || null,
        cloudCoverPercent,
        source: `Microsoft Planetary Computer STAC / USGS Landsat Collection 2 Level-2 (${platform}, ${sceneId})`,
        message: previousNdvi !== null
          ? 'Connected to public Landsat Collection 2 Level-2 surface reflectance. NDVI was calculated from real red and near-infrared band statistics and compared with the previous clear scene.'
          : 'Connected to public Landsat Collection 2 Level-2 surface reflectance. NDVI was calculated from real red and near-infrared band statistics; canopy change needs a second comparable scene.',
      };
    } catch (error) {
      console.error('Landsat ecology adapter error:', error);
      throw new Error('Failed to fetch Landsat ecology data');
    }
  },
};
