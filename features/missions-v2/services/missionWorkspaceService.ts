import { getApiBase } from '../../../constants';
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
    /* ignore, local already saved */
  }

  return 'local';
}
