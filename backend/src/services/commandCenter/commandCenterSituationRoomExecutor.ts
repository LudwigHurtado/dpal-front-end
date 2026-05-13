import type {
  CommandCenterModuleKey,
  CommandCenterModuleRunResult,
  CommandCenterRunContext,
  CommandCenterRunMode,
  CommandCenterSafetyLabels,
} from './commandCenterRunTypes';
import { COMMAND_CENTER_WORKSPACE_VIEW } from './commandCenterModuleRegistry';

const VIEW = COMMAND_CENTER_WORKSPACE_VIEW.situationRoom;

const CC_SITUATION_LIMITATIONS = [
  'Situation Room handoff is a coordination record, not verification.',
  'Evidence hash is integrity metadata for the handoff payload — not blockchain anchoring.',
  'No automatic publication.',
  'No legal or enforcement conclusion.',
  'Full Situation Room workspace is required for chat, media uploads, validator review, and public sharing controls.',
  'Human review may be required.',
];

const PROJECT_POST_TIMEOUT_MS = 35_000;

function internalApiOrigin(): string {
  const fromEnv = process.env.COMMAND_CENTER_INTERNAL_API_ORIGIN?.trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const port = parseInt(process.env.PORT ?? '3001', 10);
  return `http://127.0.0.1:${Number.isFinite(port) ? port : 3001}`;
}

function bodyPreview(text: string, max = 280): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

type FetchPostOutcome =
  | { kind: 'ok'; status: number; body: unknown; rawText: string }
  | { kind: 'bad_status'; status: number; rawText: string }
  | { kind: 'network'; message: string };

async function fetchPostJson(url: string, payload: unknown, timeoutMs: number, label: string): Promise<FetchPostOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const rawText = await res.text();
    let body: unknown = null;
    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = null;
    }
    if (res.status === 429) return { kind: 'bad_status', status: 429, rawText };
    if (!res.ok) return { kind: 'bad_status', status: res.status, rawText };
    return { kind: 'ok', status: res.status, body, rawText };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('aborted')) {
      return { kind: 'network', message: `timeout:${label}` };
    }
    return { kind: 'network', message: msg };
  } finally {
    clearTimeout(timer);
  }
}

function classifyNetwork(msg: string): 'unavailable' | 'rate_limited' | 'error' {
  const low = msg.toLowerCase();
  if (
    low.includes('timeout:') ||
    low.includes('etimedout') ||
    low.includes('econnreset') ||
    low.includes('socket') ||
    low.includes('fetch failed')
  ) {
    return 'unavailable';
  }
  if (low.includes('429') || low.includes('rate limit')) return 'rate_limited';
  return 'error';
}

function asRecord(x: unknown): Record<string, unknown> {
  return x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
}

function compactPriorResults(prior: CommandCenterModuleRunResult[]): unknown[] {
  return prior.map((r) => ({
    moduleKey: r.moduleKey,
    status: r.status,
    headline: r.headline,
    limitations: Array.isArray(r.limitations) ? r.limitations.slice(0, 6) : [],
    providerLanesSummary: (r.providerLanes ?? []).slice(0, 12).map((p) => ({ id: p.id, state: p.state, detail: p.detail ? bodyPreview(p.detail, 120) : undefined })),
    evidenceRefsSample: (r.evidenceRefs ?? []).slice(0, 5).map((e) => ({ id: e.id, label: bodyPreview(e.label, 160) })),
  }));
}

export type SituationRoomCommandCenterInput = {
  runId: string;
  context: CommandCenterRunContext;
  runMode: CommandCenterRunMode;
  selectedModules: CommandCenterModuleKey[];
  priorResults: CommandCenterModuleRunResult[];
  safetyLabels: CommandCenterSafetyLabels;
};

export async function executeSituationRoomForCommandCenter(input: SituationRoomCommandCenterInput): Promise<CommandCenterModuleRunResult> {
  const { runId, context: ctx, runMode, selectedModules, priorResults, safetyLabels } = input;
  const baseLim = CC_SITUATION_LIMITATIONS;
  const titleLabel = (ctx.locationDescription || '').trim() || `${ctx.latitude.toFixed(5)}, ${ctx.longitude.toFixed(5)}`;
  const projectId = `command-center-${runId}`;

  const evidencePacket = {
    kind: 'command_center_run_handoff',
    runId,
    runMode,
    selectedModules,
    scanModules: selectedModules.filter((m) => m !== 'situationRoom'),
    location: {
      label: ctx.locationDescription,
      latitude: ctx.latitude,
      longitude: ctx.longitude,
      radiusKm: ctx.radiusKm,
    },
    dateRange: {
      baselineDateIso: ctx.baselineDateIso,
      currentDateIso: ctx.currentDateIso,
    },
    goal: ctx.goal,
    investorDemoFraming: ctx.investorDemoFraming === true,
    moduleResultsSummary: compactPriorResults(priorResults),
    safetyLabels,
  };

  const statusLine =
    priorResults.length === 0
      ? 'no prior module rows in this run.'
      : priorResults.map((r) => `${r.moduleKey}:${r.status}`).join(', ');

  const aiSummary = {
    text: 'Command Center attached live scan evidence leads for selected modules.',
    moduleStatuses: statusLine,
    generatedBy: 'command_center_engine_deterministic',
    generatedAtIso: new Date().toISOString(),
  };

  const sourceSnapshot = {
    context: {
      goal: ctx.goal,
      locationDescription: ctx.locationDescription,
      latitude: ctx.latitude,
      longitude: ctx.longitude,
      radiusKm: ctx.radiusKm,
      baselineDateIso: ctx.baselineDateIso,
      currentDateIso: ctx.currentDateIso,
    },
    moduleStatuses: priorResults.map((r) => ({ moduleKey: r.moduleKey, status: r.status })),
  };

  const ledger = {
    verificationStatus: 'pending' as const,
  };

  const postBody = {
    projectId,
    sourceType: 'manual',
    title: `DPAL Command Center Run — ${titleLabel}`,
    category: 'Command Center',
    location: {
      label: ctx.locationDescription || titleLabel,
      lat: ctx.latitude,
      lng: ctx.longitude,
    },
    evidencePacket,
    aiSummary,
    sourceSnapshot,
    ledger,
  };

  if (runMode === 'dry_run') {
    return {
      moduleKey: 'situationRoom',
      status: 'preview_ready',
      runMode,
      headline: 'Situation Room — handoff preview (no POST /api/situation/project from Command Center dry run).',
      limitations: [
        ...baseLim,
        `Would attach projectId ${projectId} with evidence packet summary for ${priorResults.length} prior module result(s).`,
      ],
      providerLanes: [
        { id: 'situation-project', label: 'POST /api/situation/project', state: 'preview', detail: 'Not invoked from Command Center dry run.' },
        { id: 'evidence-hash', label: 'Evidence packet hash', state: 'preview', detail: 'Generated by Situation Room route after POST — not run in dry_run.' },
        { id: 'coordination', label: 'Coordination room', state: 'preview', detail: 'Full workspace for chat, media, and sharing controls.' },
      ],
      evidenceRefs: [{ id: 'projectId', label: `projectId: ${projectId}` }],
      openWorkspaceView: VIEW,
    };
  }

  const pendingCount = priorResults.filter((r) => r.status === 'pending_adapter').length;
  const mostlyPending = priorResults.length > 0 && pendingCount / priorResults.length >= 0.5;

  const origin = internalApiOrigin();
  const url = `${origin}/api/situation/project`;
  const out = await fetchPostJson(url, postBody, PROJECT_POST_TIMEOUT_MS, 'situation_project');

  if (out.kind === 'network') {
    const k = classifyNetwork(out.message);
    if (k === 'unavailable') {
      return {
        moduleKey: 'situationRoom',
        status: 'unavailable',
        runMode,
        headline: 'Situation Room — POST /api/situation/project timed out or network failed.',
        limitations: baseLim,
        providerLanes: [{ id: 'situation-project', label: 'POST /api/situation/project', state: 'unavailable', detail: bodyPreview(out.message) }],
        evidenceRefs: [{ id: 'endpoint', label: 'POST /api/situation/project' }],
        openWorkspaceView: VIEW,
        errorMessage: bodyPreview(out.message),
      };
    }
    if (k === 'rate_limited') {
      return {
        moduleKey: 'situationRoom',
        status: 'rate_limited',
        runMode,
        headline: 'Situation Room — rate limited on project attach.',
        limitations: baseLim,
        providerLanes: [{ id: 'situation-project', label: 'POST /api/situation/project', state: 'rate_limited', detail: bodyPreview(out.message) }],
        evidenceRefs: [],
        openWorkspaceView: VIEW,
        errorMessage: bodyPreview(out.message),
      };
    }
    return {
      moduleKey: 'situationRoom',
      status: 'error',
      runMode,
      headline: 'Situation Room — POST /api/situation/project failed.',
      limitations: baseLim,
      providerLanes: [{ id: 'situation-project', label: 'POST /api/situation/project', state: 'error', detail: bodyPreview(out.message) }],
      evidenceRefs: [{ id: 'endpoint', label: 'POST /api/situation/project' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(out.message),
    };
  }

  if (out.kind === 'bad_status' && out.status === 429) {
    return {
      moduleKey: 'situationRoom',
      status: 'rate_limited',
      runMode,
      headline: 'Situation Room — HTTP 429 on project attach.',
      limitations: baseLim,
      providerLanes: [{ id: 'situation-project', label: 'POST /api/situation/project', state: 'rate_limited', detail: bodyPreview(out.rawText) }],
      evidenceRefs: [],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(out.rawText),
    };
  }

  if (out.kind === 'bad_status') {
    return {
      moduleKey: 'situationRoom',
      status: 'error',
      runMode,
      headline: `Situation Room — POST /api/situation/project HTTP ${out.status}.`,
      limitations: baseLim,
      providerLanes: [{ id: 'situation-project', label: 'POST /api/situation/project', state: 'error', detail: bodyPreview(out.rawText) }],
      evidenceRefs: [{ id: 'endpoint', label: 'POST /api/situation/project' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(out.rawText),
    };
  }

  const body = asRecord(out.body);
  if (body.ok !== true) {
    return {
      moduleKey: 'situationRoom',
      status: 'error',
      runMode,
      headline: 'Situation Room — POST /api/situation/project returned ok:false or invalid JSON.',
      limitations: baseLim,
      providerLanes: [{ id: 'situation-project', label: 'POST /api/situation/project', state: 'error', detail: bodyPreview(out.rawText) }],
      evidenceRefs: [{ id: 'endpoint', label: 'POST /api/situation/project' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(out.rawText),
    };
  }

  const room = asRecord(body.room);
  const roomId = typeof room.roomId === 'string' ? room.roomId : '';
  const returnedProjectId = typeof room.projectId === 'string' ? room.projectId : projectId;
  const ledgerRoom = asRecord(room.ledger);
  const evidenceHash = typeof ledgerRoom.evidenceHash === 'string' ? ledgerRoom.evidenceHash : undefined;
  const qr = asRecord(room.qr);
  const situationRoomUrl = typeof qr.situationRoomUrl === 'string' ? qr.situationRoomUrl : undefined;
  const transparencyUrl = typeof qr.transparencyUrl === 'string' ? qr.transparencyUrl : undefined;
  const roomStatus = typeof room.status === 'string' ? room.status : '';

  if (!roomId) {
    return {
      moduleKey: 'situationRoom',
      status: 'error',
      runMode,
      headline: 'Situation Room — response missing roomId.',
      limitations: baseLim,
      providerLanes: [{ id: 'situation-project', label: 'POST /api/situation/project', state: 'error', detail: bodyPreview(out.rawText) }],
      evidenceRefs: [{ id: 'endpoint', label: 'POST /api/situation/project' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(out.rawText),
    };
  }

  const hashLaneState = evidenceHash ? 'ok' : 'partial';
  const coordLaneState = roomStatus === 'active' ? 'ok' : 'partial';

  let moduleStatus: CommandCenterModuleRunResult['status'] = 'success';
  if (priorResults.length === 0 || mostlyPending) {
    moduleStatus = 'partial';
  }

  const headline =
    moduleStatus === 'partial'
      ? 'Situation Room — project attached; prior Command Center module results were empty or mostly pending_adapter (coordination record only).'
      : 'Situation Room — Command Center run evidence handoff attached as a project record (coordination — not verification).';

  const evidenceRefs: CommandCenterModuleRunResult['evidenceRefs'] = [
    { id: 'endpoint', label: 'POST /api/situation/project' },
    { id: 'projectId', label: `projectId: ${returnedProjectId}` },
    { id: 'roomId', label: `roomId: ${roomId}` },
  ];
  if (evidenceHash) evidenceRefs.push({ id: 'evidenceHash', label: `ledger.evidenceHash: ${evidenceHash}` });
  if (situationRoomUrl) evidenceRefs.push({ id: 'situationRoomUrl', label: bodyPreview(`qr.situationRoomUrl: ${situationRoomUrl}`, 220) });
  if (transparencyUrl) evidenceRefs.push({ id: 'transparencyUrl', label: bodyPreview(`qr.transparencyUrl: ${transparencyUrl}`, 220) });

  const extraLims: string[] = [];
  if (priorResults.length === 0) {
    extraLims.push('No prior scan module results in this run — handoff contains Command Center context and safety labels only.');
  } else if (mostlyPending) {
    extraLims.push('Most prior modules returned pending_adapter — Situation Room record is for coordination; open full workspaces for live scans.');
  }
  if (!evidenceHash) {
    extraLims.push('Evidence hash was not present on the room response — route may still persist; check Situation Room storage.');
  }

  return {
    moduleKey: 'situationRoom',
    status: moduleStatus,
    runMode,
    headline,
    limitations: [...baseLim, ...extraLims],
    providerLanes: [
      {
        id: 'situation-project',
        label: 'POST /api/situation/project',
        state: 'ok',
        detail: bodyPreview(`roomId=${roomId} · projectId=${returnedProjectId} · status=${roomStatus || '—'}`, 260),
      },
      {
        id: 'evidence-hash',
        label: 'Evidence packet hash readiness',
        state: hashLaneState,
        detail: evidenceHash ? `evidenceHash attached (${bodyPreview(evidenceHash, 48)})` : 'No evidenceHash in response payload yet.',
      },
      {
        id: 'coordination',
        label: 'Coordination room status',
        state: coordLaneState,
        detail: bodyPreview(`room.status=${roomStatus || 'unknown'} — use Situation Room UI for messages and media.`, 220),
      },
    ],
    evidenceRefs,
    openWorkspaceView: VIEW,
  };
}
