import { apiUrl, API_ROUTES } from '../../constants';

const BASE = API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_VALIDATION;

export type EnvironmentalValidationSafetyLabelsApi = {
  pending_verification: boolean;
  human_verified: boolean;
  blockchain_anchored: boolean;
};

export type DpalValidationRequestApi = {
  validationId: string;
  targetType: string;
  targetId: string;
  profileId?: string;
  packetId?: string;
  useCaseId?: string;
  requestType: string;
  status: string;
  priority: string;
  requestedBy?: string;
  assignedTo?: string;
  reviewerName?: string;
  reviewerRole?: string;
  reviewNotes?: string;
  validationResult?: string;
  safetyLabels: EnvironmentalValidationSafetyLabelsApi;
  limitations: string[];
  evidenceRefs: unknown;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type CreateEnvironmentalValidationRequestPayload = {
  packetId?: string;
  profileId?: string;
  useCaseId?: string;
  requestType: string;
  priority?: string;
  requestedBy?: string;
  evidenceRefs?: unknown;
};

export type UpdateEnvironmentalValidationRequestPayload = {
  priority?: string;
  requestedBy?: string;
  useCaseId?: string;
  reviewNotes?: string;
  limitations?: string[];
  evidenceRefs?: unknown;
};

export type AssignEnvironmentalValidationRequestPayload = {
  assignedTo?: string;
  reviewerName?: string;
  reviewerRole?: string;
};

export type CompleteEnvironmentalValidationRequestPayload = {
  validationResult: 'validated' | 'rejected' | 'inconclusive' | 'superseded';
  reviewNotes?: string;
};

function requestsPath(validationId?: string, suffix?: string): string {
  const root = `${BASE}/requests`;
  if (!validationId) return root;
  const id = encodeURIComponent(validationId);
  return suffix ? `${root}/${id}/${suffix}` : `${root}/${id}`;
}

export async function createEnvironmentalValidationRequest(
  payload: CreateEnvironmentalValidationRequestPayload,
): Promise<{ ok: true; request: DpalValidationRequestApi } | null> {
  try {
    const res = await fetch(apiUrl(requestsPath()), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; request?: DpalValidationRequestApi };
    return j?.ok && j.request ? { ok: true, request: j.request } : null;
  } catch {
    return null;
  }
}

export async function getEnvironmentalValidationRequest(
  validationId: string,
): Promise<{ ok: true; request: DpalValidationRequestApi } | null> {
  try {
    const res = await fetch(apiUrl(requestsPath(validationId)));
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; request?: DpalValidationRequestApi };
    return j?.ok && j.request ? { ok: true, request: j.request } : null;
  } catch {
    return null;
  }
}

export async function listEnvironmentalValidationRequests(
  limit = 20,
  filters?: { status?: string; targetType?: string; packetId?: string; profileId?: string },
): Promise<{ ok: true; requests: DpalValidationRequestApi[] } | null> {
  try {
    const q = new URLSearchParams({ limit: String(limit) });
    if (filters?.status) q.set('status', filters.status);
    if (filters?.targetType) q.set('targetType', filters.targetType);
    if (filters?.packetId) q.set('packetId', filters.packetId);
    if (filters?.profileId) q.set('profileId', filters.profileId);
    const res = await fetch(apiUrl(`${requestsPath()}?${q.toString()}`));
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; requests?: DpalValidationRequestApi[] };
    return j?.ok && Array.isArray(j.requests) ? { ok: true, requests: j.requests } : null;
  } catch {
    return null;
  }
}

export async function updateEnvironmentalValidationRequest(
  validationId: string,
  patch: UpdateEnvironmentalValidationRequestPayload,
): Promise<{ ok: true; request: DpalValidationRequestApi } | null> {
  try {
    const res = await fetch(apiUrl(requestsPath(validationId)), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; request?: DpalValidationRequestApi };
    return j?.ok && j.request ? { ok: true, request: j.request } : null;
  } catch {
    return null;
  }
}

export async function assignEnvironmentalValidationRequest(
  validationId: string,
  payload: AssignEnvironmentalValidationRequestPayload,
): Promise<{ ok: true; request: DpalValidationRequestApi } | null> {
  try {
    const res = await fetch(apiUrl(requestsPath(validationId, 'assign')), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; request?: DpalValidationRequestApi };
    return j?.ok && j.request ? { ok: true, request: j.request } : null;
  } catch {
    return null;
  }
}

export async function startEnvironmentalValidationRequest(
  validationId: string,
): Promise<{ ok: true; request: DpalValidationRequestApi } | null> {
  try {
    const res = await fetch(apiUrl(requestsPath(validationId, 'start')), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; request?: DpalValidationRequestApi };
    return j?.ok && j.request ? { ok: true, request: j.request } : null;
  } catch {
    return null;
  }
}

export async function completeEnvironmentalValidationRequest(
  validationId: string,
  payload: CompleteEnvironmentalValidationRequestPayload,
): Promise<{ ok: true; request: DpalValidationRequestApi } | null> {
  try {
    const res = await fetch(apiUrl(requestsPath(validationId, 'complete')), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; request?: DpalValidationRequestApi };
    return j?.ok && j.request ? { ok: true, request: j.request } : null;
  } catch {
    return null;
  }
}

export async function cancelEnvironmentalValidationRequest(
  validationId: string,
  payload?: { reviewNotes?: string },
): Promise<{ ok: true; request: DpalValidationRequestApi } | null> {
  try {
    const res = await fetch(apiUrl(requestsPath(validationId, 'cancel')), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; request?: DpalValidationRequestApi };
    return j?.ok && j.request ? { ok: true, request: j.request } : null;
  } catch {
    return null;
  }
}
