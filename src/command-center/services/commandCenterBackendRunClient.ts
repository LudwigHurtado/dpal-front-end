/**
 * Command Center — future backend-heavy orchestration (scaffold only).
 *
 * Intended production split:
 * - **Backend** (`POST /api/command-center/runs`, `GET …/runs/:runId`, `POST …/cancel`):
 *   provider HTTP calls, caching, rate limits, timeouts, retries, normalization, audit logs, and optional SSE/WebSocket progress.
 * - **Frontend** (this SPA): mission context, map, autopilot UX, progress display, merged result cards, evidence preview text,
 *   and deep links to full module workspaces (unchanged UIs).
 *
 * Until the filing API implements these routes, **all execution stays in the browser** via
 * `runCommandCenterOrchestration`. Call `startCommandCenterRun` optionally to detect a remote run id without breaking local flows.
 */

import { apiUrl } from '../../../constants';

const RUNS_PATH = '/api/command-center/runs';

export type CommandCenterRunStartInput = {
  modules: string[];
  context: Record<string, unknown>;
  runMode: string;
};

export type StartCommandCenterRunResult =
  | { backend: 'accepted'; runId: string }
  | { backend: 'unavailable'; reason: string };

/**
 * Registers a server-side run when the API exists. On 404/5xx/network, returns `unavailable` — callers should keep using
 * local `runCommandCenterOrchestration` for module steps.
 */
export async function startCommandCenterRun(input: CommandCenterRunStartInput): Promise<StartCommandCenterRunResult> {
  try {
    const res = await fetch(apiUrl(RUNS_PATH), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      return { backend: 'unavailable', reason: `HTTP ${res.status}` };
    }
    const body = (await res.json().catch(() => null)) as { runId?: string } | null;
    if (body?.runId && typeof body.runId === 'string') {
      return { backend: 'accepted', runId: body.runId };
    }
    return { backend: 'unavailable', reason: 'Response missing runId' };
  } catch (e) {
    return { backend: 'unavailable', reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Poll when backend streaming is wired; returns null if route missing or error. */
export async function getCommandCenterRunStatus(runId: string): Promise<unknown | null> {
  try {
    const res = await fetch(apiUrl(`${RUNS_PATH}/${encodeURIComponent(runId)}`), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

export async function cancelCommandCenterRun(runId: string): Promise<boolean> {
  try {
    const res = await fetch(apiUrl(`${RUNS_PATH}/${encodeURIComponent(runId)}/cancel`), { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
