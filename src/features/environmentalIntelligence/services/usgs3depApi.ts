import { API_ROUTES, apiUrl } from '../../../../constants';

export type Usgs3depUnits = 'Meters' | 'Feet';

export type Usgs3depProviderStatus = {
  ok: boolean;
  enabled: boolean;
  provider: 'USGS_3DEP';
  elevationEndpointConfigured: boolean;
  lidarExplorerConfigured: boolean;
  eptIndexConfigured: boolean;
  requiresApiKey: false;
  source: string;
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
  error: string;
  message: string;
  lat?: number;
  lng?: number;
  fetchedAt: string;
};

export type Usgs3depLidarContext = {
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

export type Usgs3depTerrainEvidence = {
  provider: 'USGS_3DEP';
  evidenceType: 'terrain_lidar_context';
  elevation: number;
  units: Usgs3depUnits;
  elevationUnit: string;
  center: { lat: number; lng: number };
  source: string;
  sourceUrl: string;
  resolutionNote?: string;
  fetchedAt: string;
  limitations: string[];
};

async function parseJson<T>(res: Response): Promise<T | null> {
  return (await res.json().catch(() => null)) as T | null;
}

export async function getUsgs3depStatus(signal?: AbortSignal): Promise<Usgs3depProviderStatus | null> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.USGS_3DEP_STATUS), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    const body = await parseJson<Usgs3depProviderStatus>(res);
    if (!res.ok || !body?.ok) return null;
    return body;
  } catch {
    return null;
  }
}

export async function getUsgs3depElevation(
  params: { lat: number; lng: number; units?: Usgs3depUnits },
  signal?: AbortSignal,
): Promise<Usgs3depElevationSuccess | Usgs3depElevationFailure> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.USGS_3DEP_ELEVATION), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(params),
      signal,
    });
    const body = await parseJson<Usgs3depElevationSuccess | Usgs3depElevationFailure>(res);
    if (body && typeof body === 'object' && 'provider' in body) {
      return body;
    }
    return {
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_ELEVATION_UNAVAILABLE',
      message: `Unexpected response (${res.status})`,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_ELEVATION_UNAVAILABLE',
      message: err instanceof Error ? err.message : 'Network error',
      fetchedAt: new Date().toISOString(),
    };
  }
}

export async function getUsgs3depLidarContext(
  params: {
    centerLat?: number;
    centerLng?: number;
    radiusKm?: number;
    aoiGeoJson?: unknown | null;
  },
  signal?: AbortSignal,
): Promise<Usgs3depLidarContext | Usgs3depElevationFailure> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.USGS_3DEP_LIDAR_CONTEXT), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(params),
      signal,
    });
    const body = await parseJson<Usgs3depLidarContext | Usgs3depElevationFailure>(res);
    if (body && typeof body === 'object' && 'provider' in body) {
      return body;
    }
    return {
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_ELEVATION_UNAVAILABLE',
      message: `Unexpected response (${res.status})`,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      provider: 'USGS_3DEP',
      error: 'USGS_3DEP_ELEVATION_UNAVAILABLE',
      message: err instanceof Error ? err.message : 'Network error',
      fetchedAt: new Date().toISOString(),
    };
  }
}

export function elevationToTerrainEvidence(elevation: Usgs3depElevationSuccess): Usgs3depTerrainEvidence {
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
