/** Living evidence ledger types — satellite, biomass, threats, missions, anchors. */

export type DmrvSatelliteReviewStatus = 'passed' | 'flagged' | 'needs_review' | 'failed';

export type DmrvSatelliteReview = {
  reviewId: string;
  projectId: string;
  reportId: string;
  reviewedAt: string;
  satellite: string;
  sensor?: string;
  provider?: string;
  sceneIds: string[];
  indices: string[];
  cloudCover?: number;
  aoiCoveragePct?: number;
  resultSummary: string;
  findings: string[];
  limitations: string[];
  status: DmrvSatelliteReviewStatus;
  evidenceIds: string[];
  blockchainAnchorId?: string;
  hash?: string;
};

export type DmrvBiomassSnapshotType = 'baseline' | 'current' | 'comparison' | 'validator_adjusted';

export type DmrvBiomassSnapshot = {
  snapshotId: string;
  projectId: string;
  reportId: string;
  capturedAt: string;
  snapshotType: DmrvBiomassSnapshotType;
  meanNdvi?: number;
  meanNbr?: number;
  meanNdmi?: number;
  estimatedBiomassTonsPerHa?: number;
  estimatedCarbonTonsPerHa?: number;
  estimatedCo2e?: number;
  calculationMethod: string;
  confidence: 'high' | 'medium' | 'low';
  limitations: string[];
  sourceSatelliteReviewId?: string;
  fieldPlotIds?: string[];
  evidenceIds: string[];
  blockchainAnchorId?: string;
  hash?: string;
};

export type DmrvThreatType =
  | 'deforestation'
  | 'fire'
  | 'drought'
  | 'flood'
  | 'illegal_activity'
  | 'cloud_gap'
  | 'data_gap'
  | 'leakage_risk'
  | 'permanence_risk'
  | 'methodology_gap'
  | 'other';

export type DmrvThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

export type DmrvThreatSource =
  | 'satellite'
  | 'ai'
  | 'validator'
  | 'field_plot'
  | 'user'
  | 'iot'
  | 'external_dataset';

export type DmrvThreatStatus = 'open' | 'monitoring' | 'mission_created' | 'resolved' | 'dismissed';

export type DmrvThreatRecord = {
  threatId: string;
  projectId: string;
  reportId: string;
  detectedAt: string;
  threatType: DmrvThreatType;
  severity: DmrvThreatSeverity;
  source: DmrvThreatSource;
  description: string;
  recommendedAction: string;
  status: DmrvThreatStatus;
  linkedSatelliteReviewId?: string;
  linkedMissionId?: string;
  evidenceIds: string[];
  blockchainAnchorId?: string;
  hash?: string;
};

export type DmrvValidatorMissionType =
  | 'field_plot_verification'
  | 'threat_inspection'
  | 'biomass_sampling'
  | 'photo_evidence'
  | 'community_statement'
  | 'water_sample'
  | 'plastic_validation'
  | 'custom';

export type DmrvValidatorMissionStatus =
  | 'draft'
  | 'assigned'
  | 'in_progress'
  | 'submitted'
  | 'reviewed'
  | 'accepted'
  | 'rejected';

export type DmrvValidatorMission = {
  missionId: string;
  projectId: string;
  reportId: string;
  createdAt: string;
  missionType: DmrvValidatorMissionType;
  title: string;
  description: string;
  assignedTo?: string;
  missionStatus: DmrvValidatorMissionStatus;
  targetLocation?: { lat: number; lng: number };
  targetAoiId?: string;
  dueDate?: string;
  submittedAt?: string;
  evidenceCollected: string[];
  validatorNotes?: string;
  reviewerDecision?: 'accepted' | 'needs_more_evidence' | 'rejected';
  linkedThreatId?: string;
  blockchainAnchorId?: string;
  hash?: string;
};

export type DmrvEvidencePacketSummary = {
  packetId: string;
  title: string;
  createdAt: string;
  status: 'draft' | 'generated' | 'anchored';
  inputKeys: string[];
  evidenceBundleHash?: string;
  blockchainAnchorId?: string;
};

export type DmrvBlockchainAnchorType =
  | 'project_config'
  | 'aoi'
  | 'satellite_review'
  | 'biomass_snapshot'
  | 'threat_record'
  | 'validator_mission'
  | 'evidence_packet'
  | 'report_snapshot'
  | 'final_report';

export type DmrvBlockchainAnchor = {
  anchorId: string;
  reportId: string;
  version: string;
  anchorType: DmrvBlockchainAnchorType;
  createdAt: string;
  chainName?: string;
  transactionId?: string;
  reportJsonHash?: string;
  evidenceBundleHash?: string;
  pdfHash?: string;
  status: 'pending' | 'anchored' | 'failed';
  sourceObjectId: string;
};

/** Denormalized metrics for live panel + AI (never invented — Missing when absent). */
export type DmrvReportEvidenceSummary = {
  lastSatelliteReviewAt: string;
  lastBiomassUpdateAt: string;
  baselineBiomassTonsPerHa: string;
  currentBiomassTonsPerHa: string;
  biomassChangeTonsPerHa: string;
  openThreatCount: number;
  validatorMissionCount: number;
  evidencePacketCount: number;
  anchoredVersionLabel: string;
  verifierReadinessGaps: string[];
};

export const DMRV_REPORT_EVENT_TYPES = {
  SATELLITE_REVIEW_COMPLETED: 'SATELLITE_REVIEW_COMPLETED',
  BIOMASS_BASELINE_CREATED: 'BIOMASS_BASELINE_CREATED',
  BIOMASS_CURRENT_UPDATED: 'BIOMASS_CURRENT_UPDATED',
  BIOMASS_COMPARISON_CREATED: 'BIOMASS_COMPARISON_CREATED',
  THREAT_DETECTED: 'THREAT_DETECTED',
  VALIDATOR_MISSION_CREATED: 'VALIDATOR_MISSION_CREATED',
  VALIDATOR_MISSION_COMPLETED: 'VALIDATOR_MISSION_COMPLETED',
  EVIDENCE_PACKET_GENERATED: 'EVIDENCE_PACKET_GENERATED',
  BLOCKCHAIN_ANCHOR_CREATED: 'BLOCKCHAIN_ANCHOR_CREATED',
  REPORT_VERSION_SAVED: 'REPORT_VERSION_SAVED',
  REPORT_VERSION_LOCKED: 'REPORT_VERSION_LOCKED',
} as const;

export type DmrvReportEventType = (typeof DMRV_REPORT_EVENT_TYPES)[keyof typeof DMRV_REPORT_EVENT_TYPES];
