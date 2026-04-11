import { apiFetch } from '../../../auth/authApi';
import { API_ROUTES, getApiBase } from '../../../constants';
import type { MissionAssignmentV2Model } from '../types';

const LOCAL_KEY_PREFIX = 'dpal-mission-v2-workspace:';

type PersistSource = 'server' | 'local' | 'none';

export interface MissionWorkspaceLoadResult {
  data: MissionAssignmentV2Model | null;
  source: PersistSource;
}

function localKey(reportId: string): string {
  return `${LOCAL_KEY_PREFIX}${reportId}`;
}

function readLocal(reportId: string): MissionAssignmentV2Model | null {
  try {
    const raw = localStorage.getItem(localKey(reportId));
    if (!raw) return null;
    return JSON.parse(raw) as MissionAssignmentV2Model;
  } catch {
    return null;
  }
}

function writeLocal(reportId: string, model: MissionAssignmentV2Model): void {
  try {
    localStorage.setItem(localKey(reportId), JSON.stringify(model));
  } catch {
    /* ignore local storage errors */
  }
}

/** Unwrap common API envelopes so we merge into the same shape POST /api/reports expects. */
function unwrapReportPayload(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  const o = data as Record<string, unknown>;
  if (o.report && typeof o.report === 'object') return o.report as Record<string, unknown>;
  if (o.data && typeof o.data === 'object') return o.data as Record<string, unknown>;
  return o;
}

/**
 * Persist mission workspace on the ledger by upserting the report document with `missionWorkspaceV2`,
 * matching what `loadMissionWorkspaceV2` reads from GET /api/reports/:id.
 * Used when the dedicated `/mission-workspace-v2` route is not deployed (typical on production Railway).
 */
async function persistMissionWorkspaceViaReportUpsert(
  reportId: string,
  model: MissionAssignmentV2Model,
): Promise<boolean> {
  const apiBase = getApiBase().replace(/\/$/, '');
  const encoded = encodeURIComponent(reportId);

  let baseDoc: Record<string, unknown> = {};
  try {
    const res = await fetch(`${apiBase}/api/reports/${encoded}`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      baseDoc = unwrapReportPayload(data);
    }
  } catch {
    /* empty base — POST may still create/merge if the API allows */
  }

  const body: Record<string, unknown> = {
    ...baseDoc,
    id: reportId,
    reportId,
    missionWorkspaceV2: model,
  };
  const serialized = JSON.stringify(body);

  async function postPlain(path: string): Promise<Response | null> {
    try {
      return await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
      });
    } catch {
      return null;
    }
  }

  try {
    const authed = await apiFetch(API_ROUTES.REPORTS_UPSERT, { method: 'POST', body: serialized }, true);
    if (authed.ok) return true;
  } catch {
    /* continue */
  }

  const primary = await postPlain(API_ROUTES.REPORTS_UPSERT);
  if (primary?.ok) return true;

  const useAnchorFallback =
    primary == null ||
    primary.status === 404 ||
    primary.status === 405 ||
    primary.status >= 500;

  if (useAnchorFallback) {
    try {
      const a1 = await apiFetch('/api/reports/anchor', { method: 'POST', body: serialized }, true);
      if (a1.ok) return true;
    } catch {
      /* continue */
    }
    const anchor = await postPlain('/api/reports/anchor');
    if (anchor?.ok) return true;
  }

  return false;
}

export async function loadMissionWorkspaceV2(reportId: string): Promise<MissionWorkspaceLoadResult> {
  if (!reportId) return { data: null, source: 'none' };
  const apiBase = getApiBase().replace(/\/$/, '');
  const encoded = encodeURIComponent(reportId);

  // Preferred dedicated endpoint (if backend supports it).
  try {
    const res = await fetch(`${apiBase}/api/reports/${encoded}/mission-workspace-v2`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const workspace = (data as any)?.workspace ?? (data as any)?.missionWorkspaceV2 ?? null;
      if (workspace) {
        return { data: workspace as MissionAssignmentV2Model, source: 'server' };
      }
    }
  } catch {
    /* ignore and continue fallbacks */
  }

  // Fallback: read from report payload if backend stores it there.
  try {
    const res = await fetch(`${apiBase}/api/reports/${encoded}`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      const workspace = (data as any)?.missionWorkspaceV2 ?? null;
      if (workspace) {
        return { data: workspace as MissionAssignmentV2Model, source: 'server' };
      }
    }
  } catch {
    /* ignore and continue local fallback */
  }

  const local = readLocal(reportId);
  return { data: local, source: local ? 'local' : 'none' };
}

export async function saveMissionWorkspaceV2(reportId: string, model: MissionAssignmentV2Model): Promise<PersistSource> {
  if (!reportId) return 'none';
  const apiBase = getApiBase().replace(/\/$/, '');
  const encoded = encodeURIComponent(reportId);
  const payload = { reportId, workspace: model };

  // Always keep a local copy as resilience.
  writeLocal(reportId, model);

  // Preferred dedicated endpoint (if backend supports it).
  try {
    const res = await fetch(`${apiBase}/api/reports/${encoded}/mission-workspace-v2`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return 'server';
  } catch {
    /* ignore and try alternate verb */
  }

  try {
    const res = await fetch(`${apiBase}/api/reports/${encoded}/mission-workspace-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return 'server';
  } catch {
    /* ignore and try report upsert */
  }

  const upserted = await persistMissionWorkspaceViaReportUpsert(reportId, model);
  if (upserted) return 'server';

  return 'local';
}
