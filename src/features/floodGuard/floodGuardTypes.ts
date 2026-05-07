/**
 * DPAL FloodGuard — type definitions
 *
 * "DPAL FloodGuard converts scattered flood signals into verified city alerts.
 *  It fuses live cameras, satellite rainfall, water-index analysis, citizen
 *  reports, and official warning feeds into a blockchain-anchored evidence
 *  packet for each flood-risk zone."
 *
 * Important positioning: DPAL does not replace government emergency alerts.
 * DPAL provides verified civic flood intelligence, early detection, evidence
 * packets, and routing support.
 */

// ── City + Geo-ID ────────────────────────────────────────────────────────────

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

export type FloodRiskCategory =
  | 'low'
  | 'moderate'
  | 'high'
  | 'critical';

export type FloodAlertLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** Human-readable label per alert level (Stage 5). */
export const FLOOD_ALERT_LABELS: Record<FloodAlertLevel, string> = {
  0: 'Normal',
  1: 'Rain Watch',
  2: 'Flood Risk',
  3: 'Flood Alert',
  4: 'Critical Flood',
  5: 'Rescue Needed',
};

/** Confidence bands used by the risk engine output. */
export type FloodConfidenceBand = 'low' | 'medium' | 'high';

export interface FloodGeoPoint {
  lat: number;
  lng: number;
}

/** Public infrastructure exposure inside a zone (drives weighting). */
export interface FloodZoneExposure {
  schools: number;
  hospitals: number;
  shelters: number;
  majorRoads: number;
  bridges: number;
  estimatedResidents: number;
}

export interface FloodHistoricalEvent {
  /** ISO date for when the event occurred. */
  date: string;
  /** Free-text summary of what happened. */
  summary: string;
  /** Peak alert level reached during the event. */
  peakLevel: FloodAlertLevel;
}

/**
 * Immutable DPAL Geo-ID for a flood zone.
 * Format: DPAL-FLOOD-{CITY_CODE}-ZONE-{LETTER}-{SEQ}
 * Example: DPAL-FLOOD-SCZ-ZONE-A-0001
 */
export interface FloodZone {
  zoneId: string;
  cityId: string;
  name: string;
  description: string;
  /** Polygon as [lng, lat] pairs (GeoJSON convention). */
  polygon: Array<[number, number]>;
  /** Center point used for map markers + camera/citizen geocoding. */
  center: FloodGeoPoint;
  /** Geohash for cross-system identification. */
  geohash: string;
  riskCategory: FloodRiskCategory;
  exposure: FloodZoneExposure;
  history: FloodHistoricalEvent[];
  /** Roads/landmarks/etc. inside the zone (free-text labels). */
  notableLocations: string[];
  /** Currently active alert id, if any. */
  activeAlertId: string | null;
}

// ── Camera + Citizen detection signals ───────────────────────────────────────

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
  /** AI label from the analyzer (e.g. "flash_flood", "moving_water"). */
  label: string;
  confidence: number; // 0..1
  timestamp: string;  // ISO
  streamUrl?: string;
  thumbnailUrl?: string;
  /** Optional human review state. */
  reviewedBy?: string | null;
  /** Optional descriptive sentence from the analyzer. */
  notes?: string;
}

export interface FloodCitizenReport {
  reportId: string;
  zoneId: string;
  reporterName?: string;
  /** Anonymous heroes use a short id; signed-in users use hero name. */
  reporterHandle?: string;
  description: string;
  observedDepthCm?: number;
  hasPhoto: boolean;
  timestamp: string; // ISO
  location: FloodGeoPoint;
}

/**
 * Stage 12A — provenance for a rainfall sample so dashboards and evidence
 * packets can show whether the value came from a live provider, a synthetic
 * fallback, or a seeded baseline. Mirrors `backend/.../floodGuardTypes.ts`.
 */
export type FloodRainfallIntegrationStatus =
  | 'live'
  | 'fallback'
  | 'unavailable'
  | 'http_error'
  | 'network_error';

export type FloodRainfallProvider = 'open-meteo' | 'synthetic' | 'seeded' | 'none';

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

/** Stage 12B — AquaScan / satellite water (mirrors backend `floodGuardTypes`). */
export type FloodSatelliteIntegrationStatus =
  | 'live'
  | 'fallback'
  | 'unavailable'
  | 'http_error'
  | 'network_error';

export interface FloodSatelliteMeta {
  zoneId: string;
  status: FloodSatelliteIntegrationStatus;
  ndwiMean: number;
  waterExtentSqKm: number;
  previousWaterExtentSqKm: number;
  waterExpansionPercent: number;
  floodWetConfidence: number;
  source: string;
  provider: string;
  providerLabel: string;
  fetchedAt: string;
  isLive: boolean;
  upstreamUrl?: string;
  attribution?: string;
  message?: string;
}

/** Stage 12E — water level / gauge (mirrors backend). */
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
  /** mm of rainfall in the last 30 minutes. */
  rainfall30mMm: number;
  /** mm of rainfall in the last 24 hours. */
  rainfall24hMm: number;
  /** Optional river/stream gauge reading. */
  riverGaugeMeters?: number;
  /** Δ in river gauge meters compared to baseline. */
  riverDeltaMeters?: number;
  /** % expansion of detected water surface vs baseline. */
  satelliteWaterExpansionPct?: number;
  source: FloodSignalSource;
  capturedAt: string; // ISO
  /** Adapter provenance (Stage 12A). Optional for backwards compatibility. */
  rainfallMeta?: FloodRainfallMeta;
  /** AquaScan / satellite provenance (Stage 12B). */
  satelliteMeta?: FloodSatelliteMeta;
  /** Stage 12E — gauge / water-stage intelligence. */
  waterLevelMeta?: FloodWaterLevelMeta;
}

// ── Risk engine output ───────────────────────────────────────────────────────

export interface FloodRiskFactor {
  /** Short label e.g. "Heavy rainfall (last 30m)". */
  label: string;
  /** Plain-English explanation for non-technical operators. */
  detail: string;
  /** Score contribution (positive = adds risk, negative = penalty). */
  contribution: number;
}

export interface FloodRiskScore {
  zoneId: string;
  score: number;            // 0..100
  alertLevel: FloodAlertLevel;
  alertLabel: string;       // mirrors FLOOD_ALERT_LABELS
  confidence: FloodConfidenceBand;
  reasons: string[];        // condensed list for cards/feeds
  factors: FloodRiskFactor[];
  computedAt: string;       // ISO
  /** Source mode for the score — driven by available signals. */
  sourceMode: 'live' | 'mock_demo' | 'historical_replay';
}

// ── Alerts + audiences ───────────────────────────────────────────────────────

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
  label: string;            // mirrors FLOOD_ALERT_LABELS
  riskScore: number;
  confidence: FloodConfidenceBand;
  primarySource: FloodSignalSource;
  contributingSources: FloodSignalSource[];
  reasons: string[];
  audiences: FloodAlertAudience[];
  channels: FloodAlertChannel[];
  lifecycle: FloodAlertLifecycle;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  /** Snapshot of the camera/citizen/weather signals at issue time. */
  signalSnapshot: {
    cameras: FloodCameraDetection[];
    citizenReports: FloodCitizenReport[];
    weather: FloodWeatherSignal | null;
  };
  /** Validator review state (Stage 8). */
  validatorReview?: {
    reviewerHandle?: string;
    decision: 'pending' | 'approved' | 'rejected' | 'needs_evidence';
    decidedAt?: string;
    notes?: string;
  };
  /** Evidence packet generated for this alert (Stage 6). */
  evidencePacketId?: string;
  /** Ledger anchor hash (placeholder until on-chain anchor returns). */
  ledgerAnchorHash?: string;
  /** Plain-English public language safe to share. */
  publicSafeMessage: string;
}

// ── Evidence packet (Stage 6) ────────────────────────────────────────────────

export type FloodMissionSafetyClassification =
  | 'no_mission_allowed'
  | 'remote_only'
  | 'safe_distance_only'
  | 'post_event_only'
  | 'validator_review_required'
  | 'mission_allowed';

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
  missionType: string;
  title: string;
  description: string;
  requiresValidator: boolean;
}

/** Blocked / unsafe mission pattern (Stage 12C monitor). */
export interface FloodBlockedMission {
  missionType: string;
  reason: string;
}

/** One zone after agentic evaluation (GET /api/floodguard/agents/monitor). */
export interface FloodZoneAgentEvaluation {
  zoneId: string;
  cityId: string;
  zoneName: string;
  riskScore: number;
  alertLevel: FloodAlertLevel;
  alertLabel: string;
  confidenceBand: FloodConfidenceBand;
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

/** Integration strip returned with agent monitor (mirrors backend). */
export interface FloodIntegrationStatus {
  rainfall: {
    available: boolean;
    status: FloodRainfallIntegrationStatus;
    provider: FloodRainfallProvider;
    providerLabel: string;
    message?: string;
    attribution?: string;
    upstreamUrl?: string;
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
  /** Stage 12E — optional for older API responses. */
  waterLevel?: {
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

export interface FloodAgentMonitorResponse {
  evaluatedAt: string;
  legalNotice: string;
  zones: FloodZoneAgentEvaluation[];
  integrations: FloodIntegrationStatus;
}

export interface FloodDispatchedMissionRecord {
  missionId: string;
  zoneId: string;
  missionType: string;
  requestedBy: string;
  safetyClassification: FloodMissionSafetyClassification;
  zoneSafetyAtDispatch: FloodMissionSafetyClassification;
  createdAt: string;
  status: 'open' | 'completed' | 'cancelled';
}

export interface FloodEvidencePacket {
  packetId: string;
  alertId: string;
  zoneId: string;
  cityId: string;
  generatedAt: string; // ISO
  generatedBy: string;
  /** SHA-256 hash of the evidence body (placeholder until backend anchors). */
  contentHash: string;
  /** Mocked DPAL ledger record id; replace with real chain id when live. */
  ledgerRecordId: string;
  /** Mocked QR data URL placeholder. */
  qrDataPayload: string;
  summary: string;
  riskScore: FloodRiskScore;
  signals: {
    cameras: FloodCameraDetection[];
    citizenReports: FloodCitizenReport[];
    weather: FloodWeatherSignal | null;
  };
  legalDisclaimer: string;
  /** Stage 12C — optional agentic snapshot when generated from backend. */
  agentFindings?: FloodAgentFinding[];
  missionSafetyClassification?: FloodMissionSafetyClassification;
  recommendedMissions?: FloodRecommendedMission[];
  blockedMissionReasons?: string[];
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

// ── Settings / routing rules (Stage 7) ───────────────────────────────────────

export interface FloodAlertSettings {
  cityId: string;
  /** Minimum risk score that triggers a public push alert. */
  publicPushThreshold: number;
  /** Minimum risk score that escalates to emergency services. */
  emergencyEscalationThreshold: number;
  /** Audiences enabled for this city. */
  enabledAudiences: FloodAlertAudience[];
  /** Channels enabled per audience. */
  channelsByAudience: Partial<Record<FloodAlertAudience, FloodAlertChannel[]>>;
  /** Optional webhook URL for city dashboards. */
  cityWebhookUrl?: string;
  /** Treat NWS/CAP feed as authoritative external context. */
  honorNwsCapAlerts: boolean;
  updatedAt: string;
}

// ── Situation room (Stage 1 + Stage 7) ───────────────────────────────────────

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

// ── Public-map data (Stage 9) ────────────────────────────────────────────────

export type FloodPublicMarkerKind =
  | 'safe_route'
  | 'danger_zone'
  | 'blocked_road'
  | 'shelter'
  | 'help_point'
  | 'citizen_report';

export interface FloodPublicMarker {
  markerId: string;
  cityId: string;
  zoneId?: string;
  kind: FloodPublicMarkerKind;
  label: string;
  description: string;
  location: FloodGeoPoint;
  updatedAt: string;
}

// ── Historical analytics (Stage 10) ──────────────────────────────────────────

export interface FloodHistoricalInsight {
  insightId: string;
  cityId: string;
  category:
    | 'most_flooded_road'
    | 'slowest_response'
    | 'drainage_failure'
    | 'repeated_zone'
    | 'infrastructure_negligence';
  title: string;
  summary: string;
  zoneId?: string;
  severity: 'info' | 'warning' | 'critical';
  /** Number of repeated incidents tied to this insight. */
  occurrences: number;
}
