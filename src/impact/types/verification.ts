export type VerificationStatus =
  | 'submitted'
  | 'needs_evidence'
  | 'under_review'
  | 'verified'
  | 'flagged'
  | 'rejected';

export interface VerificationReview {
  id: string;
  projectId: string;
  projectTitle: string;
  status: VerificationStatus;
  reviewerId?: string;
  reviewerName?: string;
  notes?: string;
  requestedEvidenceTypes?: string[];
  submittedAt: string;
  updatedAt: string;
  evidenceCount: number;
}

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  submitted: 'Submitted',
  needs_evidence: 'Needs Evidence',
  under_review: 'Under Review',
  verified: 'Verified',
  flagged: 'Flagged',
  rejected: 'Rejected',
};

export const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, string> = {
  submitted: '#6b7280',
  needs_evidence: '#f59e0b',
  under_review: '#3b82f6',
  verified: '#10b981',
  flagged: '#f97316',
  rejected: '#ef4444',
};
