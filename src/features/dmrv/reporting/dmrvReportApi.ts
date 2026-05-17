import { API_ROUTES, apiUrl } from '../../../../constants';
import type { DmrvReport, DmrvReportSection, DmrvReportSyncMeta } from './dmrvReportTypes';
import { getDmrvReport, rebuildAndPersistDmrvReport } from './dmrvReportStore';

const DEBOUNCE_MS = 1200;

function reportApiPath(reportId: string, suffix = ''): string {
  const base = `${API_ROUTES.DMRV_REPORTS}/${encodeURIComponent(reportId)}`;
  return apiUrl(suffix ? `${base}${suffix}` : base);
}

type PendingSave = {
  timer: ReturnType<typeof setTimeout>;
  meta?: Partial<DmrvReportSyncMeta>;
};

const pendingSaves = new Map<string, PendingSave>();

export type DmrvReportApiResult<T> =
  | { ok: true; data: T; persisted: 'local' | 'remote' }
  | { ok: false; message: string; persisted: 'local' };

async function tryRemote<T>(
  path: string,
  init?: RequestInit,
): Promise<DmrvReportApiResult<T> | null> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, message: text || `HTTP ${res.status}`, persisted: 'local' };
    }
    const data = (await res.json()) as T;
    return { ok: true, data, persisted: 'remote' };
  } catch {
    return null;
  }
}

export async function getReport(reportId: string): Promise<DmrvReport | null> {
  const remote = await tryRemote<DmrvReport>(reportApiPath(reportId));
  if (remote?.ok) return remote.data;
  const byProject = getDmrvReport(reportId);
  if (byProject) return byProject;
  const all = Object.values(
    JSON.parse(localStorage.getItem('dpal_dmrv_live_reports_v1') ?? '{}') as Record<string, DmrvReport>,
  );
  return all.find((r) => r.reportId === reportId) ?? null;
}

export function createReport(projectId: string, categoryId: string): DmrvReport {
  return rebuildAndPersistDmrvReport(projectId, {
    workflowStep: 'project-config',
    changeSummary: 'Living dMRV report created',
    actor: 'system',
  });
}

export function updateReportSection(
  reportId: string,
  sectionId: string,
  _payload: Partial<DmrvReportSection>,
  meta?: Partial<DmrvReportSyncMeta>,
): DmrvReport {
  const existing = getDmrvReport(reportId) ?? getReportByReportId(reportId);
  const projectId = existing?.projectId ?? reportId;
  return rebuildAndPersistDmrvReport(projectId, {
    workflowStep: meta?.workflowStep ?? sectionId,
    changeSummary: meta?.changeSummary ?? `Updated section ${sectionId}`,
    actor: meta?.actor ?? 'user',
    fieldChanged: meta?.fieldChanged ?? sectionId,
  });
}

function getReportByReportId(reportId: string): DmrvReport | null {
  try {
    const raw = localStorage.getItem('dpal_dmrv_live_reports_v1');
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, DmrvReport>;
    return Object.values(map).find((r) => r.reportId === reportId) ?? null;
  } catch {
    return null;
  }
}

export function scheduleDebouncedReportPersist(
  projectId: string,
  meta?: Partial<DmrvReportSyncMeta>,
): void {
  const existing = pendingSaves.get(projectId);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pendingSaves.delete(projectId);
    const report = rebuildAndPersistDmrvReport(projectId, {
      workflowStep: meta?.workflowStep ?? 'auto-save',
      changeSummary: meta?.changeSummary ?? 'Debounced report sync',
      actor: meta?.actor ?? 'system',
      fieldChanged: meta?.fieldChanged,
    });
    void persistReportRemote(report);
  }, DEBOUNCE_MS);
  pendingSaves.set(projectId, { timer, meta });
}

async function persistReportRemote(report: DmrvReport): Promise<void> {
  await tryRemote(reportApiPath(report.reportId), {
    method: 'PUT',
    body: JSON.stringify(report),
  });
}

export async function saveReportSnapshot(
  projectId: string,
  label: string,
  workflowStep: string,
): Promise<DmrvReport> {
  const { saveReportSnapshot: storeSave } = await import('./dmrvReportStore');
  return storeSave(projectId, label, workflowStep);
}

export function exportReportJson(reportId: string): string {
  const report = getDmrvReport(reportId) ?? getReportByReportId(reportId);
  if (!report) return '{}';
  return JSON.stringify(report, null, 2);
}

export async function anchorReportVersion(
  projectId: string,
  versionId: string,
  opts?: { evidencePacketId?: string; evidenceBundleHash?: string; actor?: DmrvReportSyncMeta['actor'] },
): Promise<DmrvReportApiResult<DmrvReport>> {
  const { anchorReportVersion: storeAnchor } = await import('./dmrvReportStore');
  const report = await storeAnchor(projectId, versionId, opts);
  const remote = await tryRemote<{ anchorId: string }>(
    reportApiPath(report.reportId, '/anchor'),
    {
      method: 'POST',
      body: JSON.stringify({
        versionId,
        reportJsonHash: report.anchorState.currentReportHash,
        evidencePacketId: opts?.evidencePacketId,
        evidenceBundleHash: opts?.evidenceBundleHash,
      }),
    },
  );
  if (remote?.ok) return { ok: true, data: report, persisted: 'remote' };
  return { ok: true, data: report, persisted: 'local' };
}
