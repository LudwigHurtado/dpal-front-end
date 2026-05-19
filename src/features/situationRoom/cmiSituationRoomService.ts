import { buildApiUrl } from '../../config/api';
import { parseSituationResponseJson, situationApiErrorMessage, SituationFetchError } from '../../../services/situationFetchJson';

export type SituationRoomStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'UNDER_REVIEW'
  | 'SEALED'
  | 'ARCHIVED';

export type CmiSituationRoom = {
  roomId: string;
  title: string;
  status: SituationRoomStatus;
  canonicalUrl?: string;
  qrUrl?: string;
  projectId?: string;
  reportId?: string;
  methodologyId?: string;
  reportingPeriodStart?: string;
  reportingPeriodEnd?: string;
  aoiId?: string;
  evidencePacketId?: string;
  publicVisibility?: string;
  integrityHash?: string;
  blockchainAnchorId?: string;
  cadTrustMetadata?: Record<string, unknown>;
  cmiAlignment?: Record<string, unknown>;
  evidencePacket?: unknown;
  ledger?: unknown;
  location?: unknown;
  sealedAt?: string;
};

export type ValidatorReview = {
  validatorIdentity?: string;
  organization?: string;
  accreditation?: string;
  conflictOfInterestDisclosure?: string;
  filesReviewed?: unknown[];
  questions?: unknown[];
  findings?: unknown[];
  deficiencies?: unknown[];
  reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  finalNote?: string;
  attestationSignature?: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildApiUrl(path), init);
  const data = await parseSituationResponseJson(res);
  if (!res.ok) {
    throw new SituationFetchError({
      message: situationApiErrorMessage(data, res.status, res.statusText),
      status: res.status,
      statusText: res.statusText,
      contextLabel: path,
    });
  }
  return data as T;
}

export async function fetchCmiRoom(roomId: string): Promise<CmiSituationRoom> {
  const data = await api<{ room: CmiSituationRoom }>(`/api/situation/rooms/${encodeURIComponent(roomId)}`);
  return data.room;
}

export async function ensureReportRoom(reportId: string, title?: string): Promise<CmiSituationRoom> {
  const data = await api<{ room: CmiSituationRoom }>(`/api/situation/report/${encodeURIComponent(reportId)}`);
  if (title && data.room.title !== title) {
    return patchCmiRoom(reportId, { title });
  }
  return data.room;
}

export async function patchCmiRoom(roomId: string, body: Partial<CmiSituationRoom>): Promise<CmiSituationRoom> {
  const data = await api<{ room: CmiSituationRoom }>(`/api/situation/rooms/${encodeURIComponent(roomId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return data.room;
}

export async function sealCmiRoom(roomId: string): Promise<CmiSituationRoom> {
  const data = await api<{ room: CmiSituationRoom }>(`/api/situation/rooms/${encodeURIComponent(roomId)}/seal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return data.room;
}

export async function fetchValidatorReview(roomId: string): Promise<ValidatorReview | null> {
  const data = await api<{ review: ValidatorReview | null }>(
    `/api/situation/rooms/${encodeURIComponent(roomId)}/validator-review`,
  );
  return data.review;
}

export async function saveValidatorReview(roomId: string, review: ValidatorReview): Promise<ValidatorReview> {
  const data = await api<{ review: ValidatorReview }>(
    `/api/situation/rooms/${encodeURIComponent(roomId)}/validator-review`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    },
  );
  return data.review;
}

export async function fetchEvidenceExport(roomId: string): Promise<Record<string, unknown>> {
  const data = await api<{ evidencePacket: Record<string, unknown> }>(
    `/api/situation/rooms/${encodeURIComponent(roomId)}/evidence-export`,
  );
  return data.evidencePacket;
}

export async function fetchPublicRoom(roomId: string): Promise<{ room: CmiSituationRoom; messages: unknown[] }> {
  return api(`/api/situation/rooms/${encodeURIComponent(roomId)}/public`);
}
