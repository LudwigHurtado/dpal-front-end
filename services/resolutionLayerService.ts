import { getApiBase } from '../constants';

export type ResolutionStatus = 'Verified' | 'Escalated' | 'Resolved' | 'Ignored';
export type ResolutionSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ResolutionCaseRecord {
  id: string;
  title: string;
  category: string;
  location: string;
  severity: ResolutionSeverity;
  status: ResolutionStatus;
  entity: string;
  reporter: string;
  verifier: string;
  resolutionScore: number;
  responseSla: string;
  lastUpdate: string;
  summary: string;
  publicImpact: string;
  nextAction: string;
  updatedAt?: string;
}

const RESOLUTION_LOCAL_KEY = 'dpal_resolution_cases_v1';

const readLocal = (): ResolutionCaseRecord[] => {
  try {
    const raw = localStorage.getItem(RESOLUTION_LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ResolutionCaseRecord[]) : [];
  } catch {
    return [];
  }
};

const writeLocal = (rows: ResolutionCaseRecord[]): void => {
  try {
    localStorage.setItem(RESOLUTION_LOCAL_KEY, JSON.stringify(rows.slice(0, 300)));
  } catch {
    // ignore localStorage write failures
  }
};

const upsertLocal = (record: ResolutionCaseRecord): void => {
  const nowIso = new Date().toISOString();
  const prev = readLocal();
  const nextRow: ResolutionCaseRecord = { ...record, updatedAt: nowIso };
  const dedup = prev.filter((row) => row.id !== record.id);
  writeLocal([nextRow, ...dedup]);
};

type PersistResult = { ok: boolean; endpoint: string; status?: number; error?: string };
export type RewardIssueResult = { ok: boolean; newBalance?: number; ledgerEntryId?: string; error?: string };
export type ResolutionRouteSeed = { destination: string; channel: string; target?: string };
export type MockResolutionSeed = ResolutionCaseRecord & {
  validatorNodeId: string;
  walletAddress?: string;
  routes: ResolutionRouteSeed[];
};

const postJson = async (path: string, body: unknown): Promise<Response | null> => {
  const apiBase = getApiBase().replace(/\/$/, '');
  try {
    return await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return null;
  }
};

const mapSeverity = (severity: ResolutionSeverity): 'Informational' | 'Standard' | 'Critical' | 'Catastrophic' => {
  if (severity === 'Critical') return 'Catastrophic';
  if (severity === 'High') return 'Critical';
  if (severity === 'Medium') return 'Standard';
  return 'Informational';
};

const mapStatus = (status: ResolutionStatus): 'Submitted' | 'In Review' | 'Resolved' => {
  if (status === 'Resolved') return 'Resolved';
  if (status === 'Escalated' || status === 'Ignored') return 'In Review';
  return 'Submitted';
};

export const getLocalResolutionCases = (): ResolutionCaseRecord[] => readLocal();

const getApi = (): string => getApiBase().replace(/\/$/, '');

const fromServerStatus = (status?: string): ResolutionStatus => {
  if (status === 'resolved') return 'Resolved';
  if (status === 'escalated' || status === 'responded' || status === 'corrected') return 'Escalated';
  if (status === 'ignored') return 'Ignored';
  return 'Verified';
};

export async function fetchResolutionCasesFromApi(): Promise<ResolutionCaseRecord[]> {
  try {
    const res = await fetch(`${getApi()}/api/resolution/cases?limit=200`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const rows = Array.isArray((data as any)?.cases) ? (data as any).cases : [];
    const mapped: ResolutionCaseRecord[] = rows.map((row: any) => ({
      id: String(row.caseId ?? row.id ?? `case-${Date.now()}`),
      title: String(row.title ?? 'Resolution Case'),
      category: String(row.category ?? 'Other'),
      location: String(row.location ?? 'Unknown'),
      severity: (String(row.severity ?? 'Medium') as ResolutionSeverity),
      status: fromServerStatus(String(row.status ?? 'verified')),
      entity: String(row.entity ?? ''),
      reporter: String(row.reporter ?? ''),
      verifier: String(row.verifier ?? ''),
      resolutionScore: Number(row.resolutionScore ?? 0),
      responseSla: `${Number(row.responseSlaHours ?? 48)} hours`,
      lastUpdate: row.updatedAt ? new Date(row.updatedAt).toLocaleString() : new Date().toLocaleString(),
      summary: String(row.summary ?? ''),
      publicImpact: String(row.publicImpact ?? ''),
      nextAction: String(row.nextAction ?? ''),
      updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
    }));
    for (const row of mapped) upsertLocal(row);
    return mapped;
  } catch {
    return [];
  }
}

export async function persistResolutionCase(record: ResolutionCaseRecord): Promise<PersistResult> {
  upsertLocal(record);

  // Phase 1 entrypoint: emulate validator completion event into resolution pipeline.
  await postJson('/api/resolution/events', {
    eventType: 'case.verified',
    caseId: record.id,
    title: record.title,
    category: record.category,
    location: record.location,
    severity: record.severity,
    summary: record.summary,
    publicImpact: record.publicImpact,
    nextAction: record.nextAction,
    resolutionScore: record.resolutionScore,
    actor: 'resolution-layer-ui',
  });

  const primary = await postJson('/api/resolution/cases', { ...record, source: 'dpal-resolution-layer' });
  if (primary?.ok) return { ok: true, endpoint: '/api/resolution/cases', status: primary.status };

  // Fallback for deployments that only expose /api/reports
  const reportFallback = await postJson('/api/reports', {
    id: `res-${record.id.toLowerCase()}`,
    title: record.title,
    description: `${record.summary}\n\nNext action: ${record.nextAction}`,
    category: record.category || 'Other',
    location: record.location || 'Unknown',
    timestamp: new Date().toISOString(),
    status: mapStatus(record.status),
    severity: mapSeverity(record.severity),
    isActionable: true,
    trustScore: Math.max(0, Math.min(100, record.resolutionScore)),
    metadata: {
      resolutionCaseId: record.id,
      entity: record.entity,
      reporter: record.reporter,
      verifier: record.verifier,
      responseSla: record.responseSla,
      publicImpact: record.publicImpact,
    },
  });

  if (reportFallback?.ok) return { ok: true, endpoint: '/api/reports', status: reportFallback.status };
  return {
    ok: false,
    endpoint: '/api/resolution/cases',
    status: reportFallback?.status ?? primary?.status,
    error: 'Unable to publish to backend; saved locally.',
  };
}

export async function escalateResolutionCase(record: ResolutionCaseRecord): Promise<PersistResult> {
  const escalationPayload = {
    caseId: record.id,
    title: record.title,
    category: record.category,
    location: record.location,
    severity: record.severity,
    status: 'Escalated',
    requestedAt: new Date().toISOString(),
    source: 'dpal-resolution-layer',
  };

  const primary = await postJson('/api/resolution/escalate', escalationPayload);
  if (primary?.ok) {
    upsertLocal({ ...record, status: 'Escalated', lastUpdate: new Date().toLocaleString() });
    return { ok: true, endpoint: '/api/resolution/escalate', status: primary.status };
  }

  // Fallback: persist as updated resolution case
  const fallback = await persistResolutionCase({
    ...record,
    status: 'Escalated',
    lastUpdate: new Date().toLocaleString(),
  });
  return fallback.ok
    ? { ok: true, endpoint: fallback.endpoint, status: fallback.status }
    : { ok: false, endpoint: '/api/resolution/escalate', status: fallback.status, error: fallback.error };
}

export async function progressResolutionCase(
  caseId: string,
  action: 'respond' | 'correct' | 'resolve',
  note?: string
): Promise<PersistResult> {
  const path = `/api/resolution/cases/${encodeURIComponent(caseId)}/${action}`;
  const res = await postJson(path, { note, actor: 'resolution-layer-ui' });
  if (res?.ok) return { ok: true, endpoint: path, status: res.status };
  return { ok: false, endpoint: path, status: res?.status, error: `Failed to ${action} case.` };
}

export async function submitCorrectionProof(
  caseId: string,
  payload: { title: string; url?: string; sha256?: string; note?: string }
): Promise<PersistResult> {
  const path = `/api/resolution/cases/${encodeURIComponent(caseId)}/proof`;
  const res = await postJson(path, {
    kind: 'proof_of_correction',
    title: payload.title,
    url: payload.url,
    sha256: payload.sha256,
    metadata: payload.note ? { note: payload.note } : undefined,
    uploadedBy: 'resolution-layer-ui',
  });
  if (res?.ok) return { ok: true, endpoint: path, status: res.status };
  return { ok: false, endpoint: path, status: res?.status, error: 'Failed to submit correction proof.' };
}

export async function issueResolutionReward(params: {
  walletAddress: string;
  caseId: string;
  amountCoins: number;
  reason: string;
}): Promise<RewardIssueResult> {
  const res = await postJson('/api/rewards/issue', {
    walletAddress: params.walletAddress,
    caseId: params.caseId,
    amountCoins: params.amountCoins,
    reason: params.reason,
    source: 'resolution-layer',
  });
  if (!res?.ok) {
    return { ok: false, error: 'Reward issuance failed' };
  }
  const json = await res.json().catch(() => ({} as any));
  return {
    ok: true,
    newBalance: Number(json?.newBalance ?? 0),
    ledgerEntryId: typeof json?.ledgerEntryId === 'string' ? json.ledgerEntryId : undefined,
  };
}

export function subscribeResolutionEvents(onEvent: (event: any) => void): () => void {
  const stream = new EventSource(`${getApi()}/api/resolution/stream`);
  stream.onmessage = (ev) => {
    try {
      onEvent(JSON.parse(ev.data));
    } catch {
      onEvent({ type: 'raw', data: ev.data });
    }
  };
  stream.onerror = () => {
    // browser will auto-reconnect for EventSource
  };
  return () => stream.close();
}

export const MOCK_VALIDATOR_PIPELINE_CASES: MockResolutionSeed[] = [
  {
    id: 'DPAL-2026-MOCK-1001',
    title: 'Unsafe apartment wiring after landlord no-show',
    category: 'Housing Conditions',
    location: 'Santa Cruz, Bolivia',
    severity: 'High',
    status: 'Verified',
    entity: 'Landlord / Property Manager',
    reporter: 'Community Reporter',
    verifier: 'Regional Validator Node',
    resolutionScore: 78,
    responseSla: '48 hours',
    lastUpdate: new Date().toLocaleString(),
    summary: 'Validator confirmed repeated electrical hazard with child exposure risk.',
    publicImpact: 'Fire risk and unstable housing conditions for minors.',
    nextAction: 'Escalate to housing office and legal aid for urgent intervention.',
    validatorNodeId: 'validator-node-housing-01',
    routes: [
      { destination: 'Municipal Housing Office', channel: 'email' },
      { destination: 'Community Legal Aid Network', channel: 'api' },
      { destination: 'Family Safety Volunteer Team', channel: 'queue' },
    ],
  },
  {
    id: 'DPAL-2026-MOCK-1002',
    title: 'School sanitation failure despite prior warning',
    category: 'School Neglect / Underfunding',
    location: 'El Alto, Bolivia',
    severity: 'Medium',
    status: 'Verified',
    entity: 'School Administration',
    reporter: 'Parent Coalition',
    verifier: 'Education Validator Node',
    resolutionScore: 64,
    responseSla: '72 hours',
    lastUpdate: new Date().toLocaleString(),
    summary: 'Evidence bundle confirms contamination pattern in student meal prep area.',
    publicImpact: 'Child food safety and health exposure risk.',
    nextAction: 'Escalate to district health office and inspector queue.',
    validatorNodeId: 'validator-node-education-01',
    routes: [
      { destination: 'District Health Office', channel: 'api' },
      { destination: 'School Oversight Board', channel: 'email' },
      { destination: 'Parent Alert Network', channel: 'sms' },
    ],
  },
  {
    id: 'DPAL-2026-MOCK-1003',
    title: 'Road sinkhole unresolved past city commitment date',
    category: 'Road Hazards',
    location: 'La Paz, Bolivia',
    severity: 'High',
    status: 'Verified',
    entity: 'Municipal Roads Department',
    reporter: 'Neighborhood Mission Team',
    verifier: 'Infrastructure Validator Node',
    resolutionScore: 58,
    responseSla: '7 days',
    lastUpdate: new Date().toLocaleString(),
    summary: 'Validator confirms safety hazard persists after published repair promise.',
    publicImpact: 'Vehicle damage and pedestrian injury risk in active traffic corridor.',
    nextAction: 'Escalate and publish unresolved marker to accountability scorecard.',
    validatorNodeId: 'validator-node-infra-01',
    routes: [
      { destination: 'Public Works Intake', channel: 'api' },
      { destination: 'Traffic Safety Unit', channel: 'email' },
      { destination: 'Citizen Watch Channel', channel: 'queue' },
    ],
  },
  {
    id: 'DPAL-2026-MOCK-1004',
    title: 'Clinic medication stockout despite emergency request',
    category: 'Medical Negligence',
    location: 'Cochabamba, Bolivia',
    severity: 'Critical',
    status: 'Verified',
    entity: 'Regional Public Clinic',
    reporter: 'Caregiver Group',
    verifier: 'Health Validator Node',
    resolutionScore: 86,
    responseSla: '24 hours',
    lastUpdate: new Date().toLocaleString(),
    summary: 'Validator confirmed medicine stockout with prior documented emergency request.',
    publicImpact: 'Immediate treatment interruption for vulnerable patients.',
    nextAction: 'Escalate to health authority and emergency medicine response partner.',
    validatorNodeId: 'validator-node-health-01',
    routes: [
      { destination: 'Regional Health Authority', channel: 'api' },
      { destination: 'Emergency Medicine Partner', channel: 'email' },
      { destination: 'Crisis Volunteer Dispatch', channel: 'queue' },
    ],
  },
];

export async function runMockValidatorPipeline(seed: MockResolutionSeed): Promise<PersistResult> {
  upsertLocal(seed);

  const eventRes = await postJson('/api/resolution/events', {
    eventType: 'case.verified',
    caseId: seed.id,
    validatorNodeId: seed.validatorNodeId,
    title: seed.title,
    category: seed.category,
    location: seed.location,
    severity: seed.severity,
    entity: seed.entity,
    reporter: seed.reporter,
    verifier: seed.verifier,
    summary: seed.summary,
    publicImpact: seed.publicImpact,
    nextAction: seed.nextAction,
    resolutionScore: seed.resolutionScore,
    responseSlaHours: parseInt(seed.responseSla, 10) || 48,
    walletAddress: seed.walletAddress,
    actor: seed.validatorNodeId,
    payload: { mock: true, source: 'frontend-mock-validator' },
  });
  if (!eventRes?.ok) {
    return { ok: false, endpoint: '/api/resolution/events', status: eventRes?.status, error: 'Failed validator event ingestion' };
  }

  const escRes = await postJson('/api/resolution/escalate', {
    caseId: seed.id,
    routes: seed.routes,
  });
  if (!escRes?.ok) {
    return { ok: false, endpoint: '/api/resolution/escalate', status: escRes?.status, error: 'Validator event ingested, escalation queue failed' };
  }

  return { ok: true, endpoint: '/api/resolution/escalate', status: escRes.status };
}
