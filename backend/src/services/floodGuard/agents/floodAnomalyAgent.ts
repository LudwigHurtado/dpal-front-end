import type { FloodAgentFinding, FloodAlertLevel, FloodWaterLevelTrend, FloodZone } from '../floodGuardTypes';
import { EXPANSION_ELEVATED_PCT, FLOOD_AGENT_LEGAL } from './floodAgentConstants';

export function runAnomalyAgent(args: {
  zone: FloodZone;
  alertLevel: FloodAlertLevel;
  riskScore: number;
  waterExpansionPercent: number;
  historicalEventCount24m: number;
  waterLevelPercentOfCritical?: number;
  waterLevelTrend?: FloodWaterLevelTrend;
  sensitiveGauge?: boolean;
}): FloodAgentFinding {
  const {
    zone,
    alertLevel,
    riskScore,
    waterExpansionPercent,
    historicalEventCount24m,
    waterLevelPercentOfCritical = 0,
    waterLevelTrend = 'unknown',
    sensitiveGauge = false,
  } = args;
  const details: string[] = [
    `Geo-ID ${zone.zoneId} · category ${zone.riskCategory}.`,
    `Historical qualifying events (24 mo window): ${historicalEventCount24m}.`,
  ];
  if (waterLevelPercentOfCritical > 0) {
    details.push(`Gauge stage ~${waterLevelPercentOfCritical.toFixed(0)}% of critical · trend ${waterLevelTrend}.`);
  }

  const exposureHot =
    zone.exposure.schools >= 6 ||
    (zone.exposure.hospitals >= 1 && zone.exposure.majorRoads >= 3);

  if (
    waterLevelPercentOfCritical >= 78 &&
    waterLevelTrend === 'rising' &&
    waterExpansionPercent >= EXPANSION_ELEVATED_PCT * 0.85
  ) {
    return {
      agentId: 'anomaly',
      agentLabel: 'Flood Anomaly Agent',
      severity: 'critical',
      summary: 'Compound hydro pattern: rising water stage with meaningful satellite water expansion.',
      details,
    };
  }

  if (alertLevel >= 3 && waterExpansionPercent >= EXPANSION_ELEVATED_PCT && exposureHot) {
    return {
      agentId: 'anomaly',
      agentLabel: 'Flood Anomaly Agent',
      severity: 'critical',
      summary: 'Compound pattern: elevated alert, water expansion, and high public-exposure footprint.',
      details,
    };
  }
  if (sensitiveGauge && waterLevelPercentOfCritical >= 62 && alertLevel >= 2) {
    return {
      agentId: 'anomaly',
      agentLabel: 'Flood Anomaly Agent',
      severity: 'warning',
      summary: 'Drainage / underpass / basin gauge elevated against an active flood-risk band.',
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
