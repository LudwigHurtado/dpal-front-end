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
  title: string;
  reportId: string;
  issueType: string;
  location: string;
  snapshot: string;
  imageUrl?: string;
}

export interface MissionDetails {
  missionType: string;
  objective: string;
  deadline: string;
  rewardLabel: string;
  rewardType: 'Coins' | 'Tokens' | 'HC' | 'None';
  rewardAmount: number;
  escrowLabel: string;
  rules: string[];
  objectivePhases: Array<{
    id: string;
    title: string;
    items: Array<{
      id: string;
      label: string;
      done: boolean;
      notes?: string;
      images: string[];
    }>;
  }>;
}

export interface MissionTask {
  id: string;
  title: string;
  done: boolean;
  proofRequired: string;
}

export interface TeamPrivateMessage {
  id: string;
  body: string;
  sentAt: string;
  from: string;
}

/** Roles for V2 team assignments (extends prior four with coordination roles). */
export type MissionTeamRole =
  | 'Lead'
  | 'Helper'
  | 'Verifier'
  | 'Witness'
  | 'Driver'
  | 'Support'
  | 'Coordinator';

export interface TeamMemberAssignment {
  id: string;
  role: MissionTeamRole;
  name: string;
  profile: string;
  permissions: string[];
  privateMessages?: TeamPrivateMessage[];
}

export type MissionSourceType = 'report_derived' | 'user_created' | 'ai_suggested';

export type MissionVisibility = 'public' | 'invite_only' | 'hybrid';

export type MissionJoinPolicy = 'open' | 'approval_required' | 'invite_only';

export type MissionParticipantStatus = 'invited' | 'requested' | 'accepted' | 'declined' | 'removed';

export interface MissionCreator {
  userId: string;
  displayName: string;
  profileHandle: string;
}

export interface MissionInvite {
  id: string;
  userId: string;
  displayName: string;
  profileHandle: string;
  role: MissionTeamRole;
  status: MissionParticipantStatus;
  sentAt: string;
  respondedAt?: string;
  note?: string;
}

export interface MissionJoinRequest {
  id: string;
  userId: string;
  displayName: string;
  profileHandle: string;
  requestedRole: MissionTeamRole;
  message?: string;
  status: 'pending' | 'approved' | 'declined';
  requestedAt: string;
  reviewedAt?: string;
}

export interface MissionParticipationSettings {
  visibility: MissionVisibility;
  joinPolicy: MissionJoinPolicy;
  participantLimit: number;
  allowRoleSelection: boolean;
  requiresLeadApproval: boolean;
  minimumTrustScore?: number;
  ageRestricted?: boolean;
  localOnly?: boolean;
}

export interface MissionCommunityMeta {
  sourceType: MissionSourceType;
  createdBy?: MissionCreator;
  createdAt: string;
  startsAt?: string;
  invitees: MissionInvite[];
  joinRequests: MissionJoinRequest[];
  tags: string[];
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

export type MissionEscrowStatus =
  | 'not_applicable'
  | 'pending_funding'
  | 'locked'
  | 'release_requested'
  | 'released'
  | 'disputed'
  | 'cancelled';

export interface MissionEscrowRecord {
  enabled: boolean;
  status: MissionEscrowStatus;
  rewardType: 'Coins' | 'Tokens' | 'HC' | 'None';
  rewardAmount: number;
  fundedBy?: string;
  lockedAt?: string;
  lockedBy?: string;
  releaseRequestedAt?: string;
  releaseRequestedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  disputeReason?: string;
  disputedAt?: string;
  disputedBy?: string;
  notes?: string;
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
  /** Tracked escrow workflow (Lead lock → request release → Verifier approve/dispute). */
  escrow: MissionEscrowRecord;
  /** How participants join and visibility (same engine for report- and user-sourced missions). */
  participation: MissionParticipationSettings;
  /** Creator, invites, join requests — Phase 2+ fill invitees/requests. */
  community: MissionCommunityMeta;
  /** Platform layer pipeline — persisted with workspace when present. */
  layerExecution?: LayerExecutionState;
}

/** Maps persisted escrow status to the read-only Service Layer strip (escrow actions live on EscrowConditionsSector). */
export function layerEscrowDisplayFromRecord(record: MissionEscrowRecord): LayerExecutionState['escrow'] {
  switch (record.status) {
    case 'not_applicable':
      return 'not_applicable';
    case 'pending_funding':
      return 'pending';
    case 'locked':
      return 'locked';
    case 'release_requested':
      return 'release_requested';
    case 'released':
      return 'released';
    case 'disputed':
      return 'disputed';
    case 'cancelled':
      return 'pending';
    default:
      return 'pending';
  }
}

export interface LayerExecutionState {
  report: 'ready' | 'synced';
  evidence: 'pending' | 'collected';
  validation: 'pending' | 'approved' | 'rejected';
  mission: MissionLifecycleStatus;
  escrow: 'not_applicable' | 'pending' | 'locked' | 'release_requested' | 'released' | 'disputed';
  resolution: 'idle' | 'in_progress' | 'resolved';
  outcome: 'pending' | 'recorded';
  reputation: 'unchanged' | 'awarded';
  governance: 'open' | 'closed';
}

/** Single source of truth for initial layer pipeline — hook and adapter merge both use this. */
export const DEFAULT_LAYER_EXECUTION_STATE: LayerExecutionState = {
  report: 'ready',
  evidence: 'pending',
  validation: 'pending',
  mission: 'draft',
  escrow: 'pending',
  resolution: 'idle',
  outcome: 'pending',
  reputation: 'unchanged',
  governance: 'open',
};

/** Escrow workflow is driven from `EscrowConditionsSector`, not generic layer buttons. */
export type LayerAction =
  | 'syncReport'
  | 'collectEvidence'
  | 'approveValidation'
  | 'rejectValidation'
  | 'startResolution'
  | 'resolveCase'
  | 'recordOutcome'
  | 'awardReputation'
  | 'closeGovernance';
