import axios from 'axios';

const CMR_BASE = 'https://cmr.earthdata.nasa.gov/search';
const OCO2_COLLECTION_ID = 'C1237422821-GES_DISC';

interface AirQualityData {
  co2ppm: number | null;
  ch4ppb: number | null;
  no2: number | null;
  captureDate: string;
  source: string;
  dataAvailable: boolean;
  message: string;
}

function findOpendapUrl(entry: any): string | undefined {
  const links = Array.isArray(entry?.links) ? entry.links : [];
  const candidate = links.find((link: any) => {
    const href = String(link?.href || '');
    const rel = String(link?.rel || '');
    const title = String(link?.title || '');
    return href.match(/\.dods?($|\?|#)/i) || /opendap|dods|dap/i.test(href + rel + title);
  });
  return candidate ? String(candidate.href).replace(/\.dds$/i, '.dods') : undefined;
}

async function sampleOpendapVariable(opendapUrl: string, variable: string): Promise<number | null> {
  const baseUrl = String(opendapUrl).replace(/\.dds?$|\?.*$/i, '');
  const patterns = [`${variable}[0:10:0][0:10:0]`, `${variable}[0:10:0]`, variable];
  for (const pattern of patterns) {
    try {
      const url = `${baseUrl}.dods?${encodeURIComponent(pattern)}`;
      const response = await axios.get(url, { timeout: 15000, responseType: 'text' });
      const body = String(response.data || '');
      const numbers = Array.from(body.matchAll(/[-+]?[0-9]*\.?[0-9]+/g), (m) => Number(m[0])).filter(Number.isFinite);
      if (numbers.length > 0) {
        return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
      }
    } catch { continue; }
  }
  return null;
}

export const carbonGasAdapter = {
  async getAirQualityData(lat: number, lng: number): Promise<AirQualityData> {
    try {
      const cmrResponse = await axios.get(`${CMR_BASE}/granules.json`, {
        params: {
          collection_concept_id: OCO2_COLLECTION_ID,
          bounding_box: `${lng - 0.2},${lat - 0.2},${lng + 0.2},${lat + 0.2}`,
          sort_key: '-start_date',
          page_size: 1,
        },
        timeout: 10000,
      });

      const entries = cmrResponse.data?.feed?.entry || [];
      const latestGranule = entries[0] as any;
      const hasRealData = Boolean(latestGranule);
      const source = hasRealData
        ? `NASA OCO-2 CMR metadata (${latestGranule.title || latestGranule.id || 'latest available granule'})`
        : 'NASA OCO-2 CMR metadata';
      const captureDate = hasRealData ? latestGranule.time_start || new Date().toISOString() : new Date().toISOString();

      const opendapUrl = latestGranule ? findOpendapUrl(latestGranule) : undefined;
      const [co2ppm] = await Promise.all([
        opendapUrl ? sampleOpendapVariable(opendapUrl, 'xco2') : Promise.resolve<number | null>(null),
      ]);

      return {
        co2ppm,
        ch4ppb: null,
        no2: null,
        captureDate,
        source,
        dataAvailable: co2ppm !== null,
        message: co2ppm !== null
          ? 'Live OCO-2 CO2 data was read from the matching NASA granule. CH4 and NO2 require separate configured trace-gas product readers.'
          : hasRealData
            ? 'Matching NASA OCO-2 granule found, but no readable OPeNDAP CO2 sample was available for this scan area.'
            : 'No NASA OCO-2 granule was found for this scan area.',
      };
    } catch (error) {
      console.error('Carbon gas adapter error:', error);
      throw new Error('Failed to fetch carbon gas data');
    }
  }
};
