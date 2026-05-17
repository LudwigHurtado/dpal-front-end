/** LiDAR source IDs for DMRV configuration (sensor catalog). */

import { getSensorSourcesForKind } from './dmrvSensorCatalog';

export const DMRV_LIDAR_SETTINGS_KEY = 'selectedLidarSources';

const LIDAR_SOURCES = getSensorSourcesForKind('lidar');
const LIDAR_BY_ID = new Map(LIDAR_SOURCES.map((s) => [s.id, s]));

export function parseSelectedLidarIds(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => LIDAR_BY_ID.has(id));
}

export function serializeSelectedLidarIds(ids: string[]): string {
  const valid = ids.filter((id) => LIDAR_BY_ID.has(id));
  return [...new Set(valid)].join(',');
}

export function toggleLidarSelection(current: string[], sourceId: string, checked: boolean): string[] {
  if (!LIDAR_BY_ID.has(sourceId)) return current;
  const set = new Set(current);
  if (checked) set.add(sourceId);
  else set.delete(sourceId);
  return LIDAR_SOURCES.map((s) => s.id).filter((id) => set.has(id));
}

export function getLidarSourcesForIds(ids: string[]) {
  return ids.map((id) => LIDAR_BY_ID.get(id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
}

export { LIDAR_SOURCES as DMRV_LIDAR_SOURCES };
