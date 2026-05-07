/**
 * DPAL FloodGuard — Stage 12H ledger anchoring service.
 *
 * Hard rules:
 *   1. No paid blockchain calls. Default chain provider is `dpal_local_mock`.
 *   2. Hashes are SHA-256 only. The composite `anchoringHash` binds the
 *      evidence packet hash to every available provenance / agent / routing /
 *      mission digest so the ledger record becomes a stronger accountability
 *      object than the legacy single-hash anchor.
 *   3. Records carry the legal disclaimer and a clear mock label so the UI
 *      cannot accidentally imply government confirmation.
 *   4. Failures never break evidence generation — callers receive an
 *      `anchored_mock`/`failed` record with explanatory notes instead of an
 *      exception.
 */

import { createHash } from 'crypto';
import type {
  FloodAlert,
  FloodEvidencePacket,
  FloodLedgerAnchorStatus,
  FloodLedgerChainProvider,
  FloodLedgerRecord,
  FloodRoutingPreviewSummary,
  FloodWeatherSignal,
  FloodZoneAgentEvaluation,
} from './floodGuardTypes';

export const FLOODGUARD_LEDGER_LEGAL =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

export const FLOODGUARD_MOCK_CHAIN_NOTE =
  'Local DPAL mock ledger record — not a public blockchain transaction.';

/** Backward-compatible legacy anchor result kept for older callers. */
export interface LedgerAnchorResult {
  ledgerRecordId: string;
  contentHash: string;
  anchoredAt: string;
}

/**
 * Legacy single-hash anchor — preserved for back-compat with anything still
 * importing `anchorEvidenceOnLedger`. The new path is `anchorEvidenceFull`.
 */
export function anchorEvidenceOnLedger(contentHash: string, alertId: string): LedgerAnchorResult {
  const mix = createHash('sha256').update(`${contentHash}:${alertId}`).digest('hex');
  return {
    contentHash,
    ledgerRecordId: `dpal-flood-ledger-${mix.slice(0, 12)}`,
    anchoredAt: new Date().toISOString(),
  };
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Compact, deterministic JSON-stringify for stable digests. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/* ─────────────── Provenance digests ─────────────── */

export function buildRainfallDigest(weather: FloodWeatherSignal | null | undefined): string | undefined {
  const m = weather?.rainfallMeta;
  if (!m) return undefined;
  return sha256Hex(
    stableStringify({
      provider: m.provider,
      providerLabel: m.providerLabel,
      status: m.status,
      isLive: m.isLive,
      fetchedAt: m.fetchedAt,
      intensityMmPerHr: m.intensityMmPerHr,
      lat: m.lat,
      lng: m.lng,
      upstreamUrl: m.upstreamUrl,
      attribution: m.attribution,
      message: m.message,
    }),
  );
}

export function buildSatelliteDigest(weather: FloodWeatherSignal | null | undefined): string | undefined {
  const m = weather?.satelliteMeta;
  if (!m) return undefined;
  return sha256Hex(
    stableStringify({
      provider: m.provider,
      providerLabel: m.providerLabel,
      status: m.status,
      isLive: m.isLive,
      fetchedAt: m.fetchedAt,
      ndwiMean: m.ndwiMean,
      waterExtentSqKm: m.waterExtentSqKm,
      previousWaterExtentSqKm: m.previousWaterExtentSqKm,
      waterExpansionPercent: m.waterExpansionPercent,
      floodWetConfidence: m.floodWetConfidence,
      attribution: m.attribution,
      message: m.message,
    }),
  );
}

export function buildWaterLevelDigest(weather: FloodWeatherSignal | null | undefined): string | undefined {
  const m = weather?.waterLevelMeta;
  if (!m) return undefined;
  return sha256Hex(
    stableStringify({
      gaugeId: m.gaugeId,
      gaugeName: m.gaugeName,
      gaugeType: m.gaugeType,
      provider: m.provider,
      providerLabel: m.providerLabel,
      status: m.status,
      isLive: m.isLive,
      fetchedAt: m.fetchedAt,
      readingTimestamp: m.readingTimestamp,
      waterLevelMeters: m.waterLevelMeters,
      normalLevelMeters: m.normalLevelMeters,
      warningLevelMeters: m.warningLevelMeters,
      criticalLevelMeters: m.criticalLevelMeters,
      levelPercentOfCritical: m.levelPercentOfCritical,
      trend: m.trend,
      trendDeltaMeters: m.trendDeltaMeters,
      attribution: m.attribution,
      message: m.message,
    }),
  );
}

export function buildAgentFindingsDigest(
  evaluation: FloodZoneAgentEvaluation | null | undefined,
): string | undefined {
  if (!evaluation) return undefined;
  const findings = evaluation.agentFindings.map((f) => ({
    agentId: f.agentId,
    severity: f.severity,
    summary: f.summary,
    details: f.details ?? [],
  }));
  return sha256Hex(
    stableStringify({
      classification: evaluation.missionSafetyClassification,
      rationale: evaluation.safetyRationale,
      recommended: evaluation.recommendedMissions.map((m) => m.missionType),
      blocked: evaluation.blockedMissions.map((b) => b.missionType),
      findings,
      evaluatedAt: evaluation.evaluatedAt,
    }),
  );
}

export function buildRoutingDigest(routing: FloodRoutingPreviewSummary | null | undefined): string | undefined {
  if (!routing) return undefined;
  return sha256Hex(routing.digest);
}

/* ─────────────── Ledger record builder ─────────────── */

export interface AnchorEvidenceFullInput {
  alert: FloodAlert;
  packet: FloodEvidencePacket;
  weather: FloodWeatherSignal | null;
  agentEvaluation: FloodZoneAgentEvaluation | null;
  routingPreview: FloodRoutingPreviewSummary | null;
  linkedMissionIds: string[];
  createdBy: string;
  /** Optional override; defaults to mock provider for now. */
  chainProvider?: FloodLedgerChainProvider;
  /** Optional override; defaults to `anchored_mock` for the local provider. */
  forcedStatus?: FloodLedgerAnchorStatus;
  /** Optional override label so the UI can render the provider clearly. */
  providerLabelOverride?: string;
  /** Optional verification URL when a real chain is configured. */
  verificationUrl?: string;
}

export function anchorEvidenceFull(input: AnchorEvidenceFullInput): FloodLedgerRecord {
  const now = new Date().toISOString();
  const rainfallDigest = buildRainfallDigest(input.weather);
  const satelliteDigest = buildSatelliteDigest(input.weather);
  const waterLevelDigest = buildWaterLevelDigest(input.weather);
  const agentFindingsDigest = buildAgentFindingsDigest(input.agentEvaluation);
  const routingPreviewDigest = buildRoutingDigest(input.routingPreview);

  const provider: FloodLedgerChainProvider = input.chainProvider ?? 'dpal_local_mock';
  const providerLabel =
    input.providerLabelOverride ?? describeChainProvider(provider);
  const isMock = provider === 'dpal_local_mock' || provider === 'dpal_chain_pending';

  const composite = stableStringify({
    contentHash: input.packet.contentHash,
    alertId: input.alert.alertId,
    zoneId: input.alert.zoneId,
    cityId: input.alert.cityId,
    evidencePacketId: input.packet.packetId,
    rainfallDigest,
    satelliteDigest,
    waterLevelDigest,
    agentFindingsDigest,
    routingPreviewDigest,
    linkedMissionIds: [...input.linkedMissionIds].sort(),
    legalDisclaimer: FLOODGUARD_LEDGER_LEGAL,
    chainProvider: provider,
    isMock,
    createdAt: now,
  });
  const anchoringHash = sha256Hex(composite);
  const ledgerRecordId = `dpal-flood-ledger-${anchoringHash.slice(0, 16)}`;
  const qrPayload = `dpal://floodguard/ledger/${input.alert.alertId}#${anchoringHash.slice(0, 24)}`;

  const anchorStatus: FloodLedgerAnchorStatus =
    input.forcedStatus ?? (isMock ? 'anchored_mock' : 'anchored_live');

  return {
    ledgerRecordId,
    alertId: input.alert.alertId,
    zoneId: input.alert.zoneId,
    cityId: input.alert.cityId,
    evidencePacketId: input.packet.packetId,
    contentHash: input.packet.contentHash,
    anchoringHash,
    rainfallDigest,
    satelliteDigest,
    waterLevelDigest,
    agentFindingsDigest,
    linkedMissionIds: [...input.linkedMissionIds],
    routingPreviewDigest,
    legalDisclaimer: FLOODGUARD_LEDGER_LEGAL,
    anchorStatus,
    chainProvider: provider,
    chainProviderLabel: providerLabel,
    isMock,
    createdAt: now,
    anchoredAt: now,
    createdBy: input.createdBy,
    verificationUrl: input.verificationUrl,
    qrPayload,
    notes: isMock ? FLOODGUARD_MOCK_CHAIN_NOTE : undefined,
  };
}

export function describeChainProvider(provider: FloodLedgerChainProvider): string {
  switch (provider) {
    case 'dpal_local_mock':
      return 'DPAL local mock chain';
    case 'dpal_chain_pending':
      return 'DPAL chain (pending live wiring)';
    case 'external_evm':
      return 'External EVM chain';
    case 'external_bitcoin':
      return 'External Bitcoin anchor';
    case 'external_other':
      return 'External anchoring service';
    default:
      return provider;
  }
}
