/**
 * Stage 12C — thresholds for agentic flood monitoring (no external APIs).
 */

export const FLOOD_AGENT_LEGAL =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

/** mm/hr equivalent — heavy rain band. */
export const INTENSITY_SEVERE_MM_HR = 26;
export const INTENSITY_HIGH_MM_HR = 22;
export const INTENSITY_ELEVATED_MM_HR = 14;

export const FLOOD_WET_CRITICAL = 0.82;
export const FLOOD_WET_HIGH = 0.75;
export const FLOOD_WET_ELEVATED = 0.68;

export const EXPANSION_SEVERE_PCT = 45;
export const EXPANSION_HIGH_PCT = 35;
export const EXPANSION_ELEVATED_PCT = 22;

export const RIVER_DELTA_ELEVATED_M = 0.45;
export const RIVER_DELTA_HIGH_M = 0.75;

export const EXPOSURE_ROADS_BUSY = 4;
