export type MissionLifecycleStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface MissionIdentity {
  id: string;
  title: string;
  subtitle: string;
  missionType: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  status: MissionLifecycleStatus;
}

export interface MissionReportOverview {
  reportId: string;
  issueType: string;
  location: string;
  snapshot: string;
  imageUrl: string;
}

export interface MissionDetails {
  objective: string;
  deadline: string;
  rewardLabel: string;
  escrowLabel: string;
  rules: string[];
}

export interface MissionTask {
  id: string;
  title: string;
  done: boolean;
  proofRequired: string;
}

export interface TeamMemberAssignment {
  role: 'Lead' | 'Helper' | 'Verifier' | 'Witness';
  name: string;
  permissions: string[];
}

export interface MissionProgress {
  percent: number;
  statusLabel: string;
  timeline: string[];
}

export interface EscrowCondition {
  label: string;
  value: string;
}

export interface ProofRequirement {
  id: string;
  label: string;
  completed: boolean;
}

export interface MissionAssignmentV2Model {
  identity: MissionIdentity;
  report: MissionReportOverview;
  details: MissionDetails;
  tasks: MissionTask[];
  team: TeamMemberAssignment[];
  progress: MissionProgress;
  escrowConditions: EscrowCondition[];
  proof: ProofRequirement[];
}

export interface LayerExecutionState {
  report: 'ready' | 'synced';
  evidence: 'pending' | 'collected';
  validation: 'pending' | 'approved' | 'rejected';
  mission: MissionLifecycleStatus;
  escrow: 'pending' | 'locked' | 'released' | 'disputed';
  resolution: 'idle' | 'in_progress' | 'resolved';
  outcome: 'pending' | 'recorded';
  reputation: 'unchanged' | 'awarded';
  governance: 'open' | 'closed';
}

export type LayerAction =
  | 'syncReport'
  | 'collectEvidence'
  | 'approveValidation'
  | 'rejectValidation'
  | 'lockEscrow'
  | 'releaseEscrow'
  | 'disputeEscrow'
  | 'startResolution'
  | 'resolveCase'
  | 'recordOutcome'
  | 'awardReputation'
  | 'closeGovernance';
