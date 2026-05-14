import { apiUrl, API_ROUTES } from '../../constants';

const BASE = API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_EVIDENCE_PACKETS;

export type EnvironmentalEvidencePacketSafetyLabels = {
  pending_verification: boolean;
  human_verified: boolean;
  blockchain_anchored: boolean;
};

export type EnvironmentalEvidencePacketValidationStatus =
  | 'pending_verification'
  | 'field_validation_requested'
  | 'under_review'
  | 'human_verified'
  | 'rejected'
  | 'superseded';

export type DpalEvidencePacketApi = {
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
  providerResults: unknown[];
  evidenceLanes: unknown[];
  confidence: {
    overall: string;
    rationale: string[];
    pendingVerification: boolean;
  };
  limitations: string[];
  skippedSources?: Array<{ sourceId: string; reason: string }>;
  safetyLabels: EnvironmentalEvidencePacketSafetyLabels;
  validationStatus: EnvironmentalEvidencePacketValidationStatus;
  situationRoomId?: string;
  projectId?: string;
  qrPayload?: unknown;
  integrityHash: string;
  integrityHashLimitation: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateEnvironmentalEvidencePacketPayload = {
  sourceRunResponse?: unknown;
  sourceIds?: string[];
  useCaseId?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  aoiGeoJson?: unknown;
  baselineDate?: string;
  currentDate?: string;
  companyName?: string;
  facilityId?: string;
  projectId?: string;
  roomId?: string;
  reportId?: string;
  evidenceRefs?: unknown[];
  title?: string;
  locationLabel?: string;
  situationRoomId?: string;
  qrPayload?: unknown;
};

export type CreateEnvironmentalEvidencePacketResponse = { ok: true; packet: DpalEvidencePacketApi };

export type GetEnvironmentalEvidencePacketResponse = { ok: true; packet: DpalEvidencePacketApi };

export type ListEnvironmentalEvidencePacketsResponse = { ok: true; packets: DpalEvidencePacketApi[] };

export type SituationRoomFromEvidencePacketPayload = {
  reportId?: string;
  projectId?: string;
  sourceType?: string;
  title?: string;
};

export type SituationRoomFromEvidencePacketResponse = {
  ok: true;
  situationRoomId: string;
  packet: DpalEvidencePacketApi;
};

export async function createEnvironmentalEvidencePacket(
  payload: CreateEnvironmentalEvidencePacketPayload,
): Promise<CreateEnvironmentalEvidencePacketResponse | null> {
  try {
    const res = await fetch(apiUrl(BASE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as CreateEnvironmentalEvidencePacketResponse;
    return j?.ok ? j : null;
  } catch {
    return null;
  }
}

export async function getEnvironmentalEvidencePacket(
  packetId: string,
): Promise<GetEnvironmentalEvidencePacketResponse | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/${encodeURIComponent(packetId)}`));
    if (!res.ok) return null;
    const j = (await res.json()) as GetEnvironmentalEvidencePacketResponse;
    return j?.ok ? j : null;
  } catch {
    return null;
  }
}

export async function listEnvironmentalEvidencePackets(
  limit = 20,
): Promise<ListEnvironmentalEvidencePacketsResponse | null> {
  try {
    const q = new URLSearchParams({ limit: String(limit) });
    const res = await fetch(apiUrl(`${BASE}?${q.toString()}`));
    if (!res.ok) return null;
    const j = (await res.json()) as ListEnvironmentalEvidencePacketsResponse;
    return j?.ok ? j : null;
  } catch {
    return null;
  }
}

export async function createSituationRoomFromEvidencePacket(
  packetId: string,
  payload: SituationRoomFromEvidencePacketPayload,
): Promise<SituationRoomFromEvidencePacketResponse | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/${encodeURIComponent(packetId)}/situation-room`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as SituationRoomFromEvidencePacketResponse;
    return j?.ok ? j : null;
  } catch {
    return null;
  }
}
