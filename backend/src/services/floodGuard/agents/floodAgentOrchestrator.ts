import type {
  FloodAgentMonitorResponse,
  FloodZone,
  FloodZoneAgentEvaluation,
} from '../floodGuardTypes';
import { computeFloodRiskScore } from '../floodRiskEngine';
import { listAllRegisteredZones, getZoneById } from '../floodCityZoneService';
import type { FloodGuardStore } from '../floodGuardStore';
import { rainfallAdapterHealth } from '../floodRainfallAdapter';
import { satelliteAdapterHealth } from '../floodSatelliteAdapter';
import { FLOOD_AGENT_LEGAL } from './floodAgentConstants';
import { runRainfallWatchAgent } from './floodRainfallWatchAgent';
import { runSatelliteWatchAgent } from './floodSatelliteWatchAgent';
import { runWaterLevelWatchAgent } from './floodWaterLevelWatchAgent';
import { runAnomalyAgent } from './floodAnomalyAgent';
import { runMissionSafetyAgent } from './floodMissionSafetyAgent';
import { runMissionDispatchAgent } from './floodMissionDispatchAgent';
import { runSituationRoomAgent } from './floodSituationRoomAgent';

function historicalCount24m(zone: FloodZone): number {
  return zone.history.filter((event) => {
    const ageMs = Date.now() - new Date(event.date).getTime();
    return ageMs <= 1000 * 60 * 60 * 24 * 730;
  }).length;
}

export function evaluateZoneForAgents(store: FloodGuardStore, zone: FloodZone): FloodZoneAgentEvaluation {
  const weather = store.getWeatherSnapshot(zone.zoneId);
  const cameras = store.getZoneDetections(zone.zoneId);
  const citizenReports = store.getZoneReports(zone.zoneId);
  const risk = computeFloodRiskScore({ zone, cameras, citizenReports, weather });
  const alert = store.getActiveAlertForZone(zone.zoneId);

  const rainfallF = runRainfallWatchAgent(weather);
  const satF = runSatelliteWatchAgent(weather);
  const wlF = runWaterLevelWatchAgent(weather);
  const exp = weather?.satelliteMeta?.waterExpansionPercent ?? weather?.satelliteWaterExpansionPct ?? 0;
  const anomalyF = runAnomalyAgent({
    zone,
    alertLevel: risk.alertLevel,
    riskScore: risk.score,
    waterExpansionPercent: exp,
    historicalEventCount24m: historicalCount24m(zone),
  });

  const safety = runMissionSafetyAgent({
    zone,
    alertLevel: risk.alertLevel,
    riskScore: risk.score,
    confidence: risk.confidence,
    weather,
  });

  const { recommendedMissions, blockedMissions } = runMissionDispatchAgent(safety.classification);
  const situation = runSituationRoomAgent({
    zoneId: zone.zoneId,
    alertLevel: risk.alertLevel,
    riskScore: risk.score,
  });

  const evaluatedAt = new Date().toISOString();

  return {
    zoneId: zone.zoneId,
    cityId: zone.cityId,
    zoneName: zone.name,
    riskScore: risk.score,
    alertLevel: risk.alertLevel,
    alertLabel: risk.alertLabel,
    confidenceBand: risk.confidence,
    riskReasons: risk.reasons,
    activeAlertId: alert?.alertId ?? null,
    agentFindings: [rainfallF, satF, wlF, anomalyF],
    missionSafetyClassification: safety.classification,
    safetyRationale: safety.rationale,
    recommendedMissions,
    blockedMissions,
    situationRoomSuggested: situation.suggested,
    situationRoomNote: situation.note,
    validatorDispatchSuggested:
      safety.classification === 'validator_review_required' || risk.confidence === 'low',
    evaluatedAt,
  };
}

function buildIntegrationsFromStore(store: FloodGuardStore): FloodAgentMonitorResponse['integrations'] {
  const health = rainfallAdapterHealth();
  const satHealth = satelliteAdapterHealth();
  const alerts = store.listAlertsSnapshot();

  const rainSamples = alerts
    .map((a) => {
      const w = a.signalSnapshot.weather;
      const meta = w?.rainfallMeta;
      if (!w || !meta) return null;
      return {
        zoneId: a.zoneId,
        rainfall30mMm: w.rainfall30mMm,
        rainfall24hMm: w.rainfall24hMm,
        intensityMmPerHr: meta.intensityMmPerHr ?? w.rainfall30mMm * 2,
        status: meta.status,
        provider: meta.provider,
        fetchedAt: meta.fetchedAt,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const satSamples = alerts
    .map((a) => {
      const sm = a.signalSnapshot.weather?.satelliteMeta;
      if (!sm) return null;
      return {
        zoneId: a.zoneId,
        ndwiMean: sm.ndwiMean,
        waterExtentSqKm: sm.waterExtentSqKm,
        previousWaterExtentSqKm: sm.previousWaterExtentSqKm,
        waterExpansionPercent: sm.waterExpansionPercent,
        floodWetConfidence: sm.floodWetConfidence,
        isLive: sm.isLive,
        status: sm.status,
        provider: sm.provider,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return {
    rainfall: {
      available: true,
      status: health.enabled ? 'live' : 'fallback',
      provider: health.provider,
      providerLabel: health.providerLabel,
      message: health.message,
      attribution: health.enabled ? 'Open-Meteo (https://open-meteo.com)' : undefined,
      upstreamUrl: health.enabled ? 'https://api.open-meteo.com/v1/forecast' : undefined,
      samples: rainSamples.length ? rainSamples : undefined,
    },
    satellite: {
      available: true,
      status: satHealth.status,
      provider: satHealth.provider,
      providerLabel: satHealth.providerLabel,
      message: satHealth.message,
      attribution: satHealth.enabled
        ? 'Copernicus Sentinel data processed via DPAL AquaScan overlay routes.'
        : undefined,
      upstreamUrl: satHealth.upstreamUrl,
      samples: satSamples.length ? satSamples : undefined,
    },
    ledger: {
      available: true,
      message: 'SHA-256 placeholder anchor; swap for on-chain DPAL ledger when ready.',
    },
    routing: {
      available: false,
      message: 'Outbound SMS/email/push/webhooks not implemented on this deployment.',
    },
  };
}

export function runFloodAgentMonitor(store: FloodGuardStore): FloodAgentMonitorResponse {
  const evaluatedAt = new Date().toISOString();
  const zones = listAllRegisteredZones().map((z) => evaluateZoneForAgents(store, z));
  return {
    evaluatedAt,
    legalNotice: `FloodGuard begins with remote sensing and agentic screening; field missions are optional and only when safe. ${FLOOD_AGENT_LEGAL}`,
    zones,
    integrations: buildIntegrationsFromStore(store),
  };
}

export function evaluateZoneById(store: FloodGuardStore, zoneId: string): FloodZoneAgentEvaluation | null {
  const zone = getZoneById(zoneId);
  if (!zone) return null;
  return evaluateZoneForAgents(store, zone);
}
