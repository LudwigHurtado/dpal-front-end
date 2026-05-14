import { apiUrl, API_ROUTES } from '../../constants';

const BASE = API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_ACCOUNTABILITY_PROFILES;

export type DpalAccountabilityProfileApi = {
  profileId: string;
  profileType: string;
  companyName?: string;
  facilityName?: string;
  facilityId?: string;
  address?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  useCaseId?: string;
  claimText?: string;
  claimSourceUrl?: string;
  status: string;
  riskLevel?: string;
  anomalySummary?: string;
  validationStatus: string;
  safetyLabels: { pending_verification: boolean; human_verified: boolean; blockchain_anchored: boolean };
  limitations: string[];
  evidencePacketIds: string[];
  situationRoomIds: string[];
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateEnvironmentalAccountabilityProfilePayload = {
  profileType: string;
  companyName?: string;
  facilityName?: string;
  facilityId?: string;
  address?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  useCaseId?: string;
  claimText?: string;
  claimSourceUrl?: string;
  runEvidenceNow?: boolean;
};

export type UpdateEnvironmentalAccountabilityProfilePayload = Partial<
  Omit<DpalAccountabilityProfileApi, 'profileId' | 'createdAt' | 'updatedAt'>
>;

export type AccountabilityRiskApi = {
  riskLevel: string;
  anomalySummary: string;
  rationale: string[];
  limitations: string[];
};

export async function createEnvironmentalAccountabilityProfile(
  payload: CreateEnvironmentalAccountabilityProfilePayload,
): Promise<{ ok: true; profile: DpalAccountabilityProfileApi; packet?: unknown; risk?: AccountabilityRiskApi } | null> {
  try {
    const res = await fetch(apiUrl(BASE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      ok?: boolean;
      profile?: DpalAccountabilityProfileApi;
      packet?: unknown;
      risk?: AccountabilityRiskApi;
    };
    return j?.ok && j.profile ? { ok: true, profile: j.profile, packet: j.packet, risk: j.risk } : null;
  } catch {
    return null;
  }
}

export async function getEnvironmentalAccountabilityProfile(
  profileId: string,
): Promise<{ ok: true; profile: DpalAccountabilityProfileApi } | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/${encodeURIComponent(profileId)}`));
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; profile?: DpalAccountabilityProfileApi };
    return j?.ok && j.profile ? { ok: true, profile: j.profile } : null;
  } catch {
    return null;
  }
}

export async function listEnvironmentalAccountabilityProfiles(
  limit = 20,
  filters?: { useCaseId?: string; status?: string; companyName?: string },
): Promise<{ ok: true; profiles: DpalAccountabilityProfileApi[] } | null> {
  try {
    const q = new URLSearchParams({ limit: String(limit) });
    if (filters?.useCaseId) q.set('useCaseId', filters.useCaseId);
    if (filters?.status) q.set('status', filters.status);
    if (filters?.companyName) q.set('companyName', filters.companyName);
    const res = await fetch(apiUrl(`${BASE}?${q.toString()}`));
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; profiles?: DpalAccountabilityProfileApi[] };
    return j?.ok && Array.isArray(j.profiles) ? { ok: true, profiles: j.profiles } : null;
  } catch {
    return null;
  }
}

export async function updateEnvironmentalAccountabilityProfile(
  profileId: string,
  patch: UpdateEnvironmentalAccountabilityProfilePayload,
): Promise<{ ok: true; profile: DpalAccountabilityProfileApi } | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/${encodeURIComponent(profileId)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; profile?: DpalAccountabilityProfileApi };
    return j?.ok && j.profile ? { ok: true, profile: j.profile } : null;
  } catch {
    return null;
  }
}

export async function runEvidenceForAccountabilityProfile(
  profileId: string,
  payload?: { sourceIds?: string[]; baselineDate?: string; currentDate?: string; evidenceRefs?: unknown[] },
): Promise<{
  ok: true;
  profile: DpalAccountabilityProfileApi;
  packet: unknown;
  risk: AccountabilityRiskApi;
} | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/${encodeURIComponent(profileId)}/run-evidence`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      ok?: boolean;
      profile?: DpalAccountabilityProfileApi;
      packet?: unknown;
      risk?: AccountabilityRiskApi;
    };
    return j?.ok && j.profile && j.risk ? { ok: true, profile: j.profile, packet: j.packet, risk: j.risk } : null;
  } catch {
    return null;
  }
}

export async function attachEvidencePacketToAccountabilityProfile(
  profileId: string,
  packetId: string,
): Promise<{ ok: true; profile: DpalAccountabilityProfileApi; risk: AccountabilityRiskApi } | null> {
  try {
    const res = await fetch(
      apiUrl(`${BASE}/${encodeURIComponent(profileId)}/evidence-packets/${encodeURIComponent(packetId)}`),
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      ok?: boolean;
      profile?: DpalAccountabilityProfileApi;
      risk?: AccountabilityRiskApi;
    };
    return j?.ok && j.profile && j.risk ? { ok: true, profile: j.profile, risk: j.risk } : null;
  } catch {
    return null;
  }
}

export type SituationRoomFromAccountabilityProfilePayload = {
  reportId?: string;
  projectId?: string;
  sourceType?: string;
  title?: string;
};

export async function createSituationRoomFromAccountabilityProfile(
  profileId: string,
  payload: SituationRoomFromAccountabilityProfilePayload,
): Promise<{ ok: true; situationRoomId: string; profile: DpalAccountabilityProfileApi } | null> {
  try {
    const res = await fetch(apiUrl(`${BASE}/${encodeURIComponent(profileId)}/situation-room`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      ok?: boolean;
      situationRoomId?: string;
      profile?: DpalAccountabilityProfileApi;
    };
    return j?.ok && j.situationRoomId && j.profile ? { ok: true, situationRoomId: j.situationRoomId, profile: j.profile } : null;
  } catch {
    return null;
  }
}
