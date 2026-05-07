import type {
  FloodBlockedMission,
  FloodMissionSafetyClassification,
  FloodRecommendedMission,
  FloodSafeMissionType,
} from '../floodGuardTypes';

const UNSAFE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /walk|wade|enter.*water|flood\s*water/i, reason: 'Walking or entering flood water is never authorized.' },
  { pattern: /drive|vehicle|through.*flood/i, reason: 'Driving through flooded streets is blocked for safety.' },
  { pattern: /bridge.*under|under.*bridge|unstable/i, reason: 'Approaching unstable bridges or fast-moving water is blocked.' },
  { pattern: /private\s*property|trespass/i, reason: 'Unauthorized private property access is blocked.' },
  { pattern: /close.*film|danger.*close|upstream.*flood/i, reason: 'Close-range documentation in hazardous water is blocked.' },
];

const REMOTE: FloodRecommendedMission[] = [
  {
    missionType: 'remote_observation',
    title: 'Remote AOI screening',
    description: 'Continue satellite + rainfall monitoring from desk; no field approach.',
    requiresValidator: false,
  },
  {
    missionType: 'public_data_collection',
    title: 'Public / open-data capture',
    description: 'Aggregate official bulletins, gauge portals, or open civic datasets remotely.',
    requiresValidator: false,
  },
];

const SAFE_DISTANCE: FloodRecommendedMission[] = [
  {
    missionType: 'safe_distance_road_closure_confirm',
    title: 'Road status from safe overlook',
    description: 'Confirm barricades or closures from a designated high-ground vantage only.',
    requiresValidator: true,
  },
  {
    missionType: 'shelter_status_verify',
    title: 'Shelter coordination check',
    description: 'Phone or desk confirmation with shelter operators; avoid travel through inundated corridors.',
    requiresValidator: true,
  },
  {
    missionType: 'safe_high_ground_photo',
    title: 'Documentary photo from safe high ground',
    description: 'Single static image from an approved safe location — no water approach.',
    requiresValidator: true,
  },
];

const POST_EVENT: FloodRecommendedMission[] = [
  {
    missionType: 'post_event_infrastructure_check',
    title: 'Post-recession infrastructure walk-through',
    description: 'After water recedes and authorities clear access, inspect visible damage from safe paths.',
    requiresValidator: true,
  },
  {
    missionType: 'drainage_post_recede_check',
    title: 'Drainage / culvert desk follow-up',
    description: 'Schedule municipal drainage review once flows normalize; photo only from safe berms.',
    requiresValidator: true,
  },
];

const HOME_WINDOW: FloodRecommendedMission[] = [
  {
    missionType: 'home_window_report',
    title: 'Fixed vantage report',
    description: 'Citizen or operator reports from a secured building window with no street entry.',
    requiresValidator: false,
  },
];

const VALIDATOR_DESK: FloodRecommendedMission[] = [
  {
    missionType: 'validator_desk_review',
    title: 'Validator desk review',
    description: 'Human validator reconciles signals before any optional field task is offered.',
    requiresValidator: true,
  },
];

function blockedForAllField(): FloodBlockedMission[] {
  const reasons: FloodBlockedMission[] = [];
  for (const u of UNSAFE_PATTERNS) {
    reasons.push({ missionType: `unsafe:${u.pattern.source}`, reason: u.reason });
  }
  return reasons;
}

export function runMissionDispatchAgent(classification: FloodMissionSafetyClassification): {
  recommendedMissions: FloodRecommendedMission[];
  blockedMissions: FloodBlockedMission[];
} {
  const blockedMissions: FloodBlockedMission[] = blockedForAllField();

  switch (classification) {
    case 'no_mission_allowed':
      blockedMissions.push({
        missionType: '*',
        reason: 'Mission Safety Agent: no_mission_allowed — keep all work remote and defer field tasks.',
      });
      return { recommendedMissions: [...REMOTE], blockedMissions };

    case 'remote_only':
      return { recommendedMissions: [...REMOTE, ...VALIDATOR_DESK], blockedMissions };

    case 'safe_distance_only':
      return {
        recommendedMissions: [...REMOTE, ...SAFE_DISTANCE, ...HOME_WINDOW],
        blockedMissions,
      };

    case 'post_event_only':
      return {
        recommendedMissions: [...REMOTE, ...POST_EVENT],
        blockedMissions,
      };

    case 'validator_review_required':
      return { recommendedMissions: [...REMOTE, ...VALIDATOR_DESK], blockedMissions };

    case 'mission_allowed':
    default:
      return {
        recommendedMissions: [...REMOTE, ...SAFE_DISTANCE, ...POST_EVENT, ...HOME_WINDOW],
        blockedMissions,
      };
  }
}

export function isKnownSafeMissionType(t: string): t is FloodSafeMissionType {
  return [
    'remote_observation',
    'public_data_collection',
    'safe_distance_road_closure_confirm',
    'shelter_status_verify',
    'safe_high_ground_photo',
    'home_window_report',
    'post_event_infrastructure_check',
    'drainage_post_recede_check',
    'validator_desk_review',
  ].includes(t as FloodSafeMissionType);
}

export function isMissionAllowedForClassification(
  classification: FloodMissionSafetyClassification,
  missionType: FloodSafeMissionType,
): boolean {
  const { recommendedMissions } = runMissionDispatchAgent(classification);
  return recommendedMissions.some((m) => m.missionType === missionType);
}

const ORDER: Record<FloodMissionSafetyClassification, number> = {
  no_mission_allowed: 0,
  remote_only: 1,
  safe_distance_only: 2,
  post_event_only: 3,
  validator_review_required: 4,
  mission_allowed: 5,
};

export function safetyClassificationAtLeastAsStrict(a: FloodMissionSafetyClassification, b: FloodMissionSafetyClassification): boolean {
  return ORDER[a] <= ORDER[b];
}
