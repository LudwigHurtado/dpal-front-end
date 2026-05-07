/**
 * DPAL FloodGuard — backend type mirror of `src/features/floodGuard/floodGuardTypes.ts`.
 * Keep in sync when the frontend contract changes.
 */

export interface FloodCity {
  cityId: string;
  name: string;
  region: string;
  country: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  populationEstimate?: number;
  monitoringSince?: string;
}

export type FloodRiskCategory = 'low' | 'moderate' | 'high' | 'critical';

export type FloodAlertLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const FLOOD_ALERT_LABELS: Record<FloodAlertLevel, string> = {
  0: 'Normal',
  1: 'Rain Watch',
  2: 'Flood Risk',
  3: 'Flood Alert',
  4: 'Critical Flood',
  5: 'Rescue Needed',
};

export type FloodConfidenceBand = 'low' | 'medium' | 'high';

export interface FloodGeoPoint {
  lat: number;
  lng: number;
}

export interface FloodZoneExposure {
  schools: number;
  hospitals: number;
  shelters: number;
  majorRoads: number;
  bridges: number;
  estimatedResidents: number;
}

export interface FloodHistoricalEvent {
  date: string;
  summary: string;
  peakLevel: FloodAlertLevel;
}

export interface FloodZone {
  zoneId: string;
  cityId: string;
  name: string;
  description: string;
  polygon: Array<[number, number]>;
  center: FloodGeoPoint;
  geohash: string;
  riskCategory: FloodRiskCategory;
  exposure: FloodZoneExposure;
  history: FloodHistoricalEvent[];
  notableLocations: string[];
  activeAlertId: string | null;
}

export type FloodSignalSource =
  | 'camera'
  | 'citizen'
  | 'rain_gauge'
  | 'river_gauge'
  | 'satellite'
  | 'weather_feed'
  | 'official_cap';

export interface FloodCameraDetection {
  detectionId: string;
  cameraId: string;
  cameraLabel: string;
  zoneId: string;
  label: string;
  confidence: number;
  timestamp: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  reviewedBy?: string | null;
  notes?: string;
}

export interface FloodCitizenReport {
  reportId: string;
  zoneId: string;
  reporterName?: string;
  reporterHandle?: string;
  description: string;
  observedDepthCm?: number;
  hasPhoto: boolean;
  timestamp: string;
  location: FloodGeoPoint;
}

/**
 * Adapter integration state. Mirrors the union the frontend `floodGuardApi`
 * already understands (`unavailable | http_error | network_error`) plus
 * `live | fallback` for live-vs-synthetic rainfall.
 */
export type FloodRainfallIntegrationStatus =
  | 'live'
  | 'fallback'
  | 'unavailable'
  | 'http_error'
  | 'network_error';

export type FloodRainfallProvider = 'open-meteo' | 'synthetic' | 'seeded' | 'none';

/** Provenance for a rainfall sample so dashboards/evidence can show the source. */
export interface FloodRainfallMeta {
  status: FloodRainfallIntegrationStatus;
  provider: FloodRainfallProvider;
  providerLabel: string;
  fetchedAt: string;
  message?: string;
  attribution?: string;
  upstreamUrl?: string;
  lat?: number;
  lng?: number;
  /** Last 30-min rainfall intensity expressed in mm/hr (rainfall30mMm * 2). */
  intensityMmPerHr?: number;
  /** True when this sample came from a configured live provider. */
  isLive: boolean;
}

/** Stage 12B — AquaScan / satellite water intelligence (NDWI, extent, flood-wet). */
export type FloodSatelliteIntegrationStatus =
  | 'live'
  | 'fallback'
  | 'unavailable'
  | 'http_error'
  | 'network_error';

export type FloodSatelliteProviderId = 'aquascan-live' | 'aquascan-fallback' | 'none';

export interface FloodSatelliteMeta {
  zoneId: string;
  status: FloodSatelliteIntegrationStatus;
  ndwiMean: number;
  waterExtentSqKm: number;
  previousWaterExtentSqKm: number;
  waterExpansionPercent: number;
  floodWetConfidence: number;
  /** High-level signal origin (e.g. satellite screening). */
  source: string;
  provider: string;
  providerLabel: string;
  fetchedAt: string;
  isLive: boolean;
  upstreamUrl?: string;
  attribution?: string;
  message?: string;
}

/** Stage 12E — water level / gauge integration (river, canal, synthetic, etc.). */
export type FloodWaterLevelIntegrationStatus =
  | 'live'
  | 'fallback'
  | 'unavailable'
  | 'http_error'
  | 'network_error';

export type FloodWaterLevelGaugeType =
  | 'river'
  | 'canal'
  | 'drainage_channel'
  | 'retention_basin'
  | 'reservoir'
  | 'bridge_underpass_marker'
  | 'manual_field_reading'
  | 'synthetic_fallback';

export type FloodWaterLevelTrend = 'rising' | 'falling' | 'stable' | 'unknown';

export interface FloodWaterLevelMeta {
  zoneId: string;
  gaugeId: string;
  gaugeName: string;
  gaugeType: FloodWaterLevelGaugeType;
  waterLevelMeters: number;
  normalLevelMeters: number;
  warningLevelMeters: number;
  criticalLevelMeters: number;
  levelPercentOfCritical: number;
  trend: FloodWaterLevelTrend;
  trendDeltaMeters: number;
  readingTimestamp: string;
  status: FloodWaterLevelIntegrationStatus;
  provider: string;
  providerLabel: string;
  isLive: boolean;
  fetchedAt: string;
  upstreamUrl?: string;
  attribution?: string;
  message?: string;
}

export interface FloodWeatherSignal {
  zoneId: string;
  rainfall30mMm: number;
  rainfall24hMm: number;
  riverGaugeMeters?: number;
  riverDeltaMeters?: number;
  satelliteWaterExpansionPct?: number;
  source: FloodSignalSource;
  capturedAt: string;
  /** Adapter provenance (Stage 12A). Optional for backwards compatibility. */
  rainfallMeta?: FloodRainfallMeta;
  /** AquaScan / satellite provenance (Stage 12B). */
  satelliteMeta?: FloodSatelliteMeta;
  /** Stage 12E — gauge / water-stage intelligence. */
  waterLevelMeta?: FloodWaterLevelMeta;
}

export interface FloodRiskFactor {
  label: string;
  detail: string;
  contribution: number;
}

export interface FloodRiskScore {
  zoneId: string;
  score: number;
  alertLevel: FloodAlertLevel;
  alertLabel: string;
  confidence: FloodConfidenceBand;
  reasons: string[];
  factors: FloodRiskFactor[];
  computedAt: string;
  sourceMode: 'live' | 'mock_demo' | 'historical_replay';
}

export type FloodAlertAudience =
  | 'city_officials'
  | 'emergency_services'
  | 'public_users'
  | 'schools_hospitals'
  | 'validators'
  | 'community_groups';

export type FloodAlertChannel =
  | 'dashboard'
  | 'push'
  | 'email'
  | 'sms'
  | 'webhook'
  | 'whatsapp'
  | 'telegram';

export type FloodAlertLifecycle =
  | 'ai_detected'
  | 'evidence_assembled'
  | 'human_review_pending'
  | 'human_verified'
  | 'city_notified'
  | 'resolved'
  | 'archived';

export interface FloodAlert {
  alertId: string;
  cityId: string;
  zoneId: string;
  level: FloodAlertLevel;
  label: string;
  riskScore: number;
  confidence: FloodConfidenceBand;
  primarySource: FloodSignalSource;
  contributingSources: FloodSignalSource[];
  reasons: string[];
  audiences: FloodAlertAudience[];
  channels: FloodAlertChannel[];
  lifecycle: FloodAlertLifecycle;
  createdAt: string;
  updatedAt: string;
  signalSnapshot: {
    cameras: FloodCameraDetection[];
    citizenReports: FloodCitizenReport[];
    weather: FloodWeatherSignal | null;
  };
  validatorReview?: {
    reviewerHandle?: string;
    decision: 'pending' | 'approved' | 'rejected' | 'needs_evidence';
    decidedAt?: string;
    notes?: string;
  };
  evidencePacketId?: string;
  ledgerAnchorHash?: string;
  publicSafeMessage: string;
}

/** Stage 12C — mission safety gate before any field dispatch. */
export type FloodMissionSafetyClassification =
  | 'no_mission_allowed'
  | 'remote_only'
  | 'safe_distance_only'
  | 'post_event_only'
  | 'validator_review_required'
  | 'mission_allowed';

export type FloodSafeMissionType =
  | 'remote_observation'
  | 'public_data_collection'
  | 'safe_distance_road_closure_confirm'
  | 'shelter_status_verify'
  | 'safe_high_ground_photo'
  | 'home_window_report'
  | 'post_event_infrastructure_check'
  | 'drainage_post_recede_check'
  | 'validator_desk_review';

export type FloodAgentId =
  | 'rainfall_watch'
  | 'satellite_watch'
  | 'water_level_watch'
  | 'anomaly'
  | 'mission_safety'
  | 'mission_dispatch'
  | 'evidence'
  | 'situation_room';

export interface FloodAgentFinding {
  agentId: FloodAgentId;
  agentLabel: string;
  severity: 'info' | 'watch' | 'warning' | 'critical';
  summary: string;
  details?: string[];
}

export interface FloodRecommendedMission {
  missionType: FloodSafeMissionType;
  title: string;
  description: string;
  requiresValidator: boolean;
}

export interface FloodBlockedMission {
  missionType: string;
  reason: string;
}

export interface FloodZoneAgentEvaluation {
  zoneId: string;
  cityId: string;
  zoneName: string;
  riskScore: number;
  alertLevel: FloodAlertLevel;
  alertLabel: string;
  confidenceBand: FloodConfidenceBand;
  /** Top risk engine reasons. */
  riskReasons: string[];
  activeAlertId: string | null;
  agentFindings: FloodAgentFinding[];
  missionSafetyClassification: FloodMissionSafetyClassification;
  safetyRationale: string[];
  recommendedMissions: FloodRecommendedMission[];
  blockedMissions: FloodBlockedMission[];
  situationRoomSuggested: boolean;
  situationRoomNote?: string;
  validatorDispatchSuggested: boolean;
  evaluatedAt: string;
}

export interface FloodAgentMonitorResponse {
  evaluatedAt: string;
  legalNotice: string;
  zones: FloodZoneAgentEvaluation[];
  integrations: FloodIntegrationStatus;
}

export interface FloodDispatchedMissionRecord {
  missionId: string;
  zoneId: string;
  missionType: FloodSafeMissionType;
  requestedBy: string;
  safetyClassification: FloodMissionSafetyClassification;
  /** Classification at dispatch time from the safety agent. */
  zoneSafetyAtDispatch: FloodMissionSafetyClassification;
  createdAt: string;
  status: 'open' | 'completed' | 'cancelled';
}

export interface FloodEvidencePacket {
  packetId: string;
  alertId: string;
  zoneId: string;
  cityId: string;
  generatedAt: string;
  generatedBy: string;
  contentHash: string;
  ledgerRecordId: string;
  qrDataPayload: string;
  summary: string;
  riskScore: FloodRiskScore;
  signals: {
    cameras: FloodCameraDetection[];
    citizenReports: FloodCitizenReport[];
    weather: FloodWeatherSignal | null;
  };
  legalDisclaimer: string;
  /** Stage 12C — agentic monitoring snapshot (optional for legacy packets). */
  agentFindings?: FloodAgentFinding[];
  missionSafetyClassification?: FloodMissionSafetyClassification;
  recommendedMissions?: FloodRecommendedMission[];
  blockedMissionReasons?: string[];
  /** Stage 12E — hashed gauge provenance. */
  waterLevelProvenance?: {
    zoneId: string;
    gaugeId: string;
    gaugeName: string;
    gaugeType: FloodWaterLevelGaugeType;
    waterLevelMeters: number;
    normalLevelMeters: number;
    warningLevelMeters: number;
    criticalLevelMeters: number;
    levelPercentOfCritical: number;
    trend: FloodWaterLevelTrend;
    trendDeltaMeters: number;
    readingTimestamp: string;
    provider: string;
    status: FloodWaterLevelIntegrationStatus;
    isLive: boolean;
    fetchedAt: string;
    attribution?: string;
    message?: string;
  };
}

export interface FloodAlertSettings {
  cityId: string;
  publicPushThreshold: number;
  emergencyEscalationThreshold: number;
  enabledAudiences: FloodAlertAudience[];
  channelsByAudience: Partial<Record<FloodAlertAudience, FloodAlertChannel[]>>;
  cityWebhookUrl?: string;
  honorNwsCapAlerts: boolean;
  updatedAt: string;
}

export type FloodSituationParticipantRole =
  | 'city_official'
  | 'validator'
  | 'responder'
  | 'community_lead'
  | 'observer';

export interface FloodSituationParticipant {
  participantId: string;
  name: string;
  role: FloodSituationParticipantRole;
  organization?: string;
  joinedAt: string;
}

export interface FloodSituationMessage {
  messageId: string;
  authorName: string;
  authorRole: FloodSituationParticipantRole | 'system';
  body: string;
  timestamp: string;
  attachmentLabel?: string;
}

export interface FloodSituationRoom {
  roomId: string;
  alertId: string;
  zoneId: string;
  cityId: string;
  status: 'open' | 'monitoring' | 'closed';
  participants: FloodSituationParticipant[];
  messages: FloodSituationMessage[];
  createdAt: string;
}

/** Optional payload on some responses — frontend may ignore. */
export interface FloodIntegrationStatus {
  rainfall: {
    available: boolean;
    status: FloodRainfallIntegrationStatus;
    provider: FloodRainfallProvider;
    providerLabel: string;
    message?: string;
    attribution?: string;
    upstreamUrl?: string;
    /** Per-zone rainfall samples (small subset) for dashboards. */
    samples?: Array<{
      zoneId: string;
      rainfall30mMm: number;
      rainfall24hMm: number;
      intensityMmPerHr: number;
      status: FloodRainfallIntegrationStatus;
      provider: FloodRainfallProvider;
      fetchedAt: string;
    }>;
  };
  satellite: {
    available: boolean;
    status: FloodSatelliteIntegrationStatus;
    provider: string;
    providerLabel: string;
    message?: string;
    attribution?: string;
    upstreamUrl?: string;
    samples?: Array<{
      zoneId: string;
      ndwiMean: number;
      waterExtentSqKm: number;
      previousWaterExtentSqKm: number;
      waterExpansionPercent: number;
      floodWetConfidence: number;
      isLive: boolean;
      status: FloodSatelliteIntegrationStatus;
      provider: string;
    }>;
  };
  waterLevel: {
    available: boolean;
    status: FloodWaterLevelIntegrationStatus;
    provider: string;
    providerLabel: string;
    message?: string;
    attribution?: string;
    upstreamUrl?: string;
    samples?: Array<{
      zoneId: string;
      gaugeId: string;
      gaugeName: string;
      gaugeType: FloodWaterLevelGaugeType;
      waterLevelMeters: number;
      criticalLevelMeters: number;
      levelPercentOfCritical: number;
      trend: FloodWaterLevelTrend;
      status: FloodWaterLevelIntegrationStatus;
      provider: string;
      isLive: boolean;
      fetchedAt: string;
    }>;
  };
  ledger: { available: boolean; message?: string };
  routing: { available: boolean; message?: string };
}
