import type { SatelliteConfidenceLevel, SatelliteEvidenceReadiness } from './satelliteIntelligenceTypes';

export type DisclosureClaimType =
  | 'carbon_credit'
  | 'net_zero'
  | 'methane_emissions'
  | 'co2_emissions'
  | 'water_quality'
  | 'forest_conservation'
  | 'deforestation_free'
  | 'pollution_control'
  | 'hazardous_waste'
  | 'sustainability_report'
  | 'regulatory_compliance'
  | 'other';

export type DisclosureClaimRecordConfidence = 'low' | 'medium' | 'high' | 'unknown';

export interface DisclosureClaim {
  id: string;
  companyName: string;
  facilityName?: string;
  facilityId?: string;
  location?: string;
  aoi?: string;
  reportingPeriod?: string;
  claimType: DisclosureClaimType;
  claimText: string;
  reportedValue?: string;
  reportedUnit?: string;
  sourceDocument?: string;
  sourceUrl?: string;
  filingAgency?: string;
  submittedAt?: string;
  confidenceInClaimRecord: DisclosureClaimRecordConfidence;
}

export type ObservedEnvironmentalSignalType =
  | 'methane_plume'
  | 'co2_hotspot'
  | 'greenhouse_gas_hotspot'
  | 'forest_loss'
  | 'biomass_decline'
  | 'water_quality_risk'
  | 'harmful_algal_bloom_risk'
  | 'plastic_pollution_confidence'
  | 'pollution_risk'
  | 'land_movement'
  | 'flood_extent'
  | 'drought_stress'
  | 'heat_stress'
  | 'air_pollution_hotspot'
  | 'hazardous_waste_risk'
  | 'vegetation_decline'
  | 'surface_water_change'
  | 'wetland_change'
  | 'carbon_mrv'
  | 'other';

export interface ObservedEnvironmentalSignal {
  id: string;
  providerId: string;
  providerLabel: string;
  /** Optional: which DPAL module produced or summarized this signal (accountability layer). */
  sourceModuleId?: string;
  sourceModuleLabel?: string;
  signalType: ObservedEnvironmentalSignalType;
  location: string;
  aoi: string;
  observedDate: string;
  baselineDate?: string;
  currentDate?: string;
  magnitude?: string;
  unit?: string;
  confidenceLevel: SatelliteConfidenceLevel;
  evidenceReadiness: SatelliteEvidenceReadiness;
  sourceSummary: string;
  limitations: string[];
  previewOnly: boolean;
}

export type DisclosureIntegrityAnomalyStatus =
  | 'aligned'
  | 'potential_mismatch'
  | 'unresolved_anomaly'
  | 'high_priority_review'
  | 'insufficient_data'
  | 'requires_field_validation'
  | 'requires_validator_review';

export type DisclosureIntegrityConfidenceLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'multi_source_supported'
  | 'field_validated'
  | 'official_record_supported';

export type EvidenceStrengthTier =
  | 'single_source'
  | 'multi_source'
  | 'official_record_cross_check'
  | 'field_validation_required'
  | 'validator_reviewed';

export interface EvidenceStrengthSummary {
  tier: EvidenceStrengthTier;
  label: string;
  detail: string;
}

export interface ProviderReadinessSnapshot {
  liveCount: number;
  partialCount: number;
  metadataOnlyCount: number;
  previewOnlyCount: number;
  plannedOrFutureCount: number;
  unavailableCount: number;
  notConfiguredCount: number;
  warnings: string[];
}

export interface DisclosureIntegrityFinding {
  id: string;
  companyName: string;
  facilityName?: string;
  claim: DisclosureClaim;
  observedSignals: ObservedEnvironmentalSignal[];
  evidenceStrengthSummary?: EvidenceStrengthSummary;
  providerReadinessSnapshot?: ProviderReadinessSnapshot;
  anomalyStatus: DisclosureIntegrityAnomalyStatus;
  anomalyScore: number;
  /** Optional bullet explanations for the anomaly score (transparency). */
  anomalyScoreExplanations?: string[];
  confidenceLevel: DisclosureIntegrityConfidenceLevel;
  riskFlags: string[];
  recommendedActions: string[];
  legalSafeSummary: string;
  evidencePacketReady: boolean;
  blockchainReady: boolean;
  qrReady: boolean;
  createdAt: string;
}
