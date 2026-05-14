import { apiUrl, API_ROUTES } from '../../constants';

const BASE = API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_BUSINESS_WORKFLOWS;

export type EnvironmentalBusinessWorkflowTemplate = {
  workflowId: string;
  name: string;
  description: string;
  defaultProfileType: string;
  defaultUseCaseId: string;
  defaultValidationRequestType: string;
  requiresValidation: boolean;
  outputProducts: string[];
  safetyLanguage: string;
  limitations: string[];
};

export type RunEnvironmentalBusinessWorkflowPayload = {
  workflowId: string;
  companyName?: string;
  facilityName?: string;
  facilityId?: string;
  address?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  claimText?: string;
  claimSourceUrl?: string;
  useCaseId?: string;
  profileType?: string;
  runEvidenceNow?: boolean;
  createValidationRequest?: boolean;
  validationRequestType?: string;
  priority?: string;
  evidenceRefs?: unknown;
};

export type EnvironmentalBusinessWorkflowRunApi = {
  workflowRunId: string;
  workflowId: string;
  workflowName: string;
  status: string;
  profileId?: string;
  packetId?: string;
  validationId?: string;
  useCaseId?: string;
  companyName?: string;
  facilityName?: string;
  claimText?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  input: RunEnvironmentalBusinessWorkflowPayload;
  outputSummary: Record<string, unknown>;
  safetyLabels: { pending_verification: boolean; human_verified: boolean; blockchain_anchored: boolean };
  limitations: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export async function listEnvironmentalBusinessWorkflowTemplates(): Promise<{
  ok: true;
  templates: EnvironmentalBusinessWorkflowTemplate[];
} | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/templates`));
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; templates?: EnvironmentalBusinessWorkflowTemplate[] };
    return j?.ok && Array.isArray(j.templates) ? { ok: true, templates: j.templates } : null;
  } catch {
    return null;
  }
}

export async function runEnvironmentalBusinessWorkflow(
  payload: RunEnvironmentalBusinessWorkflowPayload,
): Promise<{
  ok: true;
  workflowRunId: string;
  profileId?: string;
  packetId?: string;
  validationId?: string;
  workflowRun: EnvironmentalBusinessWorkflowRunApi;
  profile: unknown;
  packet?: unknown;
  validationRequest?: unknown;
  risk?: unknown;
  safetyLabels: unknown;
  limitations: string[];
} | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/run`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      ok?: boolean;
      workflowRunId?: string;
      profileId?: string;
      packetId?: string;
      validationId?: string;
      workflowRun?: EnvironmentalBusinessWorkflowRunApi;
      profile?: unknown;
      packet?: unknown;
      validationRequest?: unknown;
      risk?: unknown;
      safetyLabels?: unknown;
      limitations?: string[];
    };
    if (!j?.ok || !j.workflowRun || !j.workflowRunId) return null;
    return {
      ok: true,
      workflowRunId: j.workflowRunId,
      profileId: j.profileId,
      packetId: j.packetId,
      validationId: j.validationId,
      workflowRun: j.workflowRun,
      profile: j.profile,
      packet: j.packet,
      validationRequest: j.validationRequest,
      risk: j.risk,
      safetyLabels: j.safetyLabels,
      limitations: j.limitations ?? [],
    };
  } catch {
    return null;
  }
}

export async function getEnvironmentalBusinessWorkflowRun(
  workflowRunId: string,
): Promise<{ ok: true; workflowRun: EnvironmentalBusinessWorkflowRunApi } | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/runs/${encodeURIComponent(workflowRunId)}`));
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; workflowRun?: EnvironmentalBusinessWorkflowRunApi };
    return j?.ok && j.workflowRun ? { ok: true, workflowRun: j.workflowRun } : null;
  } catch {
    return null;
  }
}

export async function listEnvironmentalBusinessWorkflowRuns(
  limit = 20,
  query?: { workflowId?: string; status?: string },
): Promise<{ ok: true; runs: EnvironmentalBusinessWorkflowRunApi[] } | null> {
  try {
    const q = new URLSearchParams();
    q.set('limit', String(limit));
    if (query?.workflowId) q.set('workflowId', query.workflowId);
    if (query?.status) q.set('status', query.status);
    const res = await fetch(apiUrl(`${BASE}/runs?${q.toString()}`));
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; runs?: EnvironmentalBusinessWorkflowRunApi[] };
    return j?.ok && Array.isArray(j.runs) ? { ok: true, runs: j.runs } : null;
  } catch {
    return null;
  }
}

export async function updateEnvironmentalBusinessWorkflowRun(
  workflowRunId: string,
  patch: { companyName?: string; facilityName?: string; claimText?: string; operatorNotes?: string },
): Promise<{ ok: true; workflowRun: EnvironmentalBusinessWorkflowRunApi } | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/runs/${encodeURIComponent(workflowRunId)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; workflowRun?: EnvironmentalBusinessWorkflowRunApi };
    return j?.ok && j.workflowRun ? { ok: true, workflowRun: j.workflowRun } : null;
  } catch {
    return null;
  }
}

export async function cancelEnvironmentalBusinessWorkflowRun(
  workflowRunId: string,
): Promise<{ ok: true; workflowRun: EnvironmentalBusinessWorkflowRunApi } | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/runs/${encodeURIComponent(workflowRunId)}/cancel`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; workflowRun?: EnvironmentalBusinessWorkflowRunApi };
    return j?.ok && j.workflowRun ? { ok: true, workflowRun: j.workflowRun } : null;
  } catch {
    return null;
  }
}
