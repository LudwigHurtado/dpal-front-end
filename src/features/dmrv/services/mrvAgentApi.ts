import { API_ROUTES, apiUrl } from '../../../../constants';
import type { DmrvProjectContext } from './dmrvProjectContextTypes';

export type MrvAgentScheduleDto = {
  id: string;
  projectId: string;
  name: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  missionType: string;
  lastRunAt: string | null;
  nextRunHint: string | null;
};

export type MrvAgentFindingDto = {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: string;
  title: string;
  message: string;
  action?: string | null;
  source: string;
  createdAt: string;
};

export type MrvAgentRunDto = {
  id: string;
  projectId: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  missionType: string;
  startedAt: string;
  finishedAt: string | null;
  summary?: Record<string, unknown> | null;
  agentFindings?: MrvAgentFindingDto[];
};

export type MrvNotificationDto = {
  id: string;
  projectId: string;
  title: string;
  message: string;
  severity: string;
  read: boolean;
  createdAt: string;
};

export type MrvApiFailureKind = 'not_found' | 'server_error' | 'network';

export type MrvApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: MrvApiFailureKind };

function projectBase(projectId: string): string {
  return `${API_ROUTES.MRV_PROJECTS}/${encodeURIComponent(projectId)}`;
}

async function fetchMrv<T>(url: string, init?: RequestInit): Promise<MrvApiResult<T>> {
  try {
    const res = await fetch(apiUrl(url), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (res.status === 404) return { ok: false, kind: 'not_found' };
    if (!res.ok) return { ok: false, kind: 'server_error' };
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, kind: 'network' };
  }
}

export async function syncMrvProjectConfigToServer(
  projectId: string,
  config: DmrvProjectContext,
): Promise<boolean> {
  const result = await fetchMrv<{ ok: boolean }>(`${projectBase(projectId)}/agent/project-config`, {
    method: 'PUT',
    body: JSON.stringify({ configJson: config }),
  });
  return result.ok && Boolean(result.data.ok);
}

export async function fetchMrvAgentSchedule(
  projectId: string,
): Promise<MrvApiResult<MrvAgentScheduleDto>> {
  const result = await fetchMrv<{ ok: boolean; schedule: MrvAgentScheduleDto }>(
    `${projectBase(projectId)}/agent/schedule`,
  );
  if (!result.ok) return result;
  if (!result.data.schedule) return { ok: false, kind: 'server_error' };
  return { ok: true, data: result.data.schedule };
}

export async function runMrvAgentNow(
  projectId: string,
  config?: DmrvProjectContext,
): Promise<
  | {
      runId: string;
      status: string;
      summary: Record<string, unknown>;
      findings: Array<{
        severity: string;
        category: string;
        title: string;
        message: string;
        source?: string;
      }>;
    }
  | { error: MrvApiFailureKind }
> {
  const result = await fetchMrv<{
    ok: boolean;
    runId: string;
    status: string;
    summary: Record<string, unknown>;
    findings: Array<{ severity: string; category: string; title: string; message: string; source?: string }>;
  }>(`${projectBase(projectId)}/agent/run-now`, {
    method: 'POST',
    body: JSON.stringify(config ? { configJson: config } : {}),
  });
  if (!result.ok) return { error: result.kind };
  if (!result.data.ok) return { error: 'server_error' };
  return {
    runId: result.data.runId,
    status: result.data.status,
    summary: result.data.summary,
    findings: result.data.findings ?? [],
  };
}

export async function fetchMrvAgentLatestReport(projectId: string): Promise<
  MrvApiResult<{
    readinessScore: number | null;
    lastRun: MrvAgentRunDto | null;
  }>
> {
  const result = await fetchMrv<{
    ok: boolean;
    report: { readinessScore: number } | null;
    lastRun: MrvAgentRunDto | null;
  }>(`${projectBase(projectId)}/agent/latest-report`);
  if (!result.ok) return result;
  if (!result.data.ok) return { ok: false, kind: 'server_error' };
  return {
    ok: true,
    data: {
      readinessScore: result.data.report?.readinessScore ?? null,
      lastRun: result.data.lastRun,
    },
  };
}

export async function fetchMrvAgentRuns(
  projectId: string,
): Promise<MrvApiResult<MrvAgentRunDto[]>> {
  const result = await fetchMrv<{ ok: boolean; runs: MrvAgentRunDto[] }>(
    `${projectBase(projectId)}/agent/runs`,
  );
  if (!result.ok) return result;
  if (!result.data.ok) return { ok: false, kind: 'server_error' };
  return { ok: true, data: result.data.runs ?? [] };
}

export async function fetchMrvNotifications(
  projectId: string,
): Promise<MrvApiResult<MrvNotificationDto[]>> {
  const result = await fetchMrv<{ ok: boolean; notifications: MrvNotificationDto[] }>(
    `${projectBase(projectId)}/notifications`,
  );
  if (!result.ok) return result;
  if (!result.data.ok) return { ok: false, kind: 'server_error' };
  return { ok: true, data: result.data.notifications ?? [] };
}

export function mrvApiFailureMessage(kind: MrvApiFailureKind, endpoint?: string): string {
  switch (kind) {
    case 'not_found':
      return 'Agent API route not found. Check backend route mount.';
    case 'server_error':
      return 'Agent backend error. Check Railway logs and Prisma tables.';
    case 'network':
      return 'Cannot reach backend. Check VITE_API_BASE and CORS.';
    default:
      return endpoint ? `Request failed: ${endpoint}` : 'Request failed';
  }
}
