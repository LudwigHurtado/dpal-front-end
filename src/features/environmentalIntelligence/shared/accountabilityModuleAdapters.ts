/**
 * Accountability Engine — module adapter contracts and helpers.
 * Summarizes existing DPAL modules into the disclosure-integrity model without duplicating their logic.
 */

import type {
  DisclosureClaimType,
  ObservedEnvironmentalSignal,
  ObservedEnvironmentalSignalType,
} from './disclosureIntegrityTypes';
import {
  SatelliteConfidenceLevel,
  SatelliteEvidenceReadiness,
} from './satelliteIntelligenceTypes';

export type AccountabilityModuleId =
  | 'plastic_watch'
  | 'forest_integrity'
  | 'aquascan_water'
  | 'carbon_mrv'
  | 'carb_emissions_audit'
  | 'hazardous_waste_audit'
  | 'envirofacts_geo'
  | 'command_center'
  | 'field_validation'
  | 'community_report'
  | 'manual_disclosure';

export type AccountabilityModuleStatus =
  | 'live'
  | 'partial'
  | 'metadata_only'
  | 'preview_only'
  | 'unavailable'
  | 'error'
  | 'not_configured';

export interface AccountabilityModuleSignal {
  id: string;
  moduleId: AccountabilityModuleId;
  moduleLabel: string;
  moduleStatus: AccountabilityModuleStatus;
  providerIds: string[];
  signalType: ObservedEnvironmentalSignalType | string;
  location?: string;
  aoi?: string;
  observedDate?: string;
  baselineDate?: string;
  currentDate?: string;
  summary: string;
  confidenceLevel: SatelliteConfidenceLevel;
  evidenceReadiness: SatelliteEvidenceReadiness;
  sourceSummary: string;
  limitations: string[];
  warnings: string[];
  previewOnly: boolean;
  rawReference?: unknown;
}

export interface AccountabilityModuleAdapter {
  moduleId: AccountabilityModuleId;
  label: string;
  description: string;
  route?: string;
  getStatus?: () => Promise<AccountabilityModuleStatus>;
  normalize?: (raw: unknown) => AccountabilityModuleSignal[];
  supportsClaimTypes: DisclosureClaimType[];
  supportsSignalTypes: Array<ObservedEnvironmentalSignalType | string>;
  legalCaution: string;
}

const MODULE_LABELS: Record<AccountabilityModuleId, string> = {
  plastic_watch: 'Hyperspectral Plastic Watch',
  forest_integrity: 'Forest Integrity',
  aquascan_water: 'AquaScan / Water Monitor',
  carbon_mrv: 'Carbon MRV',
  carb_emissions_audit: 'CARB / Emissions Audit',
  hazardous_waste_audit: 'Hazardous Waste Audit',
  envirofacts_geo: 'EPA / Envirofacts Geo',
  command_center: 'Command Center',
  field_validation: 'Field validation',
  community_report: 'Community report',
  manual_disclosure: 'Manual disclosure',
};

const STATUS_LABELS: Record<AccountabilityModuleStatus, string> = {
  live: 'Live',
  partial: 'Partial',
  metadata_only: 'Metadata only',
  preview_only: 'Preview only',
  unavailable: 'Unavailable',
  error: 'Error',
  not_configured: 'Not configured',
};

const STATUS_BADGE: Record<AccountabilityModuleStatus, string> = {
  live: 'bg-emerald-50 text-emerald-900 border border-emerald-200',
  partial: 'bg-sky-50 text-sky-900 border border-sky-200',
  metadata_only: 'bg-slate-100 text-slate-800 border border-slate-200',
  preview_only: 'bg-amber-50 text-amber-950 border border-amber-200',
  unavailable: 'bg-slate-50 text-slate-600 border border-slate-200',
  error: 'bg-rose-50 text-rose-900 border border-rose-200',
  not_configured: 'bg-slate-50 text-slate-500 border border-slate-200',
};

export function getModuleLabel(moduleId: AccountabilityModuleId): string {
  return MODULE_LABELS[moduleId] ?? moduleId;
}

export function getModuleStatusLabel(status: AccountabilityModuleStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getModuleStatusBadgeClass(status: AccountabilityModuleStatus): string {
  return STATUS_BADGE[status] ?? STATUS_BADGE.unavailable;
}

function newObservedId(prefix: string, suffix: string): string {
  return `${prefix}-${suffix}`.replace(/[^a-z0-9-]+/gi, '-').slice(0, 120);
}

export function normalizeModuleSignalToObservedSignal(signal: AccountabilityModuleSignal): ObservedEnvironmentalSignal {
  const st = signal.signalType as ObservedEnvironmentalSignalType;
  return {
    id: newObservedId('obs', signal.id),
    providerId: signal.providerIds[0] ?? signal.moduleId,
    providerLabel: signal.moduleLabel,
    sourceModuleId: signal.moduleId,
    sourceModuleLabel: signal.moduleLabel,
    signalType: st,
    location: signal.location ?? 'Location not specified',
    aoi: signal.aoi ?? 'AOI not specified',
    observedDate: signal.observedDate ?? new Date().toISOString().slice(0, 10),
    baselineDate: signal.baselineDate,
    currentDate: signal.currentDate,
    confidenceLevel: signal.confidenceLevel,
    evidenceReadiness: signal.evidenceReadiness,
    sourceSummary: signal.sourceSummary,
    limitations: signal.limitations,
    previewOnly: signal.previewOnly,
  };
}

export function moduleSignalRequiresFieldValidation(signal: AccountabilityModuleSignal): boolean {
  return (
    signal.confidenceLevel === SatelliteConfidenceLevel.requires_field_validation ||
    signal.evidenceReadiness === SatelliteEvidenceReadiness.needs_field_validation ||
    signal.signalType === 'water_quality_risk' ||
    signal.signalType === 'harmful_algal_bloom_risk' ||
    signal.signalType === 'plastic_pollution_confidence'
  );
}

export function moduleSignalIsPreviewOnly(signal: AccountabilityModuleSignal): boolean {
  return (
    signal.previewOnly ||
    signal.moduleStatus === 'preview_only' ||
    signal.moduleStatus === 'metadata_only' ||
    signal.confidenceLevel === SatelliteConfidenceLevel.preview_only ||
    signal.evidenceReadiness === SatelliteEvidenceReadiness.preview_only
  );
}
