import {
  getUsgs3depElevation,
  elevationToTerrainEvidence,
  type Usgs3depTerrainEvidence,
} from '../../environmentalIntelligence/services/usgs3depApi';
import type { DmrvProjectContext } from '../services/dmrvProjectContextTypes';
import type { DmrvInputConfig } from '../services/dmrvInputConfigTypes';

export function parseDmrvCoordinates(
  project?: DmrvProjectContext | null,
  config?: DmrvInputConfig | null,
): { lat: number; lng: number } | null {
  const latStr = project?.location.latitude?.trim() || String(config?.dataSourceSettings.latitude ?? '').trim();
  const lngStr = project?.location.longitude?.trim() || String(config?.dataSourceSettings.longitude ?? '').trim();
  if (!latStr || !lngStr) return null;
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Fetch optional USGS 3DEP terrain block when coordinates exist. */
export async function fetchUsgs3depTerrainEvidenceForProject(
  project?: DmrvProjectContext | null,
  config?: DmrvInputConfig | null,
): Promise<Usgs3depTerrainEvidence | null> {
  const coords = parseDmrvCoordinates(project, config);
  if (!coords) return null;
  const elevation = await getUsgs3depElevation({ lat: coords.lat, lng: coords.lng, units: 'Meters' });
  if (!elevation.ok) return null;
  return elevationToTerrainEvidence(elevation);
}
