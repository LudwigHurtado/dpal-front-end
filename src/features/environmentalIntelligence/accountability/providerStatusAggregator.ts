import type { AccountabilityModuleStatus } from '../shared/accountabilityModuleAdapters';
import { getModuleStatusLabel } from '../shared/accountabilityModuleAdapters';
import type { ProviderReadinessSnapshot } from '../shared/disclosureIntegrityTypes';
import {
  SATELLITE_SOURCE_REGISTRY,
  type SatelliteRegistryEntry,
  type SatelliteRegistryGroup,
  type SatelliteRegistrySourceStatus,
} from '../shared/satelliteSourceRegistry';
import { accountabilityAdapters } from './accountabilityAdapterRegistry';

/** Default panel status when no live probe — conservative, registry-aligned. */
const MODULE_PANEL_STATUS: Partial<Record<string, AccountabilityModuleStatus>> = {
  plastic_watch: 'partial',
  forest_integrity: 'partial',
  aquascan_water: 'partial',
  carbon_mrv: 'partial',
  carb_emissions_audit: 'partial',
  hazardous_waste_audit: 'partial',
  envirofacts_geo: 'partial',
  command_center: 'partial',
};

export type AccountabilityProviderRow = {
  id: string;
  label: string;
  group: SatelliteRegistryGroup;
  status: SatelliteRegistrySourceStatus;
  displayLabel: string;
  legalCaution: string;
};

export type AccountabilityModuleStatusRow = {
  moduleId: string;
  label: string;
  status: AccountabilityModuleStatus;
  statusLabel: string;
  route?: string;
  contributes: string;
  supportedClaimTypes: string[];
  supportedSignalTypes: string[];
  limitations: string[];
  warnings: string[];
};

export type AccountabilityProviderStatusBundle = {
  ok: boolean;
  mode: 'live' | 'partial' | 'preview';
  source: 'api' | 'registry_fallback';
  notice?: string;
  providerSummary: ProviderReadinessSnapshot;
  providers: AccountabilityProviderRow[];
  modules: AccountabilityModuleStatusRow[];
  warnings: string[];
};

function registryStatusDisplay(status: SatelliteRegistrySourceStatus): string {
  switch (status) {
    case 'live':
      return 'Live';
    case 'partial':
      return 'Partial';
    case 'metadata_only':
      return 'Metadata only';
    case 'planned':
      return 'Planned';
    case 'future':
      return 'Future';
    case 'unavailable':
      return 'Unavailable';
    default:
      return status;
  }
}

export function summarizeProviderReadiness(entries: SatelliteRegistryEntry[]): ProviderReadinessSnapshot {
  const snap: ProviderReadinessSnapshot = {
    liveCount: 0,
    partialCount: 0,
    metadataOnlyCount: 0,
    previewOnlyCount: 0,
    plannedOrFutureCount: 0,
    unavailableCount: 0,
    notConfiguredCount: 0,
    warnings: [],
  };
  for (const e of entries) {
    switch (e.status) {
      case 'live':
        snap.liveCount += 1;
        break;
      case 'partial':
        snap.partialCount += 1;
        break;
      case 'metadata_only':
        snap.metadataOnlyCount += 1;
        break;
      case 'planned':
      case 'future':
        snap.plannedOrFutureCount += 1;
        break;
      case 'unavailable':
        snap.unavailableCount += 1;
        break;
      default:
        break;
    }
  }
  if (snap.unavailableCount > snap.liveCount + snap.partialCount) {
    snap.warnings.push('Many registry lanes are unavailable on this deployment — widen official-record context.');
  }
  if (snap.metadataOnlyCount > 0 && snap.liveCount < 2) {
    snap.warnings.push('Several lanes are metadata-only — physical inference requires configured processing or field validation.');
  }
  return snap;
}

export function groupProviderStatusByCategory(
  rows: AccountabilityProviderRow[],
): Record<SatelliteRegistryGroup, AccountabilityProviderRow[]> {
  const out = {} as Record<SatelliteRegistryGroup, AccountabilityProviderRow[]>;
  for (const r of rows) {
    if (!out[r.group]) out[r.group] = [];
    out[r.group].push(r);
  }
  return out;
}

export function getProviderReadinessWarnings(summary: ProviderReadinessSnapshot): string[] {
  return [...summary.warnings];
}

function buildModuleRowsFromRegistry(): AccountabilityModuleStatusRow[] {
  return accountabilityAdapters.map((a) => {
    const status = MODULE_PANEL_STATUS[a.moduleId] ?? 'partial';
    const limitations: string[] = [
      'Adapter summarizes module outputs — it does not replace the source module UI or APIs.',
      'Live vs preview depends on API host configuration and credentials.',
    ];
    return {
      moduleId: a.moduleId,
      label: a.label,
      status,
      statusLabel: getModuleStatusLabel(status),
      route: a.route,
      contributes: a.description,
      supportedClaimTypes: [...a.supportsClaimTypes],
      supportedSignalTypes: [...a.supportsSignalTypes],
      limitations,
      warnings: [a.legalCaution],
    };
  });
}

function registryRows(): AccountabilityProviderRow[] {
  return SATELLITE_SOURCE_REGISTRY.map((e) => ({
    id: e.id,
    label: e.label,
    group: e.group,
    status: e.status,
    displayLabel: registryStatusDisplay(e.status),
    legalCaution: e.legalCaution,
  }));
}

/**
 * Aggregates satellite registry rows + accountability module metadata.
 * Optional `apiSnapshot` merges lane detail from GET /api/satellite-accountability/provider-status when present.
 */
export function getAccountabilityProviderStatus(apiSnapshot?: {
  ok?: boolean;
  lanes?: Array<{ id: string; status: string; detail: string }>;
  providerSummary?: ProviderReadinessSnapshot;
  providers?: AccountabilityProviderRow[];
  modules?: AccountabilityModuleStatusRow[];
  mode?: string;
  warnings?: string[];
} | null): AccountabilityProviderStatusBundle {
  const baseProviders = registryRows();
  const providerSummary = apiSnapshot?.providerSummary ?? summarizeProviderReadiness(SATELLITE_SOURCE_REGISTRY);
  const warnings = [...(apiSnapshot?.warnings ?? []), ...getProviderReadinessWarnings(providerSummary)];
  const fromApi = Boolean(apiSnapshot?.ok);
  const modules =
    apiSnapshot?.modules && apiSnapshot.modules.length > 0 ? apiSnapshot.modules : buildModuleRowsFromRegistry();

  if (fromApi && apiSnapshot?.lanes?.length) {
    for (const lane of apiSnapshot.lanes) {
      const row = baseProviders.find((p) => p.id === lane.id);
      if (row && lane.status === 'metadata_only') {
        row.displayLabel = 'Metadata only';
      }
    }
  }

  return {
    ok: true,
    mode: fromApi ? (apiSnapshot?.mode as 'live' | 'partial' | 'preview') ?? 'partial' : 'preview',
    source: fromApi ? 'api' : 'registry_fallback',
    notice: fromApi
      ? undefined
      : 'Live provider/module status unavailable — displaying registry-based preview.',
    providerSummary,
    providers: apiSnapshot?.providers?.length ? apiSnapshot.providers : baseProviders,
    modules,
    warnings,
  };
}
