import type { DmrvReportEventType } from './dmrvReportEvidenceTypes';
import type { DmrvReportSyncMeta } from './dmrvReportTypes';

/** Instant UI refresh — report JSON rebuilt in localStorage. */
export const DMRV_REPORT_UPDATED_EVENT = 'dpal-dmrv-report-updated';

/** Workflow source data changed (project config, input save, etc.). */
export const DMRV_REPORT_DIRTY_EVENT = 'dpal-dmrv-report-dirty';

/** Typed evidence-engine event (satellite review, biomass, threat, mission, anchor). */
export const DMRV_REPORT_EVIDENCE_EVENT = 'dpal-dmrv-report-evidence';

export function emitDmrvReportUpdated(projectId: string): void {
  if (typeof window === 'undefined' || !projectId.trim()) return;
  window.dispatchEvent(
    new CustomEvent(DMRV_REPORT_UPDATED_EVENT, { detail: { projectId: projectId.trim() } }),
  );
}

export function emitDmrvReportDirty(
  projectId: string,
  meta?: Partial<DmrvReportSyncMeta>,
): void {
  if (typeof window === 'undefined' || !projectId.trim()) return;
  const pid = projectId.trim();
  emitDmrvReportUpdated(pid);
  window.dispatchEvent(new CustomEvent(DMRV_REPORT_DIRTY_EVENT, { detail: { projectId: pid, meta } }));
  if (meta) {
    void import('./dmrvReportApi').then(({ scheduleDebouncedReportPersist }) =>
      scheduleDebouncedReportPersist(pid, meta),
    );
  }
}

export function dispatchDmrvReportEvent(
  projectId: string,
  eventType: DmrvReportEventType,
  payload?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined' || !projectId.trim()) return;
  emitDmrvReportUpdated(projectId);
  window.dispatchEvent(
    new CustomEvent(DMRV_REPORT_EVIDENCE_EVENT, {
      detail: { projectId: projectId.trim(), eventType, payload },
    }),
  );
}
