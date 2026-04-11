import type { MissionCreator, MissionJoinPolicy, MissionVisibility } from './types';

/** Phase 1 — structured input for user-created missions (same V2 engine as report-derived). */
export interface CreateMissionInput {
  title: string;
  category: string;
  missionType: string;
  description: string;
  location: string;
  isRemote: boolean;
  urgency: 'low' | 'medium' | 'high';
  visibility: MissionVisibility;
  joinPolicy: MissionJoinPolicy;
  participantLimit: number;
  startsAt?: string;
  deadline?: string;
  rewardType: 'Coins' | 'Tokens' | 'HC' | 'None';
  rewardAmount: number;
  requiresProof: boolean;
  proofLabels: string[];
  initialTasks: string[];
  creator: MissionCreator;
}

export const USER_MISSION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'community_help', label: 'Community help' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'evidence_gathering', label: 'Evidence gathering' },
  { value: 'escort_support', label: 'Escort / support' },
  { value: 'donation_supply', label: 'Donation / supply run' },
  { value: 'volunteer_coordination', label: 'Volunteer coordination' },
  { value: 'good_deed', label: 'Family-safe good deed' },
  { value: 'neighborhood_watch', label: 'Neighborhood watch' },
  { value: 'accountability_followup', label: 'Accountability / follow-up' },
  { value: 'other', label: 'Other' },
];
