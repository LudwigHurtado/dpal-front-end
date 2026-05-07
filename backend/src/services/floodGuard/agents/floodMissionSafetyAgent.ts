import type {
  FloodAlertLevel,
  FloodConfidenceBand,
  FloodMissionSafetyClassification,
  FloodSatelliteMeta,
  FloodWaterLevelMeta,
  FloodWeatherSignal,
  FloodZone,
} from '../floodGuardTypes';
import {
  EXPANSION_HIGH_PCT,
  EXPANSION_SEVERE_PCT,
  EXPOSURE_ROADS_BUSY,
  FLOOD_AGENT_LEGAL,
  FLOOD_WET_HIGH,
  INTENSITY_HIGH_MM_HR,
  INTENSITY_SEVERE_MM_HR,
  RIVER_DELTA_HIGH_M,
} from './floodAgentConstants';

export interface MissionSafetyResult {
  classification: FloodMissionSafetyClassification;
  rationale: string[];
}

export function runMissionSafetyAgent(args: {
  zone: FloodZone;
  alertLevel: FloodAlertLevel;
  riskScore: number;
  confidence: FloodConfidenceBand;
  weather: FloodWeatherSignal | null;
}): MissionSafetyResult {
  const { zone, alertLevel, riskScore, confidence, weather } = args;
  const rationale: string[] = [];

  const wl: FloodWaterLevelMeta | undefined = weather?.waterLevelMeta;
  const wlPct = wl?.levelPercentOfCritical ?? 0;
  const wlRising = wl?.trend === 'rising';
  const wlSensitive =
    wl?.gaugeType === 'drainage_channel' ||
    wl?.gaugeType === 'bridge_underpass_marker' ||
    wl?.gaugeType === 'retention_basin';

  const intensity = weather?.rainfallMeta?.intensityMmPerHr ?? (weather?.rainfall30mMm ?? 0) * 2;
  const sm: FloodSatelliteMeta | undefined = weather?.satelliteMeta;
  const wet = sm?.floodWetConfidence ?? 0;
  const exp = sm?.waterExpansionPercent ?? weather?.satelliteWaterExpansionPct ?? 0;
  const river = weather?.riverDeltaMeters ?? 0;
  const busyRoads = zone.exposure.majorRoads >= EXPOSURE_ROADS_BUSY;

  const blockField = () => {
    rationale.push(
      'DPAL does not dispatch foot or vehicle missions into active flood water, unstable bridges, or unsafe road approaches.',
      FLOOD_AGENT_LEGAL,
    );
  };

  // --- Water stage (Stage 12E) — strictest local hydro checks ---
  if (wl && wlPct >= 92) {
    rationale.push('Gauge stage at or above critical envelope — keep all work remote.');
    blockField();
    return { classification: 'no_mission_allowed', rationale };
  }
  if (wl && wlPct >= 82 && wlRising) {
    rationale.push('Water stage high and rising — treat channel and underpass risk as severe; no proximity missions.');
    blockField();
    return { classification: 'no_mission_allowed', rationale };
  }
  if (wl && wlPct >= 72 && wlRising) {
    rationale.push('Water stage elevated with a rising trend — only remote observation and desk validation.');
    blockField();
    return { classification: 'remote_only', rationale };
  }
  if (wl && wlPct >= 68 && (wlSensitive || alertLevel >= 3)) {
    rationale.push('Sensitive gauge type or elevated alert with meaningful stage — safe-distance or post-event tasks only.');
    blockField();
    return { classification: 'safe_distance_only', rationale };
  }
  if (wl && wlPct >= 58 && wlSensitive) {
    rationale.push('Drainage / underpass / basin gauge under stress — defer field checks until flows ease.');
    blockField();
    return { classification: 'post_event_only', rationale };
  }

  // --- Strictest gates ---
  if (alertLevel >= 5) {
    rationale.push('Alert level indicates rescue-scale conditions — no field missions.');
    blockField();
    return { classification: 'no_mission_allowed', rationale };
  }

  if (alertLevel >= 4 && wet >= FLOOD_WET_HIGH) {
    rationale.push('Critical flood band with high flood-wet confidence — keep all work remote.');
    blockField();
    return { classification: 'no_mission_allowed', rationale };
  }

  if (intensity >= INTENSITY_SEVERE_MM_HR && exp >= EXPANSION_HIGH_PCT) {
    rationale.push('Severe rainfall intensity combined with strong water expansion — treat as unsafe for proximity missions.');
    blockField();
    return { classification: 'no_mission_allowed', rationale };
  }

  if (alertLevel >= 4 || intensity >= INTENSITY_HIGH_MM_HR || exp >= EXPANSION_SEVERE_PCT) {
    rationale.push('Hazard envelope supports only remote observation and desk validation.');
    blockField();
    return { classification: 'remote_only', rationale };
  }

  if (alertLevel >= 3 || wet >= 0.72 || exp >= 32 || river >= RIVER_DELTA_HIGH_M) {
    rationale.push('Active hydro stress — if any field task is needed, it must be from verified safe distance or high ground.');
    blockField();
    return { classification: 'safe_distance_only', rationale };
  }

  if (alertLevel >= 2 || exp >= 22 || busyRoads) {
    rationale.push('Roads and channels may be compromised — prefer post-event verification once water recedes.');
    blockField();
    return { classification: 'post_event_only', rationale };
  }

  if (confidence === 'low' && riskScore >= 35) {
    rationale.push('Signal confidence is low — route through validator desk review before any optional field task.');
    return { classification: 'validator_review_required', rationale: [...rationale, FLOOD_AGENT_LEGAL] };
  }

  if (alertLevel >= 1) {
    rationale.push('Rain watch / early flood-risk band — only minimal, remote-safe tasks.');
    return { classification: 'remote_only', rationale: [...rationale, FLOOD_AGENT_LEGAL] };
  }

  rationale.push('Screening band is calm — still limited to predefined safe mission templates (no water entry).');
  return { classification: 'mission_allowed', rationale: [...rationale, FLOOD_AGENT_LEGAL] };
}
