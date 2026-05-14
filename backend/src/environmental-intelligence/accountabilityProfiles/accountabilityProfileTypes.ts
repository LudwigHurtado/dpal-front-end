export type AccountabilityProfileType =
  | 'company'
  | 'facility'
  | 'project'
  | 'site'
  | 'incident'
  | 'supplier'
  | 'property'
  | 'public_asset';

export type AccountabilityProfileStatus =
  | 'draft'
  | 'active'
  | 'evidence_pending'
  | 'evidence_collected'
  | 'under_review'
  | 'validation_requested'
  | 'closed'
  | 'superseded';

export type AccountabilityProfileValidationStatus =
  | 'pending_verification'
  | 'field_validation_requested'
  | 'under_review'
  | 'human_verified'
  | 'rejected'
  | 'superseded';

export type AccountabilityProfileSafetyLabels = {
  pending_verification: boolean;
  human_verified: boolean;
  blockchain_anchored: boolean;
};

export type DpalAccountabilityProfile = {
  profileId: string;
  profileType: AccountabilityProfileType;
  companyName?: string;
  facilityName?: string;
  facilityId?: string;
  address?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  useCaseId?: string;
  claimText?: string;
  claimSourceUrl?: string;
  status: AccountabilityProfileStatus;
  riskLevel?: string;
  anomalySummary?: string;
  validationStatus: AccountabilityProfileValidationStatus;
  safetyLabels: AccountabilityProfileSafetyLabels;
  limitations: string[];
  evidencePacketIds: string[];
  situationRoomIds: string[];
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountabilityProfileInput = {
  profileType: AccountabilityProfileType | string;
  companyName?: string;
  facilityName?: string;
  facilityId?: string;
  address?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  useCaseId?: string;
  claimText?: string;
  claimSourceUrl?: string;
  /** When true, HTTP layer may run evidence after create; builder can set initial status hint */
  runEvidenceNow?: boolean;
};

export type UpdateAccountabilityProfileInput = Partial<
  Omit<DpalAccountabilityProfile, 'profileId' | 'createdAt' | 'updatedAt'>
>;

export type AccountabilityProfileListFilters = {
  useCaseId?: string;
  status?: AccountabilityProfileStatus | string;
  companyName?: string;
};
