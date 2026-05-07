import type { FloodAgentFinding, FloodWeatherSignal } from '../floodGuardTypes';
import { FLOOD_AGENT_LEGAL, INTENSITY_ELEVATED_MM_HR, INTENSITY_HIGH_MM_HR, INTENSITY_SEVERE_MM_HR } from './floodAgentConstants';

export function runRainfallWatchAgent(weather: FloodWeatherSignal | null): FloodAgentFinding {
  if (!weather) {
    return {
      agentId: 'rainfall_watch',
      agentLabel: 'Rainfall Watch Agent',
      severity: 'warning',
      summary: 'No rainfall / weather row for this zone — confidence in precipitation context is reduced.',
      details: [FLOOD_AGENT_LEGAL],
    };
  }
  const meta = weather.rainfallMeta;
  const intensity = meta?.intensityMmPerHr ?? weather.rainfall30mMm * 2;
  const details: string[] = [
    `Last 30 min: ${weather.rainfall30mMm.toFixed(1)} mm (~${intensity.toFixed(1)} mm/hr intensity).`,
    `Last 24 h: ${weather.rainfall24hMm.toFixed(1)} mm.`,
  ];
  if (meta?.providerLabel) details.push(`Source: ${meta.providerLabel} (${meta.status}).`);

  if (intensity >= INTENSITY_SEVERE_MM_HR || weather.rainfall30mMm >= 18) {
    return {
      agentId: 'rainfall_watch',
      agentLabel: 'Rainfall Watch Agent',
      severity: 'critical',
      summary: 'Heavy / intense rainfall signal — flash runoff and street flooding risk elevated.',
      details,
    };
  }
  if (intensity >= INTENSITY_HIGH_MM_HR || weather.rainfall24hMm >= 70) {
    return {
      agentId: 'rainfall_watch',
      agentLabel: 'Rainfall Watch Agent',
      severity: 'warning',
      summary: 'Elevated rainfall — monitor drainage and river response.',
      details,
    };
  }
  if (intensity >= INTENSITY_ELEVATED_MM_HR) {
    return {
      agentId: 'rainfall_watch',
      agentLabel: 'Rainfall Watch Agent',
      severity: 'watch',
      summary: 'Moderate rainfall activity in the monitoring window.',
      details,
    };
  }
  return {
    agentId: 'rainfall_watch',
    agentLabel: 'Rainfall Watch Agent',
    severity: 'info',
    summary: 'Rainfall within a typical monitoring band for this zone.',
    details,
  };
}
