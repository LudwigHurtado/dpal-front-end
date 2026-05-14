import type { AccountabilityProfileSafetyLabels } from './accountabilityProfileTypes';

export const DEFAULT_ACCOUNTABILITY_SAFETY_LABELS: AccountabilityProfileSafetyLabels = {
  pending_verification: true,
  human_verified: false,
  blockchain_anchored: false,
};

export const ACCOUNTABILITY_PROFILE_CORE_LIMITATION =
  'This profile organizes screening information and evidence packets. It is not a legal, regulatory, enforcement, registry, VIU, carbon credit, or human verification conclusion.';
