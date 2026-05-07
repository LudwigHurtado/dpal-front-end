import type { FloodAgentFinding, FloodWeatherSignal } from '../floodGuardTypes';
import { FLOOD_AGENT_LEGAL, RIVER_DELTA_ELEVATED_M, RIVER_DELTA_HIGH_M } from './floodAgentConstants';

export function runWaterLevelWatchAgent(weather: FloodWeatherSignal | null): FloodAgentFinding {
  if (!weather || (weather.riverDeltaMeters === undefined && weather.riverGaugeMeters === undefined)) {
    return {
      agentId: 'water_level_watch',
      agentLabel: 'Water-level Watch Agent',
      severity: 'info',
      summary: 'No river / canal gauge delta in the current weather snapshot (optional signal).',
      details: ['Gauge feeds improve routing for drainage and bridge risk; not required for agentic screening.', FLOOD_AGENT_LEGAL],
    };
  }
  const d = weather.riverDeltaMeters ?? 0;
  const g = weather.riverGaugeMeters;
  const parts = [`River level change: ${d >= 0 ? '+' : ''}${d.toFixed(2)} m vs baseline.`];
  if (g !== undefined) parts.push(`Current gauge reading ~${g.toFixed(2)} m.`);

  if (d >= RIVER_DELTA_HIGH_M) {
    return {
      agentId: 'water_level_watch',
      agentLabel: 'Water-level Watch Agent',
      severity: 'critical',
      summary: 'Rapid river / stream rise vs baseline — channel stress likely.',
      details: parts,
    };
  }
  if (d >= RIVER_DELTA_ELEVATED_M) {
    return {
      agentId: 'water_level_watch',
      agentLabel: 'Water-level Watch Agent',
      severity: 'warning',
      summary: 'Meaningful gauge rise — correlate with rainfall and satellite water expansion.',
      details: parts,
    };
  }
  return {
    agentId: 'water_level_watch',
    agentLabel: 'Water-level Watch Agent',
    severity: 'info',
    summary: 'Gauge movement within a calmer band for this snapshot.',
    details: parts,
  };
}
