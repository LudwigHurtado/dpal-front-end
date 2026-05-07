import type { FloodAgentFinding, FloodAlertLevel, FloodZone } from '../floodGuardTypes';
import { EXPANSION_ELEVATED_PCT, FLOOD_AGENT_LEGAL } from './floodAgentConstants';

export function runAnomalyAgent(args: {
  zone: FloodZone;
  alertLevel: FloodAlertLevel;
  riskScore: number;
  waterExpansionPercent: number;
  historicalEventCount24m: number;
}): FloodAgentFinding {
  const { zone, alertLevel, riskScore, waterExpansionPercent, historicalEventCount24m } = args;
  const details: string[] = [
    `Geo-ID ${zone.zoneId} · category ${zone.riskCategory}.`,
    `Historical qualifying events (24 mo window): ${historicalEventCount24m}.`,
  ];

  const exposureHot =
    zone.exposure.schools >= 6 ||
    (zone.exposure.hospitals >= 1 && zone.exposure.majorRoads >= 3);

  if (alertLevel >= 3 && waterExpansionPercent >= EXPANSION_ELEVATED_PCT && exposureHot) {
    return {
      agentId: 'anomaly',
      agentLabel: 'Flood Anomaly Agent',
      severity: 'critical',
      summary: 'Compound pattern: elevated alert, water expansion, and high public-exposure footprint.',
      details,
    };
  }
  if (riskScore >= 68 && historicalEventCount24m >= 2) {
    return {
      agentId: 'anomaly',
      agentLabel: 'Flood Anomaly Agent',
      severity: 'warning',
      summary: 'High score aligns with repeated historical flood vulnerability in this zone.',
      details,
    };
  }
  if (waterExpansionPercent >= EXPANSION_ELEVATED_PCT * 1.35 && alertLevel <= 2) {
    return {
      agentId: 'anomaly',
      agentLabel: 'Flood Anomaly Agent',
      severity: 'watch',
      summary: 'Satellite expansion notable while headline alert level is still moderate — watch for rapid escalation.',
      details,
    };
  }
  return {
    agentId: 'anomaly',
    agentLabel: 'Flood Anomaly Agent',
    severity: 'info',
    summary: 'No strong multi-signal anomaly pattern beyond baseline screening.',
    details: [...details, FLOOD_AGENT_LEGAL],
  };
}
