/**
 * USGS 3DEP / National Map elevation proxy — public EPQS, no API key.
 * All outbound USGS calls stay server-side.
 */

export type Usgs3depUnits = 'Meters' | 'Feet';

export type Usgs3depProviderStatus = {
  enabled: boolean;
  provider: 'USGS_3DEP';
  elevationEndpointConfigured: boolean;
  lidarExplorerConfigured: boolean;
  eptIndexConfigured: boolean;
  requiresApiKey: false;
  source: 'USGS 3DEP / The National Map';
  capabilities: string[];
};

export type Usgs3depElevationSuccess = {
  ok: true;
  provider: 'USGS_3DEP';
  lat: number;
  lng: number;
  units: Usgs3depUnits;
  elevation: number;
  elevationUnit: string;
  resolutionNote: string;
  sourceUrl: string;
  fetchedAt: string;
};

export type Usgs3depElevationFailure = {
  ok: false;
  provider: 'USGS_3DEP';
  error: 'USGS_3DEP_ELEVATION_UNAVAILABLE' | 'USGS_3DEP_VALIDATION_ERROR' | 'USGS_3DEP_DISABLED';
  message: string;
  lat?: number;
  lng?: number;
  fetchedAt: string;
};

export type Usgs3depElevationResult = Usgs3depElevationSuccess | Usgs3depElevationFailure;

export type Usgs3depLidarContextSuccess = {
  ok: true;
  provider: 'USGS_3DEP';
  mode: 'lidar_context';
  center: { lat: number; lng: number };
  elevation: Usgs3depElevationSuccess | Usgs3depElevationFailure;
  lidarExplorerUrl: string;
  eptIndexUrl: string;
  s3PublicBucket: string;
  requesterPaysBucket: string;
  note: string;
  recommendedUses: string[];
  fetchedAt: string;
};

const DEFAULT_ELEVATION_ENDPOINT = 'https://epqs.nationalmap.gov/v1';
const LEGACY_ELEVATION_ENDPOINT = 'https://apps.nationalmap.gov/epqs/pqs.php';
const DEFAULT_LIDAR_EXPLORER = 'https://apps.nationalmap.gov/lidar-explorer';
const DEFAULT_EPT_INDEX = 'https://usgs.entwine.io';
const DEFAULT_S3_PUBLIC = 's3://usgs-lidar-public';
const DEFAULT_S3_REQUESTER_PAYS = 's3://usgs-lidar';

function envTrim(key: string, fallback = ''): string {
  return process.env[key]?.trim() || fallback;
}

function isEnabled(): boolean {
  const flag = envTrim('USGS_3DEP_ENABLED').toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'yes') return true;
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  // Default on when elevation endpoint is configured (Railway may set only URLs)
  return Boolean(elevationEndpoint());
}

function elevationEndpoint(): string {
  return envTrim('USGS_3DEP_ELEVATION_POINT_QUERY', DEFAULT_ELEVATION_ENDPOINT);
}

function lidarExplorerUrl(): string {
  return envTrim('USGS_3DEP_LIDAR_EXPLORER', DEFAULT_LIDAR_EXPLORER);
}

function eptIndexUrl(): string {
  return envTrim('USGS_3DEP_EPT_INDEX', DEFAULT_EPT_INDEX);
}

function s3PublicBucket(): string {
  return envTrim('USGS_3DEP_S3_PUBLIC', DEFAULT_S3_PUBLIC);
}

function s3RequesterPaysBucket(): string {
  return envTrim('USGS_3DEP_S3_REQUESTER_PAYS', DEFAULT_S3_REQUESTER_PAYS);
}

function isEpqsV1Endpoint(endpoint: string): boolean {
  return /\/v1\b/i.test(endpoint) || endpoint.includes('epqs.nationalmap.gov');
}

export function parseUsgsEpqsElevation(data: unknown): {
  elevation: number;
  elevationUnit: string;
  resolutionNote: string;
} | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;

  const rawValue = record.value;
  const elevationFromValue =
    typeof rawValue === 'number'
      ? rawValue
      : typeof rawValue === 'string'
        ? parseFloat(rawValue)
        : NaN;
  if (Number.isFinite(elevationFromValue)) {
    const units =
      typeof record.units === 'string' && record.units.trim()
        ? record.units
        : 'Meters';
    const resolutionMeters =
      typeof record.resolution === 'number'
        ? `${record.resolution} m raster`
        : typeof record.rasterResolution === 'string'
          ? record.rasterResolution
          : typeof record.dataSource === 'string'
            ? record.dataSource
            : 'National Elevation Dataset (NED) / 3DEP';
    return {
      elevation: elevationFromValue,
      elevationUnit: units,
      resolutionNote: resolutionMeters,
    };
  }

  const nested = record.USGS_Elevation_Point_Query_Service as Record<string, unknown> | undefined;
  const query = nested?.Elevation_Query as Record<string, unknown> | undefined;
  if (query) {
    const rawElev = query.Elevation;
    const elevation =
      typeof rawElev === 'number'
        ? rawElev
        : typeof rawElev === 'string'
          ? parseFloat(rawElev)
          : NaN;
    if (!Number.isFinite(elevation)) return null;
    const elevationUnit =
      typeof query.Units === 'string' && query.Units.trim() ? query.Units : 'Meters';
    const resolutionNote =
      typeof query.Data_Source === 'string' && query.Data_Source.trim()
        ? query.Data_Source
        : 'National Elevation Dataset (NED) / 3DEP';
    return {
      elevation,
      elevationUnit,
      resolutionNote,
    };
  }

  return null;
}

export function validateLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | Usgs3depElevationFailure {
  const latNum = typeof lat === 'number' ? lat : typeof lat === 'string' ? parseFloat(lat) : NaN;
  const lngNum = typeof lng === 'number' ? lng : typeof lng === 'string' ? parseFloat(lng) : NaN;
  const fetchedAt = new Date().toISOString();

  if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
    return {
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_VALIDATION_ERROR',
      message: 'lat must be a number between -90 and 90.',
      fetchedAt,
    };
  }
  if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
    return {
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_VALIDATION_ERROR',
      message: 'lng must be a number between -180 and 180.',
      fetchedAt,
    };
  }
  return { lat: latNum, lng: lngNum };
}

function normalizeUnits(units: unknown): Usgs3depUnits {
  const raw = typeof units === 'string' ? units.trim() : '';
  if (raw.toLowerCase() === 'feet' || raw === 'Feet') return 'Feet';
  return 'Meters';
}

function buildElevationRequestUrl(endpoint: string, lng: number, lat: number, units: Usgs3depUnits): string {
  if (isEpqsV1Endpoint(endpoint)) {
    const base = endpoint.includes('?') ? endpoint.split('?')[0]! : endpoint.replace(/\/$/, '');
    const url = new URL(base.endsWith('/json') ? base : `${base}/json`);
    url.searchParams.set('x', String(lng));
    url.searchParams.set('y', String(lat));
    url.searchParams.set('units', units);
    url.searchParams.set('wkid', '4326');
    return url.toString();
  }

  const base = endpoint.includes('?') ? endpoint.split('?')[0]! : endpoint;
  const url = new URL(base);
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('units', units);
  url.searchParams.set('output', 'json');
  return url.toString();
}

export function get3depProviderStatus(): Usgs3depProviderStatus {
  const elev = elevationEndpoint();
  const explorer = lidarExplorerUrl();
  const ept = eptIndexUrl();
  return {
    enabled: isEnabled(),
    provider: 'USGS_3DEP',
    elevationEndpointConfigured: Boolean(elev),
    lidarExplorerConfigured: Boolean(explorer),
    eptIndexConfigured: Boolean(ept),
    requiresApiKey: false,
    source: 'USGS 3DEP / The National Map',
    capabilities: [
      'point_elevation',
      'terrain_context',
      'slope_context',
      'flood_risk_support',
      'lidar_availability_reference',
      'evidence_packet_support',
    ],
  };
}

export async function getElevationAtPoint(params: {
  lat: number;
  lng: number;
  units?: Usgs3depUnits | string;
}): Promise<Usgs3depElevationResult> {
  const fetchedAt = new Date().toISOString();
  if (!isEnabled()) {
    return {
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_DISABLED',
      message: 'USGS 3DEP provider is disabled. Set USGS_3DEP_ENABLED=true on the API host.',
      lat: params.lat,
      lng: params.lng,
      fetchedAt,
    };
  }

  const validated = validateLatLng(params.lat, params.lng);
  if ('ok' in validated && validated.ok === false) {
    return validated;
  }
  const { lat, lng } = validated as { lat: number; lng: number };
  const units = normalizeUnits(params.units);
  const primaryEndpoint = elevationEndpoint();
  const endpointsToTry = [
    primaryEndpoint,
    ...(isEpqsV1Endpoint(primaryEndpoint) ? [] : [DEFAULT_ELEVATION_ENDPOINT]),
    ...(primaryEndpoint.includes('pqs.php') ? [] : [LEGACY_ELEVATION_ENDPOINT]),
  ].filter((url, idx, arr) => arr.indexOf(url) === idx);

  let lastMessage = 'USGS elevation unavailable.';

  for (const endpoint of endpointsToTry) {
    const sourceUrl = buildElevationRequestUrl(endpoint, lng, lat, units);
    try {
      const response = await fetch(sourceUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
      const text = await response.text();
      let data: unknown = null;
      try {
        data = JSON.parse(text);
      } catch {
        if (text.includes('AccessDenied') || text.includes('Access Denied')) {
          lastMessage = 'Legacy EPQS endpoint denied — retrying National Map v1.';
          continue;
        }
      }

      if (!response.ok) {
        lastMessage = `USGS elevation service returned HTTP ${response.status}.`;
        continue;
      }

      const parsed = parseUsgsEpqsElevation(data);
      if (!parsed) {
        lastMessage = 'USGS elevation response was malformed or missing elevation value.';
        continue;
      }

      return {
        ok: true,
        provider: 'USGS_3DEP',
        lat,
        lng,
        units,
        elevation: parsed.elevation,
        elevationUnit: parsed.elevationUnit,
        resolutionNote: parsed.resolutionNote,
        sourceUrl,
        fetchedAt,
      };
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : 'USGS elevation request failed.';
    }
  }

  return {
    ok: false,
    provider: 'USGS_3DEP',
    error: 'USGS_3DEP_ELEVATION_UNAVAILABLE',
    message: lastMessage,
    lat,
    lng,
    fetchedAt,
  };
}

function geoJsonCentroid(aoiGeoJson: unknown): { lat: number; lng: number } | null {
  if (!aoiGeoJson || typeof aoiGeoJson !== 'object') return null;
  const g = aoiGeoJson as { type?: string; coordinates?: unknown; features?: unknown[] };
  const collectCoords = (coords: unknown): number[][] => {
    if (!Array.isArray(coords)) return [];
    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return [[coords[0] as number, coords[1] as number]];
    }
    return coords.flatMap((c) => collectCoords(c));
  };

  let points: number[][] = [];
  if (g.type === 'FeatureCollection' && Array.isArray(g.features)) {
    for (const f of g.features) {
      if (f && typeof f === 'object') {
        const geom = (f as { geometry?: { coordinates?: unknown } }).geometry;
        if (geom?.coordinates) points = points.concat(collectCoords(geom.coordinates));
      }
    }
  } else if (g.coordinates) {
    points = collectCoords(g.coordinates);
  }

  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

export async function buildLidarContextForAoi(params: {
  aoiGeoJson?: unknown | null;
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
}): Promise<Usgs3depLidarContextSuccess | Usgs3depElevationFailure> {
  const fetchedAt = new Date().toISOString();
  if (!isEnabled()) {
    return {
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_DISABLED',
      message: 'USGS 3DEP provider is disabled.',
      fetchedAt,
    };
  }

  let lat = params.centerLat;
  let lng = params.centerLng;
  const centroid = geoJsonCentroid(params.aoiGeoJson ?? null);
  if (centroid) {
    lat = centroid.lat;
    lng = centroid.lng;
  }

  const validated = validateLatLng(lat, lng);
  if ('ok' in validated && validated.ok === false) {
    return validated;
  }
  const center = validated as { lat: number; lng: number };
  const elevation = await getElevationAtPoint({
    lat: center.lat,
    lng: center.lng,
    units: 'Meters',
  });

  return {
    ok: true,
    provider: 'USGS_3DEP',
    mode: 'lidar_context',
    center,
    elevation,
    lidarExplorerUrl: lidarExplorerUrl(),
    eptIndexUrl: eptIndexUrl(),
    s3PublicBucket: s3PublicBucket(),
    requesterPaysBucket: s3RequesterPaysBucket(),
    note: '3DEP LiDAR point cloud processing is available as a second-stage workflow. Current provider returns terrain/elevation context and links evidence packet to the public 3DEP source.',
    recommendedUses: [
      'slope screening',
      'floodplain terrain context',
      'land disturbance review',
      'carbon/forest AOI terrain validation',
      'water-flow risk support',
      'erosion risk support',
    ],
    fetchedAt,
  };
}

/** Normalized terrain evidence block for environmental / DMRV packets */
export function buildTerrainEvidenceBlock(
  elevation: Usgs3depElevationSuccess,
): Record<string, unknown> {
  return {
    provider: 'USGS_3DEP',
    evidenceType: 'terrain_lidar_context',
    elevation: elevation.elevation,
    units: elevation.units,
    elevationUnit: elevation.elevationUnit,
    center: { lat: elevation.lat, lng: elevation.lng },
    source: 'USGS 3DEP / The National Map',
    sourceUrl: elevation.sourceUrl,
    resolutionNote: elevation.resolutionNote,
    fetchedAt: elevation.fetchedAt,
    limitations: [
      'Elevation values depend on available 3DEP resolution for the location.',
      'LiDAR point cloud analysis requires a second-stage processing workflow.',
      'This layer supports terrain context and does not independently verify environmental impact.',
    ],
  };
}
