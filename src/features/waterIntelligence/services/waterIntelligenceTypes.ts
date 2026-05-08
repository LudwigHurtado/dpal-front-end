/**
 * DPAL Water Intelligence — shared types (Colorado River Exchange pilot and related surfaces).
 * Pilot / demonstration only unless wired to governing programs.
 */

export type WaterProjectStatus =
  | 'draft'
  | 'baseline_pending'
  | 'monitoring'
  | 'evidence_submitted'
  | 'under_review'
  | 'verified'
  | 'issued'
  | 'transferred'
  | 'retired'
  | 'rejected';

export type WaterTransactionCategory = 'resale' | 'system_enhancement' | 'sequestered_archived';

/** Canonical data provenance labels for UI chips. */
export type WaterDataSourceLabel =
  | 'live_api'
  | 'imported'
  | 'fallback'
  | 'user_submitted'
  | 'satellite_derived'
  | 'sensor_derived'
  | 'ai_inferred'
  | 'human_verified'
  | 'blockchain_anchored'
  | 'mock_demo';

export interface WaterConservationProject {
  id: string;
  name: string;
  method: string;
  geography: string;
  goal: string;
  baselineUseAF: number;
  currentMonitoredUseAF: number;
  transactionOptions: WaterTransactionCategory[];
  status: WaterProjectStatus;
  evidenceStatus: 'preliminary' | 'partial' | 'moderate' | 'strong';
  humanVerified: boolean;
  blockchainAnchored: boolean;
  dataSourceLabels: WaterDataSourceLabel[];
}

export interface WaterRightProfile {
  id: string;
  projectId: string;
  holderLabel: string;
  entitlementReference: string;
  conservationAgreementStatus: string;
  leaseEligibility: string;
  authorityReviewNeeded: boolean;
  legalReviewNeeded: boolean;
  compensationStatus: string;
  riskNotes: string;
}

export interface WaterBaselineRecord {
  id: string;
  projectId: string;
  historicalConsumptiveUseAF: number;
  irrigatedAcresOrAreaNote: string;
  waterSource: string;
  waterRightReference: string;
  irrigationMethod?: string;
  weatherContext?: string;
  etEstimateNote?: string;
  confidenceScoreLabel: string;
  dataSourceLabels: WaterDataSourceLabel[];
}

export interface WaterMonitoringRecord {
  id: string;
  projectId: string;
  periodLabel: string;
  currentConsumptiveUseAF: number;
  soilMoistureOrIrrigationNote?: string;
  satelliteFieldEvidenceNote?: string;
  userReportsNote?: string;
  evidenceGaps: string[];
  dataSourceLabels: WaterDataSourceLabel[];
}

export interface ConservationCalculationInput {
  baselineConsumptiveUseAF: number;
  currentConsumptiveUseAF: number;
  rainfallAdjustmentAF: number;
  returnFlowAdjustmentAF: number;
  uncertaintyBufferPercent: number;
  validatorAdjustmentAF: number;
}

export interface ConservationCalculation extends ConservationCalculationInput {
  grossSavedAF: number;
  adjustedSavedAF: number;
  uncertaintyBufferAF: number;
  netVerifiedConservationAF: number;
  eligibleVWCU: number;
}

export interface WaterEvidencePacket {
  id: string;
  projectId: string;
  projectSummary: string;
  locationSummary: string;
  waterRightReference: string;
  baselineRecordId: string;
  monitoringRecordId: string;
  calculatorSnapshot: ConservationCalculation | null;
  satelliteSensorFieldNote: string;
  validatorNotesPlaceholder: string;
  confidenceScore: number;
  evidenceHashPlaceholder: string;
  publicSafeSummary: string;
  transactionCategory: WaterTransactionCategory | null;
  dataSourceLabels: WaterDataSourceLabel[];
}

export interface VerifiedWaterConservationUnit {
  id: string;
  projectId: string;
  ownerLabel: string;
  acreFeet: number;
  waterRightReference: string;
  evidencePacketId: string;
  evidenceHash: string;
  verificationStatus: WaterProjectStatus;
  transactionCategory: WaterTransactionCategory;
  issueDate: string;
  transferStatus: string;
  retirementStatus: string;
  humanVerified: boolean;
  blockchainAnchored: boolean;
}

export interface WaterTransaction {
  id: string;
  seller: string;
  buyer: string;
  units: number;
  acreFeet: number;
  pricePerAF: number;
  totalValue: number;
  category: WaterTransactionCategory;
  authorityApprovalStatus: string;
  escrowStatus: string;
  transferStatus: string;
  ledgerStatus: string;
  publicRecordStatus: string;
}

export interface PolicyMemo {
  id: string;
  title: string;
  body: string;
}

export interface StakeholderReview {
  id: string;
  stakeholder: string;
  status: string;
  notes: string;
}

export interface PublicWaterVerificationRecord {
  recordId: string;
  projectId: string;
  projectName: string;
  locationSummary: string;
  claimedConservationAF: number;
  netVerifiedConservationAF: number | null;
  evidenceHash: string;
  status: WaterProjectStatus;
  transactionCategory: WaterTransactionCategory | null;
  timeline: Array<{ at: string; label: string }>;
  dataSourceLabels: WaterDataSourceLabel[];
}

export interface ColoradoExchangePilotDashboard {
  totalPilotProjects: number;
  baselineAFUnderReview: number;
  estimatedConservedAF: number;
  netVerifiedConservationAF: number;
  pilotVWcuEligible: number;
  vwcuResale: number;
  vwcuSystemEnhancement: number;
  vwcuSequesteredArchived: number;
  evidencePackets: number;
  publicRecords: number;
}
