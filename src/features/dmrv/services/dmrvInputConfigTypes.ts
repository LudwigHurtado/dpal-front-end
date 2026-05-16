import type { DmrvInputConfigType } from '../dmrvInputRegistry';

export type DmrvConfigStatus =
  | 'not_configured'
  | 'draft'
  | 'ready'
  | 'verified'
  | 'blockchain_anchored';

export type DmrvEvidenceVisibility = 'private' | 'validator_only' | 'public';

export type DmrvProjectContext = {
  projectName: string;
  projectId: string;
  locationAoiId: string;
  methodology: string;
  reportingPeriod: string;
  responsibleOrganization: string;
  validatorReviewer: string;
};

export type DmrvValidationRules = {
  requireCoordinates: boolean;
  requireTimestamp: boolean;
  requireSourceDocument: boolean;
  requireReviewerApproval: boolean;
  requireFieldVerification: boolean;
  requireBeforeAfterComparison: boolean;
  requireAnomalyDetection: boolean;
  requireUncertaintyScore: boolean;
};

export type DmrvEvidencePacketSettings = {
  title: string;
  includeMapSnapshot: boolean;
  includeRawDataReference: boolean;
  includeReviewerNotes: boolean;
  includeAttachments: boolean;
  generateQrCode: boolean;
  publicVisibility: DmrvEvidenceVisibility;
};

export type DmrvBlockchainLink = {
  status: 'none' | 'pending' | 'anchored' | 'unavailable';
  lastAnchoredHash?: string;
  anchoredAt?: string;
  ledgerRecordId?: string;
  qrEvidenceUrl?: string;
  serviceMessage?: string;
};

/** Input-specific settings — all optional strings/booleans for form flexibility. */
export type DmrvDataSourceSettings = Record<string, string | number | boolean | undefined>;

export type DmrvInputConfig = {
  projectId: string;
  categorySlug: string;
  typeId: string;
  inputKey: string;
  inputLabel: string;
  configType: DmrvInputConfigType;
  status: DmrvConfigStatus;
  projectContext: DmrvProjectContext;
  dataSourceSettings: DmrvDataSourceSettings;
  validationRules: DmrvValidationRules;
  evidencePacket: DmrvEvidencePacketSettings;
  blockchain: DmrvBlockchainLink;
  evidencePacketId?: string;
  updatedAt: string;
};

export type DmrvInputConfigTestResult = {
  ok: boolean;
  message: string;
  checkedAt: string;
};

export type DmrvEvidencePacketResult = {
  ok: boolean;
  packetId?: string;
  integrityHash?: string;
  message: string;
};
