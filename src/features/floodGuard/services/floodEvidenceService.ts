/**
 * Builds an evidence packet for a FloodGuard alert.
 *
 * MVP behavior: SHA-256 the structured evidence body via the Web Crypto API
 * and treat that hash as a placeholder for the on-chain anchor. Real
 * blockchain anchoring will replace this in `floodLedgerService.ts` once the
 * server is wired to the existing DPAL chain service.
 */

import type {
  FloodAlert,
  FloodEvidencePacket,
  FloodRiskScore,
} from '../floodGuardTypes';

const TEXT_ENCODER = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const buffer = await crypto.subtle.digest('SHA-256', TEXT_ENCODER.encode(input));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  /** Lightweight fallback when Web Crypto is unavailable (e.g. SSR). */
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `dev-fallback-${hash.toString(16).padStart(16, '0')}`;
}

export interface BuildEvidencePacketInput {
  alert: FloodAlert;
  riskScore: FloodRiskScore;
  generatedBy: string;
}

const SAFE_LEGAL_LANGUAGE =
  'DPAL FloodGuard provides verified civic flood intelligence, evidence packets, and routing support. ' +
  'It is not a replacement for government emergency alerts. Users should still follow official guidance.';

export async function buildFloodEvidencePacket(
  input: BuildEvidencePacketInput,
): Promise<FloodEvidencePacket> {
  const generatedAt = new Date().toISOString();
  const summary =
    `Risk score ${input.riskScore.score}/100 (${input.riskScore.alertLabel}) for ${input.alert.zoneId}. ` +
    `${input.alert.signalSnapshot.cameras.length} camera detection(s), ` +
    `${input.alert.signalSnapshot.citizenReports.length} citizen report(s), ` +
    `${input.alert.signalSnapshot.weather ? 'weather feed available' : 'no weather feed'}.`;

  const body = {
    alertId: input.alert.alertId,
    zoneId: input.alert.zoneId,
    cityId: input.alert.cityId,
    riskScore: input.riskScore,
    signals: input.alert.signalSnapshot,
    audiences: input.alert.audiences,
    channels: input.alert.channels,
    lifecycle: input.alert.lifecycle,
    reasons: input.alert.reasons,
    generatedAt,
    generatedBy: input.generatedBy,
  };

  const contentHash = await sha256Hex(JSON.stringify(body));
  const ledgerRecordId = `dpal-flood-ledger-${contentHash.slice(0, 12)}`;
  const qrPayload = `dpal://floodguard/evidence/${input.alert.alertId}#${contentHash.slice(0, 16)}`;

  return {
    packetId: `EVID-FLOOD-${input.alert.alertId}`,
    alertId: input.alert.alertId,
    zoneId: input.alert.zoneId,
    cityId: input.alert.cityId,
    generatedAt,
    generatedBy: input.generatedBy,
    contentHash,
    ledgerRecordId,
    qrDataPayload: qrPayload,
    summary,
    riskScore: input.riskScore,
    signals: input.alert.signalSnapshot,
    legalDisclaimer: SAFE_LEGAL_LANGUAGE,
  };
}
