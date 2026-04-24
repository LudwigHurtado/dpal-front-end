import axios from 'axios';

const COPERNICUS_TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const COPERNICUS_STATS_URL = 'https://sh.dataspace.copernicus.eu/statistics/v1';
const S5P_BUFFER_DEGREES = Number.parseFloat(process.env.COPERNICUS_S5P_BUFFER_DEGREES ?? '0.05');
const S5P_RESOLUTION_DEGREES = Number.parseFloat(process.env.COPERNICUS_S5P_RESOLUTION_DEGREES ?? '0.05');

interface AirQualityData {
  co2ppm: number | null;
  ch4ppb: number | null;
  no2: number | null;
  captureDate: string;
  source: string;
  dataAvailable: boolean;
  measurementStatus: 'verified' | 'unavailable';
  message: string;
  periodStart: string;
  periodEnd: string;
  metrics: {
    methane: {
      unit: 'ppb';
      sampleCount: number;
      noDataCount: number;
      intervalCount: number;
      qaThreshold: number;
      value: number | null;
    };
    no2: {
      unit: 'mol/m^2';
      sampleCount: number;
      noDataCount: number;
      intervalCount: number;
      qaThreshold: number;
      value: number | null;
    };
  };
}

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

type BandCode = 'CH4' | 'NO2';

type BandStatsResult = {
  value: number | null;
  sampleCount: number;
  noDataCount: number;
  intervalCount: number;
};

let tokenCache: TokenCache | null = null;

const clampCoordinate = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const toIsoStart = (value?: string): string => {
  if (!value) {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() - 30);
    return now.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid start date: ${value}`);
  }
  if (!/[tT]/.test(value)) parsed.setUTCHours(0, 0, 0, 0);
  return parsed.toISOString();
};

const toIsoEnd = (value?: string): string => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid end date: ${value}`);
  }
  if (!/[tT]/.test(value)) parsed.setUTCHours(23, 59, 59, 999);
  return parsed.toISOString();
};

async function getCopernicusAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.COPERNICUS_CLIENT_ID?.trim();
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Copernicus Sentinel Hub credentials are not configured on the backend.');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await axios.post(COPERNICUS_TOKEN_URL, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    timeout: 20_000,
  });

  const accessToken = String(response.data?.access_token || '');
  const expiresIn = Number(response.data?.expires_in ?? 3600);
  if (!accessToken) {
    throw new Error('Copernicus Sentinel Hub did not return an access token.');
  }

  tokenCache = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return accessToken;
}

function buildEvalscript(band: BandCode): string {
  return `//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["${band}", "dataMask"]
    }],
    output: [
      { id: "traceGas", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(samples) {
  return {
    traceGas: [samples.${band}],
    dataMask: [samples.dataMask]
  };
}`;
}

function buildStatsRequest(args: {
  lat: number;
  lng: number;
  from: string;
  to: string;
  band: BandCode;
  qaThreshold: number;
}) {
  const west = clampCoordinate(args.lng - S5P_BUFFER_DEGREES, -180, 180);
  const east = clampCoordinate(args.lng + S5P_BUFFER_DEGREES, -180, 180);
  const south = clampCoordinate(args.lat - S5P_BUFFER_DEGREES, -90, 90);
  const north = clampCoordinate(args.lat + S5P_BUFFER_DEGREES, -90, 90);

  return {
    input: {
      bounds: {
        bbox: [west, south, east, north],
        properties: {
          crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
        },
      },
      data: [
        {
          type: 'sentinel-5p-l2',
          dataFilter: {
            timeliness: 'OFFL',
          },
          processing: {
            minQa: args.qaThreshold,
          },
        },
      ],
    },
    aggregation: {
      timeRange: {
        from: args.from,
        to: args.to,
      },
      aggregationInterval: {
        of: 'P1D',
      },
      evalscript: buildEvalscript(args.band),
      resx: S5P_RESOLUTION_DEGREES,
      resy: S5P_RESOLUTION_DEGREES,
    },
    calculations: {
      default: {
        statistics: {
          default: {},
        },
      },
    },
  };
}

function extractBandStats(payload: any): BandStatsResult {
  const intervals = Array.isArray(payload?.data) ? payload.data : [];
  let weightedSum = 0;
  let totalSamples = 0;
  let totalNoData = 0;
  let validIntervals = 0;

  for (const interval of intervals) {
    const stats = interval?.outputs?.traceGas?.bands?.B0?.stats;
    const mean = Number(stats?.mean);
    const sampleCount = Number(stats?.sampleCount ?? 0);
    const noDataCount = Number(stats?.noDataCount ?? 0);

    totalNoData += Number.isFinite(noDataCount) ? noDataCount : 0;
    if (!Number.isFinite(mean) || !Number.isFinite(sampleCount) || sampleCount <= 0) continue;

    weightedSum += mean * sampleCount;
    totalSamples += sampleCount;
    validIntervals += 1;
  }

  return {
    value: totalSamples > 0 ? weightedSum / totalSamples : null,
    sampleCount: totalSamples,
    noDataCount: totalNoData,
    intervalCount: validIntervals,
  };
}

async function fetchBandStats(args: {
  accessToken: string;
  lat: number;
  lng: number;
  from: string;
  to: string;
  band: BandCode;
  qaThreshold: number;
}): Promise<BandStatsResult> {
  const response = await axios.post(
    COPERNICUS_STATS_URL,
    buildStatsRequest(args),
    {
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 45_000,
    },
  );

  return extractBandStats(response.data);
}

export const carbonGasAdapter = {
  async getAirQualityData(lat: number, lng: number, from?: string, to?: string): Promise<AirQualityData> {
    const periodStart = toIsoStart(from);
    const periodEnd = toIsoEnd(to);

    if (new Date(periodEnd) < new Date(periodStart)) {
      throw new Error('Air quality period end must be on or after the start date.');
    }

    try {
      const accessToken = await getCopernicusAccessToken();
      const [methane, no2] = await Promise.all([
        fetchBandStats({
          accessToken,
          lat,
          lng,
          from: periodStart,
          to: periodEnd,
          band: 'CH4',
          qaThreshold: 50,
        }),
        fetchBandStats({
          accessToken,
          lat,
          lng,
          from: periodStart,
          to: periodEnd,
          band: 'NO2',
          qaThreshold: 75,
        }),
      ]);

      const hasAnyLiveReading = methane.value !== null || no2.value !== null;

      return {
        co2ppm: null,
        ch4ppb: methane.value,
        no2: no2.value,
        captureDate: new Date().toISOString(),
        source: 'Copernicus Sentinel-5P Statistical API (Sentinel Hub)',
        dataAvailable: hasAnyLiveReading,
        measurementStatus: hasAnyLiveReading ? 'verified' : 'unavailable',
        message: hasAnyLiveReading
          ? 'Live Sentinel-5P methane and NO2 statistics were calculated from Copernicus Sentinel Hub for the requested period.'
          : 'Sentinel-5P was queried for the requested period, but no usable methane or NO2 observations were returned for this area after QA filtering.',
        periodStart,
        periodEnd,
        metrics: {
          methane: {
            unit: 'ppb',
            sampleCount: methane.sampleCount,
            noDataCount: methane.noDataCount,
            intervalCount: methane.intervalCount,
            qaThreshold: 50,
            value: methane.value,
          },
          no2: {
            unit: 'mol/m^2',
            sampleCount: no2.sampleCount,
            noDataCount: no2.noDataCount,
            intervalCount: no2.intervalCount,
            qaThreshold: 75,
            value: no2.value,
          },
        },
      };
    } catch (error) {
      console.error('Carbon gas adapter error:', error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = typeof error.response?.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response?.data ?? {});
        throw new Error(`Failed to fetch Sentinel-5P trace-gas data${status ? ` (HTTP ${status})` : ''}: ${message || error.message}`);
      }
      throw error instanceof Error ? error : new Error('Failed to fetch Sentinel-5P trace-gas data');
    }
  },
};
