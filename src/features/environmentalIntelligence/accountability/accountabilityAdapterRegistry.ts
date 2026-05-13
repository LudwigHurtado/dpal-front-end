import type { DisclosureClaimType, ObservedEnvironmentalSignal, ObservedEnvironmentalSignalType } from '../shared/disclosureIntegrityTypes';
import type { AccountabilityModuleAdapter, AccountabilityModuleId, AccountabilityModuleSignal } from '../shared/accountabilityModuleAdapters';
import { normalizeModuleSignalToObservedSignal } from '../shared/accountabilityModuleAdapters';
import { plasticWatchAccountabilityAdapter } from './adapters/plasticWatchAccountabilityAdapter';
import { forestIntegrityAccountabilityAdapter } from './adapters/forestIntegrityAccountabilityAdapter';
import { aquascanWaterAccountabilityAdapter } from './adapters/aquascanWaterAccountabilityAdapter';
import { carbonMrvAccountabilityAdapter } from './adapters/carbonMrvAccountabilityAdapter';
import { emissionsAuditAccountabilityAdapter } from './adapters/emissionsAuditAccountabilityAdapter';
import { envirofactsAccountabilityAdapter, hazardousWasteAccountabilityAdapter } from './adapters/hazardousWasteAccountabilityAdapter';

/**
 * Command Center: lightweight adapter metadata only.
 * TODO(Phase 3): Wire `commandCenterEvidenceBuilder` summaries without importing the full Command Center UI tree (avoid circular deps).
 */
export const commandCenterAccountabilityAdapter: AccountabilityModuleAdapter = {
  moduleId: 'command_center',
  label: 'Command Center',
  description: 'Multi-module orchestration and evidence-builder handoff — consumes normalized module signals when provided.',
  route: '/command-center',
  supportsClaimTypes: ['other', 'regulatory_compliance', 'pollution_control', 'carbon_credit', 'water_quality'],
  supportsSignalTypes: ['other', 'methane_plume', 'forest_loss', 'water_quality_risk'],
  legalCaution: 'Command Center plans and previews — human approval gates remain for live provider calls.',
  normalize: () => [],
};

export const accountabilityAdapters: AccountabilityModuleAdapter[] = [
  plasticWatchAccountabilityAdapter,
  forestIntegrityAccountabilityAdapter,
  aquascanWaterAccountabilityAdapter,
  carbonMrvAccountabilityAdapter,
  emissionsAuditAccountabilityAdapter,
  hazardousWasteAccountabilityAdapter,
  envirofactsAccountabilityAdapter,
  commandCenterAccountabilityAdapter,
];

export function getAdapterByModuleId(moduleId: AccountabilityModuleId): AccountabilityModuleAdapter | undefined {
  return accountabilityAdapters.find((a) => a.moduleId === moduleId);
}

export function getAdaptersForClaimType(claimType: DisclosureClaimType): AccountabilityModuleAdapter[] {
  return accountabilityAdapters.filter((a) => a.supportsClaimTypes.includes(claimType));
}

export function getAdaptersForSignalType(signalType: ObservedEnvironmentalSignalType | string): AccountabilityModuleAdapter[] {
  return accountabilityAdapters.filter((a) => a.supportsSignalTypes.includes(signalType));
}

export function normalizeSignalsFromModules(moduleSignals: AccountabilityModuleSignal[]): ObservedEnvironmentalSignal[] {
  return moduleSignals.map(normalizeModuleSignalToObservedSignal);
}
