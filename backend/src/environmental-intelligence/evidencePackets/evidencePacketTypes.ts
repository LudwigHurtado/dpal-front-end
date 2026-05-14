import type { EvidenceConfidenceSummary } from '../sources/confidenceEngine';
import type { EvidenceLane } from '../sources/evidenceNormalizer';
import type { ProviderRunResult } from '../sources/providerAdapters';
import type { SkippedSource } from '../sources/useCaseSourceRunner';

/** Lifecycle for review — distinct from per-provider run status. */
export type EvidencePacketValidationStatus =
  | 'pending_verification'
  | 'field_validation_requested'
  | 'under_review'
  | 'human_verified'
  | 'rejected'
  | 'superseded';

export type EvidencePacketSafetyLabels = {
  pending_verification: boolean;
  human_verified: boolean;
  blockchain_anchored: boolean;
};

/** Universal persisted output of an environmental intelligence source run. */
export type DpalEvidencePacket = {
  packetId: string;
  runId: string;
  useCaseId?: string;
  title: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  aoiGeoJson?: unknown;
  baselineDate?: string;
  currentDate?: string;
  requestedSources: string[];
  providerResults: ProviderRunResult[];
  evidenceLanes: EvidenceLane[];
  confidence: EvidenceConfidenceSummary;
  limitations: string[];
  skippedSources?: SkippedSource[];
  safetyLabels: EvidencePacketSafetyLabels;
  validationStatus: EvidencePacketValidationStatus;
  situationRoomId?: string;
  projectId?: string;
  qrPayload?: unknown;
  integrityHash: string;
  integrityHashLimitation: string;
  createdAt: string;
  updatedAt: string;
};
