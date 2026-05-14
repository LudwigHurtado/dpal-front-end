import type { AccountabilityProfileType } from '../accountabilityProfiles/accountabilityProfileTypes';
import type { EnvironmentalValidationRequestType } from '../validation/validationTypes';

export type BusinessWorkflowStatus =
  | 'draft'
  | 'running'
  | 'evidence_collected'
  | 'validation_requested'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type BusinessWorkflowInput = {
  workflowId: string;
  companyName?: string;
  facilityName?: string;
  facilityId?: string;
  address?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  claimText?: string;
  claimSourceUrl?: string;
  useCaseId?: string;
  profileType?: AccountabilityProfileType | string;
  runEvidenceNow?: boolean;
  createValidationRequest?: boolean;
  validationRequestType?: EnvironmentalValidationRequestType | string;
  priority?: string;
  evidenceRefs?: unknown;
};

export type BusinessWorkflowOutputSummary = Record<string, unknown>;

export type BusinessWorkflowSafetyLabels = {
  pending_verification: boolean;
  human_verified: boolean;
  blockchain_anchored: boolean;
};

export type BusinessWorkflowRun = {
  workflowRunId: string;
  workflowId: string;
  workflowName: string;
  status: BusinessWorkflowStatus;
  profileId?: string;
  packetId?: string;
  validationId?: string;
  useCaseId?: string;
  companyName?: string;
  facilityName?: string;
  claimText?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  input: BusinessWorkflowInput;
  outputSummary: BusinessWorkflowOutputSummary;
  safetyLabels: BusinessWorkflowSafetyLabels;
  limitations: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type UpdateBusinessWorkflowRunPatch = {
  companyName?: string;
  facilityName?: string;
  claimText?: string;
  operatorNotes?: string;
};

export type BusinessWorkflowListFilters = {
  workflowId?: string;
  status?: string;
};
