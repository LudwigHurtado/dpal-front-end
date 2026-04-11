/**
 * Mission Marketplace — discovery layer above Mission Assignment V2.
 * Listings can map to future API; kinds describe how a mission was originated.
 */
export type MarketplaceMissionKind =
  | 'ai_generated'
  | 'user_created'
  | 'org_posted'
  | 'emergency'
  | 'local'
  | 'reward_backed';

export const MARKETPLACE_KIND_LABEL: Record<MarketplaceMissionKind, string> = {
  ai_generated: 'AI-generated',
  user_created: 'Community',
  org_posted: 'Organization',
  emergency: 'Emergency',
  local: 'Local',
  reward_backed: 'Reward',
};

export interface MarketplaceListing {
  id: string;
  title: string;
  summary: string;
  kinds: MarketplaceMissionKind[];
  /** City, neighborhood, region, or "Remote" */
  locationLabel: string;
  /** e.g. "1,200 HC" or null if volunteer-only */
  rewardSummary: string | null;
  urgency: 'low' | 'medium' | 'high';
  /** Shown as source line */
  postedByLabel: string;
  slotsOpen?: number;
}
