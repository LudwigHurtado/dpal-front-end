export enum ReportLifecycleState {
  Draft = 'Draft',
  Submitted = 'Submitted',
  UnderReview = 'UnderReview',
  CommunityVerified = 'CommunityVerified',
  Escalated = 'Escalated',
  AgencyResponded = 'AgencyResponded',
  Resolved = 'Resolved',
  Archived = 'Archived',
}

const transitions: Record<ReportLifecycleState, ReportLifecycleState[]> = {
  [ReportLifecycleState.Draft]: [ReportLifecycleState.Submitted],
  [ReportLifecycleState.Submitted]: [ReportLifecycleState.UnderReview, ReportLifecycleState.Archived],
  [ReportLifecycleState.UnderReview]: [ReportLifecycleState.CommunityVerified, ReportLifecycleState.Escalated, ReportLifecycleState.Archived],
  [ReportLifecycleState.CommunityVerified]: [ReportLifecycleState.Escalated, ReportLifecycleState.Resolved],
  [ReportLifecycleState.Escalated]: [ReportLifecycleState.AgencyResponded, ReportLifecycleState.Resolved],
  [ReportLifecycleState.AgencyResponded]: [ReportLifecycleState.Resolved, ReportLifecycleState.Escalated],
  [ReportLifecycleState.Resolved]: [ReportLifecycleState.Archived],
  [ReportLifecycleState.Archived]: [],
};

export function canTransition(from: ReportLifecycleState, to: ReportLifecycleState): boolean {
  return transitions[from]?.includes(to) || false;
}
