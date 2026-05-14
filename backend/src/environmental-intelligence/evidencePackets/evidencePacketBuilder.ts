import { randomBytes } from 'crypto';
import type { EnvironmentalSourceRunResponse } from '../sources/sourceRunService';
import { attachIntegrityHashToPacket } from './evidencePacketHash';
import type { DpalEvidencePacket } from './evidencePacketTypes';
import { DEFAULT_PACKET_SAFETY_LABELS } from './evidencePacketSafety';

export type BuildEvidencePacketFromSourceRunInput = {
  sourceRunResponse: EnvironmentalSourceRunResponse;
  useCaseId?: string;
  title?: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  aoiGeoJson?: unknown;
  baselineDate?: string;
  currentDate?: string;
  situationRoomId?: string;
  projectId?: string;
  qrPayload?: unknown;
};

function newPacketId(): string {
  return `ep_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`;
}

export function buildEvidencePacketFromSourceRun(input: BuildEvidencePacketFromSourceRunInput): DpalEvidencePacket {
  const sr = input.sourceRunResponse;
  const now = new Date().toISOString();
  const title =
    (input.title && input.title.trim()) ||
    (input.useCaseId ? `Environmental intelligence — ${input.useCaseId}` : `Environmental intelligence — ${sr.runId.slice(0, 8)}`);

  const base: Omit<DpalEvidencePacket, 'integrityHash' | 'integrityHashLimitation'> = {
    packetId: newPacketId(),
    runId: sr.runId,
    useCaseId: input.useCaseId?.trim() || undefined,
    title,
    locationLabel: input.locationLabel?.trim() || undefined,
    lat: input.lat,
    lng: input.lng,
    radiusKm: input.radiusKm,
    aoiGeoJson: input.aoiGeoJson,
    baselineDate: input.baselineDate,
    currentDate: input.currentDate,
    requestedSources: [...sr.requestedSources],
    providerResults: sr.results.map((r) => ({ ...r })),
    evidenceLanes: sr.normalizedEvidenceLanes.map((l) => ({ ...l })),
    confidence: {
      overall: sr.confidence.overall,
      rationale: [...sr.confidence.rationale],
      pendingVerification: sr.confidence.pendingVerification,
    },
    limitations: [...sr.limitations],
    skippedSources: sr.skippedSources?.length ? sr.skippedSources.map((s) => ({ ...s })) : undefined,
    safetyLabels: {
      pending_verification: sr.safetyLabels.pending_verification,
      human_verified: sr.safetyLabels.human_verified,
      blockchain_anchored: sr.safetyLabels.blockchain_anchored,
    },
    validationStatus: 'pending_verification',
    situationRoomId: input.situationRoomId?.trim() || undefined,
    projectId: input.projectId?.trim() || undefined,
    qrPayload: input.qrPayload,
    createdAt: now,
    updatedAt: now,
  };

  const withDefaults: typeof base = {
    ...base,
    safetyLabels: { ...DEFAULT_PACKET_SAFETY_LABELS, ...base.safetyLabels },
  };

  return attachIntegrityHashToPacket(withDefaults);
}
