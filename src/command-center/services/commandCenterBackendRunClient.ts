/**
 * Command Center — backend run engine client (`/api/command-center/runs`).
 *
 * When the local Prisma backend exposes these routes, the SPA can offload provider calls, timeouts, and normalization.
 * On 404/5xx/network, callers keep using browser-side `runCommandCenterOrchestration` without breaking flows.
 */

import { apiUrl } from '../../../constants';
import type {
  CommandCenterModuleKey,
  CommandCenterModuleRunResult,
  CommandCenterOrchestrationResult,
  CommandCenterRunContext,
  CommandCenterRunMode,
} from '../types';

const RUNS_PATH = '/api/command-center/runs';

export type CommandCenterRunStartInput = {
  modules: string[];
  context: Record<string, unknown>;
  runMode: string;
};

export type StartCommandCenterRunResult =
  | { backend: 'accepted'; runId: string; status?: string }
  | { backend: 'unavailable'; reason: string };

export type CommandCenterBackendSafetyLabels = {
  pending_verification: true;
  human_verified: false;
  blockchain_anchored: false;
};

/** GET `/api/command-center/runs/:runId` success body (matches backend `toPublicJson`). */
export type CommandCenterBackendRun = {
  ok: true;
  runId: string;
  status: string;
  runMode: CommandCenterRunMode;
  modules: CommandCenterModuleKey[];
  context: CommandCenterRunContext;
  currentStep: string;
  results: CommandCenterModuleRunResult[];
  warnings: string[];
  safetyLabels: CommandCenterBackendSafetyLabels;
  createdAtIso: string;
  updatedAtIso: string;
};

export type GetCommandCenterRunStatusResult =
  | { ok: true; payload: CommandCenterBackendRun }
  | { ok: false; httpStatus: number; error?: string }
  | { ok: false; network: true; message: string };

const TERMINAL_RUN_STATUSES = new Set([
  'success',
  'partial',
  'error',
  'canceled',
  'rate_limited',
  'unavailable',
  'pending_adapter',
]);

function isBackendRunPayload(v: unknown): v is CommandCenterBackendRun {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    o.ok === true &&
    typeof o.runId === 'string' &&
    typeof o.status === 'string' &&
    typeof o.updatedAtIso === 'string' &&
    Array.isArray(o.modules) &&
    Array.isArray(o.results) &&
    Array.isArray(o.warnings)
  );
}

/**
 * Registers a server-side run when the API exists. On 404/5xx/network or invalid JSON contract, returns `unavailable` —
 * callers should keep using local `runCommandCenterOrchestration` for module steps.
 */
export async function startCommandCenterRun(input: CommandCenterRunStartInput): Promise<StartCommandCenterRunResult> {
  try {
    const res = await fetch(apiUrl(RUNS_PATH), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
    });
    const raw = await res.text();
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      return { backend: 'unavailable', reason: `HTTP ${res.status} — invalid JSON` };
    }
    if (!res.ok) {
      const err =
        body && typeof body === 'object' && body !== null && 'error' in body
          ? String((body as Record<string, unknown>).error)
          : `HTTP ${res.status}`;
      return { backend: 'unavailable', reason: err };
    }
    const o = body as { ok?: unknown; runId?: unknown; status?: unknown } | null;
    if (o?.ok === true && typeof o.runId === 'string') {
      return { backend: 'accepted', runId: o.runId, status: typeof o.status === 'string' ? o.status : undefined };
    }
    return { backend: 'unavailable', reason: 'Response missing ok/runId' };
  } catch (e) {
    return { backend: 'unavailable', reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function getCommandCenterRunStatus(runId: string): Promise<GetCommandCenterRunStatusResult> {
  try {
    const res = await fetch(apiUrl(`${RUNS_PATH}/${encodeURIComponent(runId)}`), {
      headers: { Accept: 'application/json' },
    });
    const raw = await res.text();
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      return { ok: false, httpStatus: res.status, error: 'invalid_json' };
    }
    if (res.status === 404) {
      const err =
        body && typeof body === 'object' && body !== null && 'error' in body
          ? String((body as Record<string, unknown>).error)
          : 'Run not found';
      return { ok: false, httpStatus: 404, error: err };
    }
    if (!res.ok) {
      const err =
        body && typeof body === 'object' && body !== null && 'error' in body
          ? String((body as Record<string, unknown>).error)
          : `http_${res.status}`;
      return { ok: false, httpStatus: res.status, error: err };
    }
    if (isBackendRunPayload(body)) {
      return { ok: true, payload: body };
    }
    return { ok: false, httpStatus: res.status, error: 'unexpected_shape' };
  } catch (e) {
    return { ok: false, network: true, message: e instanceof Error ? e.message : String(e) };
  }
}

export function mapBackendRunToOrchestration(payload: CommandCenterBackendRun): CommandCenterOrchestrationResult {
  return {
    context: payload.context,
    runMode: payload.runMode,
    modules: payload.modules,
    settledAtIso: payload.updatedAtIso,
    results: payload.results,
    orchestrationWarnings: [...payload.warnings],
  };
}

export type PollCommandCenterRunOutcome =
  | { backend: 'ok'; payload: CommandCenterBackendRun }
  | { backend: 'stopped' }
  | { backend: 'lost'; reason: string };

/**
 * Polls until the run reaches a terminal status, the caller reports cancellation, or optional max wait elapses.
 * Uses 1.5–2.5s jitter between polls; backs off further on HTTP 429 from GET.
 */
export async function pollCommandCenterRunUntilTerminal(
  runId: string,
  opts: {
    cancelled: () => boolean;
    maxWaitMs?: number;
  },
): Promise<PollCommandCenterRunOutcome> {
  const started = Date.now();
  const maxWait = opts.maxWaitMs ?? 6 * 60_000;
  let delayMs = 1500 + Math.random() * 1000;
  const maxDelayMs = 12_000;

  while (Date.now() - started < maxWait) {
    if (opts.cancelled()) return { backend: 'stopped' };

    const r = await getCommandCenterRunStatus(runId);
    if (r.ok === true) {
      if (TERMINAL_RUN_STATUSES.has(r.payload.status)) {
        return { backend: 'ok', payload: r.payload };
      }
      delayMs = 1500 + Math.random() * 1000;
    } else {
      if ('network' in r && r.network) {
        return { backend: 'lost', reason: r.message };
      }
      if ('httpStatus' in r && r.httpStatus === 404) {
        return { backend: 'lost', reason: r.error ?? 'Run not found' };
      }
      if ('httpStatus' in r && r.httpStatus === 429) {
        delayMs = Math.min(Math.floor(delayMs * 1.85) + 500, maxDelayMs);
      } else {
        delayMs = Math.min(delayMs + 800, maxDelayMs);
      }
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, delayMs);
    });
  }

  return { backend: 'lost', reason: 'poll_max_wait' };
}

export async function cancelCommandCenterRun(runId: string | null): Promise<boolean> {
  if (!runId) return false;
  try {
    const res = await fetch(apiUrl(`${RUNS_PATH}/${encodeURIComponent(runId)}/cancel`), {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}
