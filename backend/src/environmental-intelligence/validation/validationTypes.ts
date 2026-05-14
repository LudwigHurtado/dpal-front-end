/** How the review is intended to be performed (does not imply verification). */
export type EnvironmentalValidationRequestType =
  | 'human_review'
  | 'field_inspection'
  | 'drone_survey'
  | 'lab_sample'
  | 'sensor_check'
  | 'community_followup'
  | 'document_review'
  | 'expert_review';

/** Workflow state of the validation request record. */
export type EnvironmentalValidationRequestStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** Outcome of a completed validation (distinct from request status). */
export type EnvironmentalValidationResult =
  | 'pending'
  | 'validated'
  | 'rejected'
  | 'inconclusive'
  | 'superseded';

export type EnvironmentalValidationTargetType =
  | 'evidence_packet'
  | 'accountability_profile'
  | 'combined';

export type EnvironmentalValidationSafetyLabels = {
  pending_verification: boolean;
  human_verified: boolean;
  blockchain_anchored: boolean;
};

export type DpalValidationRequest = {
  validationId: string;
  targetType: EnvironmentalValidationTargetType;
  targetId: string;
  profileId?: string;
  packetId?: string;
  useCaseId?: string;
  requestType: EnvironmentalValidationRequestType;
  status: EnvironmentalValidationRequestStatus;
  priority: string;
  requestedBy?: string;
  assignedTo?: string;
  reviewerName?: string;
  reviewerRole?: string;
  reviewNotes?: string;
  validationResult?: EnvironmentalValidationResult;
  safetyLabels: EnvironmentalValidationSafetyLabels;
  limitations: string[];
  evidenceRefs: unknown;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type CreateValidationRequestInput = {
  packetId?: string;
  profileId?: string;
  useCaseId?: string;
  requestType: EnvironmentalValidationRequestType | string;
  /** e.g. low | normal | high */
  priority?: string;
  requestedBy?: string;
  evidenceRefs?: unknown;
};

export type UpdateValidationRequestPatch = Partial<
  Pick<
    DpalValidationRequest,
    | 'priority'
    | 'requestedBy'
    | 'useCaseId'
    | 'reviewNotes'
    | 'limitations'
    | 'evidenceRefs'
  >
>;

export type ValidationRequestListFilters = {
  status?: string;
  targetType?: string;
  packetId?: string;
  profileId?: string;
};
