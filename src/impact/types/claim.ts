export type ClaimType =
  | 'carbon_reduction'
  | 'plastic_recovery'
  | 'resilience'
  | 'biodiversity'
  | 'community_impact';

export type ClaimStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface ImpactClaim {
  id: string;
  projectId: string;
  projectTitle: string;
  type: ClaimType;
  status: ClaimStatus;
  quantity?: number;
  unit?: string;
  methodology?: string;
  description?: string;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  carbon_reduction: 'Carbon Reduction',
  plastic_recovery: 'Plastic Recovery',
  resilience: 'Climate Resilience',
  biodiversity: 'Biodiversity',
  community_impact: 'Community Impact',
};

export const CLAIM_TYPE_ICONS: Record<ClaimType, string> = {
  carbon_reduction: '🌬️',
  plastic_recovery: '♻️',
  resilience: '🛡️',
  biodiversity: '🦋',
  community_impact: '🤝',
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};
