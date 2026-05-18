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

function projectBase(projectId: string): string {
  return `${API_ROUTES.MRV_PROJECTS}/${encodeURIComponent(projectId)}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(apiUrl(url), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function syncMrvProjectConfigToServer(
  projectId: string,
  config: DmrvProjectContext,
): Promise<boolean> {
  const data = await fetchJson<{ ok: boolean }>(`${projectBase(projectId)}/agent/project-config`, {
    method: 'PUT',
    body: JSON.stringify({ configJson: config }),
  });
  return Boolean(data?.ok);
}

export async function fetchMrvAgentSchedule(projectId: string): Promise<MrvAgentScheduleDto | null> {
  const data = await fetchJson<{ ok: boolean; schedule: MrvAgentScheduleDto }>(
    `${projectBase(projectId)}/agent/schedule`,
  );
  return data?.schedule ?? null;
}

export async function runMrvAgentNow(
  projectId: string,
  config?: DmrvProjectContext,
): Promise<{
  runId: string;
  status: string;
  summary: Record<string, unknown>;
  findings: Array<{
    severity: string;
    category: string;
    title: string;
    message: string;
    label?: string;
  }>;
} | null> {
  const data = await fetchJson<{
    ok: boolean;
    runId: string;
    status: string;
    summary: Record<string, unknown>;
    findings: Array<{ severity: string; category: string; title: string; message: string }>;
  }>(`${projectBase(projectId)}/agent/run-now`, {
    method: 'POST',
    body: JSON.stringify(config ? { configJson: config } : {}),
  });
  if (!data?.ok) return null;
  return {
    runId: data.runId,
    status: data.status,
    summary: data.summary,
    findings: data.findings ?? [],
  };
}

export async function fetchMrvAgentLatestReport(projectId: string): Promise<{
  readinessScore: number | null;
  lastRun: MrvAgentRunDto | null;
} | null> {
  const data = await fetchJson<{
    ok: boolean;
    report: { readinessScore: number } | null;
    lastRun: MrvAgentRunDto | null;
  }>(`${projectBase(projectId)}/agent/latest-report`);
  if (!data?.ok) return null;
  return {
    readinessScore: data.report?.readinessScore ?? null,
    lastRun: data.lastRun,
  };
}

export async function fetchMrvAgentRuns(projectId: string): Promise<MrvAgentRunDto[]> {
  const data = await fetchJson<{ ok: boolean; runs: MrvAgentRunDto[] }>(
    `${projectBase(projectId)}/agent/runs`,
  );
  return data?.runs ?? [];
}

export async function fetchMrvNotifications(projectId: string): Promise<MrvNotificationDto[]> {
  const data = await fetchJson<{ ok: boolean; notifications: MrvNotificationDto[] }>(
    `${projectBase(projectId)}/notifications`,
  );
  return data?.notifications ?? [];
}
