import type { FloodAgentFinding, FloodSatelliteMeta, FloodWeatherSignal } from '../floodGuardTypes';
import { EXPANSION_ELEVATED_PCT, EXPANSION_HIGH_PCT, EXPANSION_SEVERE_PCT, FLOOD_AGENT_LEGAL, FLOOD_WET_CRITICAL, FLOOD_WET_ELEVATED, FLOOD_WET_HIGH } from './floodAgentConstants';

export function runSatelliteWatchAgent(weather: FloodWeatherSignal | null): FloodAgentFinding {
  const sm: FloodSatelliteMeta | undefined = weather?.satelliteMeta;
  const exp = sm?.waterExpansionPercent ?? weather?.satelliteWaterExpansionPct;
  if (exp === undefined && !sm) {
    return {
      agentId: 'satellite_watch',
      agentLabel: 'AquaScan Water Agent',
      severity: 'info',
      summary: 'No satellite water meta attached — using legacy or partial screening context only.',
      details: [FLOOD_AGENT_LEGAL],
    };
  }
  const wet = sm?.floodWetConfidence ?? 0.55;
  const ndwi = sm?.ndwiMean ?? 0;
  const details: string[] = [];
  if (sm) {
    details.push(
      `NDWI mean ${ndwi.toFixed(3)} · expansion ${(exp ?? 0).toFixed(1)}% · flood-wet confidence ${(wet * 100).toFixed(0)}%.`,
      `${sm.providerLabel} (${sm.status}).`,
    );
  }

  if ((exp ?? 0) >= EXPANSION_SEVERE_PCT && wet >= FLOOD_WET_HIGH) {
    return {
      agentId: 'satellite_watch',
      agentLabel: 'AquaScan Water Agent',
      severity: 'critical',
      summary: 'Strong satellite water expansion with high flood-wet confidence — water surface likely growing quickly.',
      details,
    };
  }
  if ((exp ?? 0) >= EXPANSION_HIGH_PCT || wet >= FLOOD_WET_CRITICAL) {
    return {
      agentId: 'satellite_watch',
      agentLabel: 'AquaScan Water Agent',
      severity: 'warning',
      summary: 'Elevated water extent or flood-wet signal — treat as active hydro stress.',
      details,
    };
  }
  if ((exp ?? 0) >= EXPANSION_ELEVATED_PCT || wet >= FLOOD_WET_ELEVATED) {
    return {
      agentId: 'satellite_watch',
      agentLabel: 'AquaScan Water Agent',
      severity: 'watch',
      summary: 'Noticeable water-index change — continue remote monitoring.',
      details,
    };
  }
  return {
    agentId: 'satellite_watch',
    agentLabel: 'AquaScan Water Agent',
    severity: 'info',
    summary: 'Satellite water indices do not show an extreme expansion spike in this window.',
    details: details.length ? details : [FLOOD_AGENT_LEGAL],
  };
}
