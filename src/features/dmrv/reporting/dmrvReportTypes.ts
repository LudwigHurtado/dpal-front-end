import type { DmrvProjectContext } from '../services/dmrvProjectContextTypes';
import type { DmrvInputConfig } from '../services/dmrvInputConfigTypes';

export type DmrvReportType =
  | 'carbon'
  | 'plastic'
  | 'water'
  | 'biodiversity'
  | 'emissions'
  | 'custom';

export type DmrvReportStatus =
  | 'draft'
  | 'in_progress'
  | 'ready_for_review'
  | 'needs_human_review'
  | 'locked';

export type DmrvSectionStatus = 'complete' | 'partial' | 'missing' | 'needs_review';

export type DmrvConfidenceLevel = 'high' | 'medium' | 'low';

export type DmrvCmiTheme =
  | 'transparency'
  | 'accuracy'
  | 'cost_efficiency'
  | 'scalability'
  | 'accessibility'
  | 'data_security_integrity'
  | 'interoperability'
  | 'explainability'
  | 'auditability';

export type DmrvReportField = {
  key: string;
  label: string;
  value: string;
  status: DmrvSectionStatus;
  needsReview?: boolean;
  sourceStep?: string;
};

export type DmrvReportSection = {
  id: string;
  title: string;
  workflowStep: string;
  status: DmrvSectionStatus;
  confidence: DmrvConfidenceLevel;
  evidenceCount: number;
  validationStatus: 'not_started' | 'pending' | 'passed' | 'failed' | 'needs_review';
  humanReviewRequired: boolean;
  summary: string;
  fields: DmrvReportField[];
  cmiThemes: DmrvCmiTheme[];
  missingHints: string[];
};

export type DmrvCmiThemeScore = {
  theme: DmrvCmiTheme;
  label: string;
  score: number;
  status: DmrvSectionStatus;
  rationale: string;
};

export type DmrvReadinessScore = {
  overall: number;
  completedSections: number;
  partialSections: number;
  missingSections: number;
  needsReviewSections: number;
  cmiThemes: DmrvCmiThemeScore[];
};

export type DmrvAuditActor = 'user' | 'ai' | 'system';

export type DmrvAuditEvent = {
  id: string;
  timestamp: string;
  actor: DmrvAuditActor;
  workflowStep: string;
  fieldChanged: string;
  previousSummary?: string;
  newSummary: string;
  sourceEvidenceId?: string;
  hash?: string;
};

export type DmrvInteroperabilityMetadata = {
  projectId: string;
  reportId: string;
  methodologyId: string;
  categoryId: string;
  typeId: string;
  countryJurisdiction: string;
  aoiGeometrySummary: string;
  reportingPeriod: string;
  monitoringPeriod: string;
  creditingPeriod?: string;
  unitEligibilityLabels: string[];
  evidencePacketIds: string[];
  blockchainHashes: string[];
  dataSourceIds: string[];
  validationStatus: string;
  verifierStatus: string;
  claimType: string;
  limitations: string[];
  exportedAt: string;
};

export type DmrvProjectContextSnapshot = Pick<
  DmrvProjectContext,
  | 'projectId'
  | 'projectName'
  | 'organization'
  | 'categorySlug'
  | 'categoryTitle'
  | 'typeId'
  | 'typeTitle'
  | 'location'
  | 'reporting'
  | 'methodology'
  | 'reviewer'
  | 'blockchain'
  | 'status'
>;

export type DmrvMethodologyContext = {
  name: string;
  standardFramework: string;
  domain: string;
  uncertaintyRules: string;
  requiredEvidenceSources: string;
  status: DmrvSectionStatus;
};

export type DmrvDataSourceContext = {
  satelliteProvider: string;
  selectedSatellites: string;
  sensorConfiguration: string;
  lidarSources: string[];
  monitoringWindow: string;
  cloudCoverLimit: string;
  spatialResolution: string;
  sourceIds: string;
  apiStatus: string;
  status: DmrvSectionStatus;
};

export type DmrvEvidenceSourceRow = {
  inputKey: string;
  inputLabel: string;
  configType: string;
  status: string;
  providerRef: string;
  filesOrRefs: string;
  qaStatus: DmrvSectionStatus;
};

export type DmrvValidationRuleRow = {
  ruleId: string;
  label: string;
  enabled: boolean;
  result: 'pass' | 'fail' | 'needs_review' | 'not_configured';
};

export type DmrvEvidencePacketContext = {
  packetIds: string[];
  title: string;
  visibility: string;
  includesMap: boolean;
  includesRawData: boolean;
  includesReviewerNotes: boolean;
  appendicesSummary: string;
  status: DmrvSectionStatus;
};

export type DmrvEvidenceContext = {
  configuredInputs: number;
  evidencePacketIds: string[];
  evidenceSourcesSummary: string;
  qaQcStatus: DmrvSectionStatus;
  evidenceRows: DmrvEvidenceSourceRow[];
};

export type DmrvFieldPlotContext = {
  plotCount: number;
  samplingMethod: string;
  fieldMeasurementType: string;
  linkedSatellite: string;
  status: DmrvSectionStatus;
};

export type DmrvValidationContext = {
  rulesActive: number;
  reviewerRequired: boolean;
  humanVerificationRequired: boolean;
  status: DmrvSectionStatus;
  rules: DmrvValidationRuleRow[];
};

export type DmrvCalculationContext = {
  summary: string;
  uncertaintyNote: string;
  status: DmrvSectionStatus;
};

export type DmrvBlockchainContext = {
  projectHash?: string;
  anchoredInputs: string[];
  ledgerRecordId?: string;
  status: DmrvSectionStatus;
};

export type DmrvBlockchainAnchorStatus = 'pending' | 'anchored' | 'failed';

export type DmrvReportBlockchainAnchor = {
  anchorId: string;
  reportId: string;
  versionId: string;
  evidencePacketId?: string;
  reportJsonHash: string;
  evidenceBundleHash?: string;
  timestamp: string;
  actor: DmrvAuditActor;
  transactionRef?: string;
  status: DmrvBlockchainAnchorStatus;
};

export type DmrvReportVersion = {
  versionId: string;
  label: string;
  versionNumber: string;
  createdAt: string;
  reportJsonHash: string;
  changeSummary: string;
  workflowStep: string;
  anchored: boolean;
};

export type DmrvReportAnchorState = {
  currentReportHash: string;
  lastAnchoredHash?: string;
  lastAnchoredVersionId?: string;
  lastAnchoredAt?: string;
  evidencePacketHash?: string;
  hasUnanchoredChanges: boolean;
};

export type DmrvInteroperabilityContext = {
  metadata: DmrvInteroperabilityMetadata;
  registryReady: boolean;
};

export type DmrvReport = {
  reportId: string;
  projectId: string;
  categoryId: string;
  categoryLabel: string;
  typeId: string;
  typeLabel: string;
  reportType: DmrvReportType;
  version: string;
  status: DmrvReportStatus;
  createdAt: string;
  updatedAt: string;
  projectContext: DmrvProjectContextSnapshot | null;
  methodologyContext: DmrvMethodologyContext;
  dataSourceContext: DmrvDataSourceContext;
  evidenceContext: DmrvEvidenceContext;
  fieldPlotContext: DmrvFieldPlotContext;
  validationContext: DmrvValidationContext;
  evidencePacketContext: DmrvEvidencePacketContext;
  calculationContext: DmrvCalculationContext;
  blockchainContext: DmrvBlockchainContext;
  interoperabilityContext: DmrvInteroperabilityContext;
  sections: DmrvReportSection[];
  auditTrail: DmrvAuditEvent[];
  readinessScore: DmrvReadinessScore;
  inputConfigs: DmrvInputConfig[];
  versions: DmrvReportVersion[];
  blockchainAnchors: DmrvReportBlockchainAnchor[];
  anchorState: DmrvReportAnchorState;
};

export type DmrvReportSyncMeta = {
  actor?: DmrvAuditActor;
  workflowStep: string;
  changeSummary: string;
  fieldChanged?: string;
  previousSummary?: string;
  sourceEvidenceId?: string;
  hash?: string;
};
