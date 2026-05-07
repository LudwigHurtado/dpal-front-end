/**
 * DPAL FloodGuard — Mission bridge to the larger DPAL mission system (Stage 12F).
 *
 * Goal:
 *   Convert agent-approved, safety-gated FloodGuard recommendations into a
 *   DPAL-shaped mission record that can later be migrated to a central DPAL
 *   mission service. Until that service exists, records are persisted in the
 *   FloodGuard JSON store so they survive restarts.
 *
 * Hard rules (do NOT relax):
 *   - The dispatch path stays gated by `runMissionSafetyAgent` / `runMissionDispatchAgent`.
 *   - Only safe categories are creatable (no water entry, no flooded streets,
 *     no unstable bridges, no private property entry, no electrical hazards).
 *   - Each record carries the legal disclaimer and a forbidden-action list.
 */

import type {
  FloodAgentFinding,
  FloodMissionBridgeRecord,
  FloodMissionSafetyClassification,
  FloodRainfallMeta,
  FloodRecommendedMission,
  FloodSafeMissionType,
  FloodSatelliteMeta,
  FloodWaterLevelMeta,
} from './floodGuardTypes';

export const FLOODGUARD_LEGAL =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

/** DPAL-side safe mission categories (independent of internal `FloodSafeMissionType`). */
export type DpalSafeMissionCategory =
  | 'remote_observation'
  | 'post_event_infrastructure_check'
  | 'safe_distance_road_status'
  | 'shelter_status_verification'
  | 'public_data_collection'
  | 'drainage_condition_after_recede'
  | 'validator_desk_review';

export const ALLOWED_DPAL_MISSION_CATEGORIES: DpalSafeMissionCategory[] = [
  'remote_observation',
  'post_event_infrastructure_check',
  'safe_distance_road_status',
  'shelter_status_verification',
  'public_data_collection',
  'drainage_condition_after_recede',
  'validator_desk_review',
];

export const FORBIDDEN_MISSION_ACTIONS: string[] = [
  'entering flood water',
  'driving through flooded roads',
  'approaching fast-moving water',
  'entering private property without permission',
  'crossing unstable bridges',
  'going near damaged electrical infrastructure',
];

/** Map an internal FloodGuard safe mission type to a DPAL-side category. */
export function mapToDpalCategory(missionType: FloodSafeMissionType): DpalSafeMissionCategory {
  switch (missionType) {
    case 'remote_observation':
      return 'remote_observation';
    case 'public_data_collection':
      return 'public_data_collection';
    case 'safe_distance_road_closure_confirm':
      return 'safe_distance_road_status';
    case 'shelter_status_verify':
      return 'shelter_status_verification';
    case 'safe_high_ground_photo':
      return 'safe_distance_road_status';
    case 'home_window_report':
      return 'remote_observation';
    case 'post_event_infrastructure_check':
      return 'post_event_infrastructure_check';
    case 'drainage_post_recede_check':
      return 'drainage_condition_after_recede';
    case 'validator_desk_review':
      return 'validator_desk_review';
    default:
      return 'remote_observation';
  }
}

/** Allowed proof types per DPAL category — never includes anything requiring water proximity. */
export function allowedProofTypesFor(category: DpalSafeMissionCategory): string[] {
  switch (category) {
    case 'remote_observation':
      return ['screenshot_dashboard', 'satellite_layer_capture', 'rainfall_chart_capture', 'gauge_chart_capture'];
    case 'public_data_collection':
      return ['public_dataset_url', 'official_bulletin_pdf', 'gauge_portal_screenshot', 'open_data_export_csv'];
    case 'safe_distance_road_status':
      return ['photo_from_designated_overlook', 'photo_from_safe_high_ground', 'voice_note_from_safe_distance'];
    case 'shelter_status_verification':
      return ['phone_call_log', 'shelter_operator_confirmation', 'desk_attestation_form'];
    case 'drainage_condition_after_recede':
      return ['post_recession_photo_from_berm', 'municipal_drainage_log', 'desk_attestation_form'];
    case 'post_event_infrastructure_check':
      return ['post_event_photo_from_safe_path', 'authority_clearance_reference', 'municipal_inspection_log'];
    case 'validator_desk_review':
      return ['validator_desk_note', 'reconciliation_log', 'sign_off_attestation'];
    default:
      return ['desk_attestation_form'];
  }
}

export interface BuildMissionBridgeInput {
  missionId: string;
  zoneId: string;
  cityId: string;
  missionType: FloodSafeMissionType;
  recommended?: FloodRecommendedMission | null;
  safetyClassification: FloodMissionSafetyClassification;
  safetyRationale: string[];
  agentFindings: FloodAgentFinding[];
  createdBy: string;
  sourceAlertId?: string | null;
  linkedEvidencePacketId?: string | null;
  linkedSituationRoomId?: string | null;
  rainfallMeta?: FloodRainfallMeta;
  satelliteMeta?: FloodSatelliteMeta;
  waterLevelMeta?: FloodWaterLevelMeta;
}

/**
 * Pure function — builds the bridge record. Does NOT enforce safety; callers
 * (the store) must run the dispatch gate first. Returns null if the requested
 * mission category is not on the allow list (defense in depth).
 */
export function buildMissionBridgeRecord(input: BuildMissionBridgeInput): FloodMissionBridgeRecord | null {
  const dpalCategory = mapToDpalCategory(input.missionType);
  if (!ALLOWED_DPAL_MISSION_CATEGORIES.includes(dpalCategory)) return null;

  const title = input.recommended?.title ?? defaultTitleFor(dpalCategory);
  const description = input.recommended?.description ?? defaultDescriptionFor(dpalCategory);
  const allowedProofTypes = allowedProofTypesFor(dpalCategory);

  return {
    missionId: input.missionId,
    source: 'floodguard',
    sourceAlertId: input.sourceAlertId ?? null,
    sourceZoneId: input.zoneId,
    cityId: input.cityId,
    missionType: input.missionType,
    dpalCategory,
    missionTitle: title,
    missionDescription: description,
    safetyClassification: input.safetyClassification,
    safetyRationale: [...input.safetyRationale],
    allowedProofTypes,
    forbiddenActions: [...FORBIDDEN_MISSION_ACTIONS],
    status: 'open',
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    linkedEvidencePacketId: input.linkedEvidencePacketId ?? null,
    linkedSituationRoomId: input.linkedSituationRoomId ?? null,
    agentFindings: [...input.agentFindings],
    rainfallMeta: input.rainfallMeta,
    satelliteMeta: input.satelliteMeta,
    waterLevelMeta: input.waterLevelMeta,
    legalDisclaimer: FLOODGUARD_LEGAL,
  };
}

function defaultTitleFor(category: DpalSafeMissionCategory): string {
  switch (category) {
    case 'remote_observation':
      return 'FloodGuard remote observation task';
    case 'public_data_collection':
      return 'FloodGuard public / open-data capture';
    case 'safe_distance_road_status':
      return 'FloodGuard safe-distance road status check';
    case 'shelter_status_verification':
      return 'FloodGuard shelter status verification';
    case 'drainage_condition_after_recede':
      return 'FloodGuard drainage condition follow-up';
    case 'post_event_infrastructure_check':
      return 'FloodGuard post-event infrastructure walk-through';
    case 'validator_desk_review':
      return 'FloodGuard validator desk review';
    default:
      return 'FloodGuard safe mission';
  }
}

function defaultDescriptionFor(category: DpalSafeMissionCategory): string {
  switch (category) {
    case 'remote_observation':
      return 'Continue desk-side monitoring of FloodGuard signals; no field approach required.';
    case 'public_data_collection':
      return 'Aggregate official bulletins, gauge portals, or open civic datasets remotely.';
    case 'safe_distance_road_status':
      return 'Confirm road or barricade status from a designated safe overlook only.';
    case 'shelter_status_verification':
      return 'Phone or desk confirmation with shelter operators; avoid travel through inundated corridors.';
    case 'drainage_condition_after_recede':
      return 'After flows ease, schedule municipal drainage review; only photo from safe berms.';
    case 'post_event_infrastructure_check':
      return 'After authorities clear access, inspect visible damage from safe paths only.';
    case 'validator_desk_review':
      return 'Human validator reconciles signals before any optional field task is offered.';
    default:
      return 'FloodGuard safe mission with all field-hazard actions explicitly forbidden.';
  }
}

export function isAllowedDpalCategory(value: string): value is DpalSafeMissionCategory {
  return (ALLOWED_DPAL_MISSION_CATEGORIES as string[]).includes(value);
}
