import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { getDmrvProjectContext } from '../services/dmrvProjectContextService';
import {
  anchorReportVersion,
  exportDmrvReportJson,
  getDmrvReport,
  rebuildAndPersistDmrvReport,
  saveReportSnapshot,
  subscribeDmrvReport,
} from './dmrvReportStore';
import type { DmrvReport, DmrvReportSection, DmrvReportSyncMeta } from './dmrvReportTypes';
import { summarizeReportForVerifier } from './dmrvReportBuilder';

function useReportSnapshot(projectId: string): DmrvReport | null {
  return useSyncExternalStore(
    (onStoreChange) => subscribeDmrvReport(projectId, onStoreChange),
    () => {
      if (!projectId.trim()) return null;
      return getDmrvReport(projectId);
    },
    () => null,
  );
}

export function useDmrvProjectContext(projectId: string | undefined) {
  return useMemo(() => {
    if (!projectId?.trim()) return null;
    return getDmrvProjectContext(projectId);
  }, [projectId]);
}

export function useDmrvReport(projectId: string | undefined) {
  const pid = projectId?.trim() ?? '';
  const report = useReportSnapshot(pid);

  const refresh = useCallback(
    (meta?: Partial<DmrvReportSyncMeta>) => {
      if (!pid) return null;
      return rebuildAndPersistDmrvReport(pid, meta);
    },
    [pid],
  );

  const snapshot = useCallback(
    (label: string, workflowStep: string) => {
      if (!pid) return null;
      return saveReportSnapshot(pid, label, workflowStep);
    },
    [pid],
  );

  const anchorVersion = useCallback(
    async (
      versionId: string,
      opts?: { evidencePacketId?: string; evidenceBundleHash?: string },
    ) => {
      if (!pid) return null;
      return anchorReportVersion(pid, versionId, { ...opts, actor: 'user' });
    },
    [pid],
  );

  const copyVerifierSummary = useCallback(() => {
    if (!report) return '';
    const text = summarizeReportForVerifier(report);
    void navigator.clipboard?.writeText(text);
    return text;
  }, [report]);

  const exportJson = useCallback(() => {
    if (!pid) return '';
    return exportDmrvReportJson(pid);
  }, [pid]);

  return {
    report: pid ? report : null,
    refresh,
    snapshot,
    anchorVersion,
    copyVerifierSummary,
    exportJson,
    missingSections: report?.sections.filter((s) => s.status === 'missing') ?? [],
    completedSections: report?.sections.filter((s) => s.status === 'complete') ?? [],
    needsReviewSections: report?.sections.filter((s) => s.status === 'needs_review') ?? [],
    partialSections: report?.sections.filter((s) => s.status === 'partial') ?? [],
  };
}

export function useUpdateDmrvReportSection(projectId: string | undefined) {
  const { refresh } = useDmrvReport(projectId);

  return useCallback(
    (
      section: DmrvReportSection | { id: string; title?: string },
      meta: Omit<DmrvReportSyncMeta, 'workflowStep'> & { workflowStep?: string },
    ) => {
      if (!projectId?.trim()) return null;
      return refresh({
        workflowStep: meta.workflowStep ?? section.id,
        changeSummary: meta.changeSummary ?? `Updated section: ${section.title ?? section.id}`,
        actor: meta.actor ?? 'user',
        fieldChanged: meta.fieldChanged ?? section.id,
        previousSummary: meta.previousSummary,
        sourceEvidenceId: meta.sourceEvidenceId,
        hash: meta.hash,
      });
    },
    [projectId, refresh],
  );
}
