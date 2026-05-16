import type { DmrvSourceConfiguratorKind } from '../dmrvSensorCatalog';

const STORAGE_KEY = 'dpal_dmrv_source_selections_v1';

export type DmrvSourceSelectionMap = Record<string, string[]>;

function readAll(): DmrvSourceSelectionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DmrvSourceSelectionMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: DmrvSourceSelectionMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function sourceSelectionKey(
  projectId: string,
  typeId: string,
  kind: DmrvSourceConfiguratorKind,
): string {
  return `${projectId.trim()}::${typeId}::${kind}`;
}

export function getSelectedSourceIds(
  projectId: string,
  typeId: string,
  kind: DmrvSourceConfiguratorKind,
): string[] {
  const map = readAll();
  return map[sourceSelectionKey(projectId, typeId, kind)] ?? [];
}

export function saveSelectedSourceIds(
  projectId: string,
  typeId: string,
  kind: DmrvSourceConfiguratorKind,
  ids: string[],
): void {
  const map = readAll();
  map[sourceSelectionKey(projectId, typeId, kind)] = [...new Set(ids)];
  writeAll(map);
}

export function hasConfiguredSources(
  projectId: string,
  typeId: string,
  kind: DmrvSourceConfiguratorKind,
): boolean {
  return getSelectedSourceIds(projectId, typeId, kind).length > 0;
}
