import type { FloodAgentFinding, FloodWeatherSignal } from '../floodGuardTypes';
import { FLOOD_AGENT_LEGAL } from './floodAgentConstants';

export function runWaterLevelWatchAgent(weather: FloodWeatherSignal | null): FloodAgentFinding {
  const wl = weather?.waterLevelMeta;
  if (wl) {
    const parts = [
      `${wl.gaugeName} (${wl.gaugeType.replace(/_/g, ' ')})`,
      `Stage ${wl.waterLevelMeters.toFixed(2)} m · warning ${wl.warningLevelMeters.toFixed(2)} m · critical ${wl.criticalLevelMeters.toFixed(2)} m.`,
      `${wl.levelPercentOfCritical.toFixed(0)}% of critical · trend ${wl.trend} (Δ ${wl.trendDeltaMeters >= 0 ? '+' : ''}${wl.trendDeltaMeters.toFixed(2)} m).`,
      `Source: ${wl.providerLabel} (${wl.status})${wl.isLive ? ' · live' : ''}.`,
    ];
    if (wl.levelPercentOfCritical >= 90 || (wl.levelPercentOfCritical >= 80 && wl.trend === 'rising')) {
      return {
        agentId: 'water_level_watch',
        agentLabel: 'Water-level Watch Agent',
        severity: 'critical',
        summary: 'Gauge stage in a critical or fast-rising envelope — prioritize channel and infrastructure safety.',
        details: [...parts, FLOOD_AGENT_LEGAL],
      };
    }
    if (wl.levelPercentOfCritical >= 70 || wl.trend === 'rising') {
      return {
        agentId: 'water_level_watch',
        agentLabel: 'Water-level Watch Agent',
        severity: 'warning',
        summary: 'Meaningful water stage — correlate with rainfall intensity and satellite water expansion.',
        details: [...parts, FLOOD_AGENT_LEGAL],
      };
    }
    return {
      agentId: 'water_level_watch',
      agentLabel: 'Water-level Watch Agent',
      severity: 'info',
      summary: 'Water-level / gauge row present within a calmer band for this snapshot.',
      details: parts,
    };
  }

  if (!weather || (weather.riverDeltaMeters === undefined && weather.riverGaugeMeters === undefined)) {
    return {
      agentId: 'water_level_watch',
      agentLabel: 'Water-level Watch Agent',
      severity: 'info',
      summary: 'No water-level metadata in the current weather snapshot (legacy mode).',
      details: ['Prime environmental signals to attach Stage 12E gauge readings.', FLOOD_AGENT_LEGAL],
    };
  }
  const d = weather.riverDeltaMeters ?? 0;
  const g = weather.riverGaugeMeters;
  const parts = [`River level change: ${d >= 0 ? '+' : ''}${d.toFixed(2)} m vs baseline.`];
  if (g !== undefined) parts.push(`Current gauge reading ~${g.toFixed(2)} m.`);

  if (d >= 0.75) {
    return {
      agentId: 'water_level_watch',
      agentLabel: 'Water-level Watch Agent',
      severity: 'critical',
      summary: 'Rapid river / stream rise vs baseline — channel stress likely.',
      details: parts,
    };
  }
  if (d >= 0.45) {
    return {
      agentId: 'water_level_watch',
      agentLabel: 'Water-level Watch Agent',
      severity: 'warning',
      summary: 'Meaningful legacy gauge rise — correlate with rainfall and satellite expansion.',
      details: parts,
    };
  }
  return {
    agentId: 'water_level_watch',
    agentLabel: 'Water-level Watch Agent',
    severity: 'info',
    summary: 'Legacy gauge movement within a calmer band for this snapshot.',
    details: parts,
  };
}
