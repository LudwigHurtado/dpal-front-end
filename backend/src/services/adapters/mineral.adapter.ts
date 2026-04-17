import axios from 'axios';

const CMR_BASE = 'https://cmr.earthdata.nasa.gov/search';
const EMIT_COLLECTION_ID = 'C2408750690-LPCLOUD';

interface MineralData {
  minerals: string[];
  dustArea: number;
  composition: { [key: string]: number };
  captureDate: string;
  source: string;
  dataAvailable: boolean;
  message: string;
}

const estimateFootprintAreaKm2 = (granule: any): number | null => {
  const boxes = Array.isArray(granule?.boxes) ? granule.boxes[0] : undefined;
  const polygon = typeof granule?.polygons?.[0] === 'string' ? granule.polygons[0] : undefined;

  if (boxes && boxes.length >= 4) {
    const [west, south, east, north] = boxes.map(Number);
    return calculateAreaKm2(west, south, east, north);
  }

  if (polygon) {
    const coords = polygon.split(/\s+/).map(Number).filter(Number.isFinite);
    if (coords.length >= 4) {
      const lats = coords.filter((_, idx) => idx % 2 === 1);
      const lngs = coords.filter((_, idx) => idx % 2 === 0);
      return calculateAreaKm2(Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats));
    }
  }

  return null;
};

const calculateAreaKm2 = (west: number, south: number, east: number, north: number): number | null => {
  if (![west, south, east, north].every(Number.isFinite)) return null;

  const avgLat = (south + north) / 2;
  const latDegreeKm = 111.32;
  const lonDegreeKm = 111.32 * Math.cos((avgLat * Math.PI) / 180);
  const areaKm2 = Math.abs((east - west) * lonDegreeKm * (north - south) * latDegreeKm);

  return Number(Math.max(20, Math.min(2000, areaKm2 * 0.75)).toFixed(1));
};

export const mineralAdapter = {
  async getMineralData(lat: number, lng: number): Promise<MineralData> {
    try {
      const cmrResponse = await axios.get(`${CMR_BASE}/granules.json`, {
        params: {
          collection_concept_id: EMIT_COLLECTION_ID,
          bounding_box: `${lng - 0.2},${lat - 0.2},${lng + 0.2},${lat + 0.2}`,
          sort_key: '-start_date',
          page_size: 1,
        },
        timeout: 10000,
      });

      const entries = cmrResponse.data?.feed?.entry || [];
      const latestGranule = entries[0] as any;
      const dataAvailable = Boolean(latestGranule);

      return {
        minerals: [],
        dustArea: dataAvailable ? estimateFootprintAreaKm2(latestGranule) ?? 0 : 0,
        composition: {},
        captureDate: dataAvailable ? latestGranule.time_start || new Date().toISOString() : new Date().toISOString(),
        source: dataAvailable
          ? `NASA EMIT CMR metadata (${latestGranule.title || latestGranule.id || 'latest available granule'})`
          : 'NASA EMIT CMR metadata',
        dataAvailable,
        message: dataAvailable
          ? 'Matching NASA EMIT granule found. Mineral composition requires a configured Earthdata spectral-product reader before values can be displayed.'
          : 'No NASA EMIT granule was found for this scan area.',
      };
    } catch (error) {
      console.error('Mineral adapter error:', error);
      throw new Error('Failed to fetch mineral data');
    }
  },
};
