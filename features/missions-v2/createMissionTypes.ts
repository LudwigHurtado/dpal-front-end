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

/** Category strings stored on missions — used by card/chip pickers on Create Mission. */
export const MISSION_CATEGORY_CARDS: {
  value: string;
  label: string;
  short: string;
  icon: string;
}[] = [
  { value: 'Community Cleanup', label: 'Cleanup', short: 'Parks, routes, litter', icon: '🧹' },
  { value: 'Community Help', label: 'Community Help', short: 'Neighbors helping neighbors', icon: '🤝' },
  { value: 'Rescue Support', label: 'Rescue Support', short: 'Logistics & on-scene help', icon: '🛟' },
  { value: 'Supply Delivery', label: 'Delivery / Supply Run', short: 'Goods & essentials', icon: '📦' },
  { value: 'Family Safe', label: 'Family Safe', short: 'Family-focused support', icon: '🏠' },
  { value: 'Neighborhood Watch', label: 'Neighborhood Watch', short: 'Safety & awareness', icon: '👁️' },
  { value: 'Accountability Follow-Up', label: 'Accountability Follow-Up', short: 'Reporting follow-through', icon: '📋' },
];

/** Quick chips on the choice screen — prefill category + mission type when starting the wizard. */
export const QUICK_START_PRESETS: { label: string; category: string; missionType: string }[] = [
  { label: 'Cleanup', category: 'Community Cleanup', missionType: 'cleanup' },
  { label: 'Community Help', category: 'Community Help', missionType: 'community_help' },
  { label: 'Rescue Support', category: 'Community Help', missionType: 'escort_support' },
  { label: 'Supply Delivery', category: 'Supply Delivery', missionType: 'donation_supply' },
  { label: 'Family Safe', category: 'Family Safe', missionType: 'good_deed' },
  { label: 'Neighborhood Watch', category: 'Neighborhood Watch', missionType: 'neighborhood_watch' },
  { label: 'Accountability Follow-Up', category: 'Accountability Follow-Up', missionType: 'accountability_followup' },
];

export interface SuggestedJoinMissionCard {
  id: string;
  title: string;
  description: string;
  locationLabel: string;
  isRemote: boolean;
  rewardLabel: string;
  hasReward: boolean;
  participantCount: number;
  icon: string;
  tags: string[];
}

/** Sample “join a mission” cards — browse goes to Mission Assignment V2 list/workspace. */
export const SUGGESTED_JOIN_MISSIONS: SuggestedJoinMissionCard[] = [
  {
    id: 'sg-1',
    title: 'Community Cleanup',
    description: 'Weekend sweep & supply staging for a high-need corridor.',
    locationLabel: 'Detroit, MI',
    isRemote: false,
    rewardLabel: '1,000 DPAL HC',
    hasReward: true,
    participantCount: 18,
    icon: '🧹',
    tags: ['NP Patrol', 'Gathering supplies'],
  },
  {
    id: 'sg-2',
    title: 'Family Support',
    description: 'Coordinate rides and check-ins for families in transition.',
    locationLabel: 'Regional',
    isRemote: true,
    rewardLabel: 'No reward',
    hasReward: false,
    participantCount: 9,
    icon: '🏠',
    tags: ['Volunteer', 'Coordination'],
  },
  {
    id: 'sg-3',
    title: 'Delivery / Supply Run',
    description: 'Last-mile drop-offs for food banks and shelters.',
    locationLabel: 'Metro hub',
    isRemote: false,
    rewardLabel: '500 HC',
    hasReward: true,
    participantCount: 24,
    icon: '📦',
    tags: ['Delivery', 'Supply'],
  },
  {
    id: 'sg-4',
    title: 'Escort / Support',
    description: 'Safe accompaniment for vulnerable community members.',
    locationLabel: 'On request',
    isRemote: false,
    rewardLabel: 'No reward',
    hasReward: false,
    participantCount: 6,
    icon: '🛡️',
    tags: ['Escort', 'Safety'],
  },
  {
    id: 'sg-5',
    title: 'Reporting Follow-Up',
    description: 'Document outcomes after public reports and referrals.',
    locationLabel: 'Remote OK',
    isRemote: true,
    rewardLabel: '250 HC',
    hasReward: true,
    participantCount: 11,
    icon: '📋',
    tags: ['Accountability', 'Follow-up'],
  },
  {
    id: 'sg-6',
    title: 'Volunteer Coordination',
    description: 'Match volunteers to shifts and field teams.',
    locationLabel: 'Multi-site',
    isRemote: false,
    rewardLabel: 'No reward',
    hasReward: false,
    participantCount: 31,
    icon: '📣',
    tags: ['Volunteer', 'Ops'],
  },
];
