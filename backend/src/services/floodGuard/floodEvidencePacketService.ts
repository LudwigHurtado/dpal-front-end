/**
 * Evidence packet builder + SHA-256 content hash.
 */

import { createHash } from 'crypto';
import type {
  FloodAlert,
  FloodEvidencePacket,
  FloodRiskScore,
  FloodZoneAgentEvaluation,
} from './floodGuardTypes';
import { runEvidenceAgent } from './agents/floodEvidenceAgent';

export const FLOODGUARD_LEGAL_DISCLAIMER =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts. ' +
  'Users should still follow official guidance from local authorities and weather services.';

export interface BuildEvidencePacketInput {
  alert: FloodAlert;
  riskScore: FloodRiskScore;
  generatedBy: string;
  /** Stage 12C agentic evaluation for hashed body + packet fields. */
  agentEvaluation?: FloodZoneAgentEvaluation | null;
}

export function sha256Hex(json: string): string {
  return createHash('sha256').update(json, 'utf8').digest('hex');
}

export function buildFloodEvidencePacket(input: BuildEvidencePacketInput): FloodEvidencePacket {
  const generatedAt = new Date().toISOString();
  const weather = input.alert.signalSnapshot.weather;
  const rainfallMeta = weather?.rainfallMeta;
  const rainfallNote = weather
    ? rainfallMeta
      ? `weather feed: ${rainfallMeta.providerLabel} (${rainfallMeta.status})`
      : 'weather feed available'
    : 'no weather feed';
  const satMeta = weather?.satelliteMeta;
  const satNote = satMeta
    ? `satellite: ${satMeta.providerLabel} (${satMeta.status}), expansion ${satMeta.waterExpansionPercent.toFixed(1)}%`
    : '';
  let summary =
    `Risk score ${input.riskScore.score}/100 (${input.riskScore.alertLabel}) for ${input.alert.zoneId}. ` +
    `${input.alert.signalSnapshot.cameras.length} camera detection(s), ` +
    `${input.alert.signalSnapshot.citizenReports.length} citizen report(s), ` +
    `${rainfallNote}` +
    (satNote ? `. ${satNote}.` : '.');

  if (input.agentEvaluation) {
    const ev = runEvidenceAgent(input.agentEvaluation);
    summary += ` Agentic gate: ${ev.headline}.`;
  }

  // Stage 12A — capture rainfall adapter provenance directly in the hashed
  // body so anchored evidence binds the source/state of the rainfall signal.
  const rainfallProvenance = rainfallMeta
    ? {
        provider: rainfallMeta.provider,
        providerLabel: rainfallMeta.providerLabel,
        status: rainfallMeta.status,
        isLive: rainfallMeta.isLive,
        fetchedAt: rainfallMeta.fetchedAt,
        intensityMmPerHr: rainfallMeta.intensityMmPerHr,
        upstreamUrl: rainfallMeta.upstreamUrl,
        attribution: rainfallMeta.attribution,
        message: rainfallMeta.message,
      }
    : null;

  const satelliteProvenance = satMeta
    ? {
        ndwiMean: satMeta.ndwiMean,
        waterExtentSqKm: satMeta.waterExtentSqKm,
        previousWaterExtentSqKm: satMeta.previousWaterExtentSqKm,
        waterExpansionPercent: satMeta.waterExpansionPercent,
        floodWetConfidence: satMeta.floodWetConfidence,
        provider: satMeta.provider,
        status: satMeta.status,
        isLive: satMeta.isLive,
        fetchedAt: satMeta.fetchedAt,
        attribution: satMeta.attribution,
        message: satMeta.message,
      }
    : null;

  const agenticMonitoring = input.agentEvaluation
    ? {
        agentFindings: input.agentEvaluation.agentFindings,
        missionSafetyClassification: input.agentEvaluation.missionSafetyClassification,
        recommendedMissions: input.agentEvaluation.recommendedMissions,
        blockedMissionReasons: input.agentEvaluation.blockedMissions.map(
          (b) => `${b.missionType}: ${b.reason}`,
        ),
        evaluatedAt: input.agentEvaluation.evaluatedAt,
      }
    : undefined;

  const body = {
    alertId: input.alert.alertId,
    zoneId: input.alert.zoneId,
    cityId: input.alert.cityId,
    riskScore: input.riskScore,
    signals: input.alert.signalSnapshot,
    rainfallProvenance,
    satelliteProvenance,
    audiences: input.alert.audiences,
    channels: input.alert.channels,
    lifecycle: input.alert.lifecycle,
    reasons: input.alert.reasons,
    generatedAt,
    generatedBy: input.generatedBy,
    agenticMonitoring,
  };

  const contentHash = sha256Hex(JSON.stringify(body));
  const ledgerRecordId = `dpal-flood-ledger-${contentHash.slice(0, 12)}`;
  const qrDataPayload = `dpal://floodguard/evidence/${input.alert.alertId}#${contentHash.slice(0, 16)}`;

  return {
    packetId: `EVID-FLOOD-${input.alert.alertId}`,
    alertId: input.alert.alertId,
    zoneId: input.alert.zoneId,
    cityId: input.alert.cityId,
    generatedAt,
    generatedBy: input.generatedBy,
    contentHash,
    ledgerRecordId,
    qrDataPayload,
    summary,
    riskScore: input.riskScore,
    signals: input.alert.signalSnapshot,
    legalDisclaimer: FLOODGUARD_LEGAL_DISCLAIMER,
    ...(input.agentEvaluation
      ? {
          agentFindings: input.agentEvaluation.agentFindings,
          missionSafetyClassification: input.agentEvaluation.missionSafetyClassification,
          recommendedMissions: input.agentEvaluation.recommendedMissions,
          blockedMissionReasons: input.agentEvaluation.blockedMissions.map(
            (b) => `${b.missionType}: ${b.reason}`,
          ),
        }
      : {}),
  };
}
