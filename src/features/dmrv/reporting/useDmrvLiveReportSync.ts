import { useEffect, useRef } from 'react';
import type { DmrvProjectContext } from '../services/dmrvProjectContextTypes';
import type { DmrvInputConfig } from '../services/dmrvInputConfigTypes';
import { scheduleDebouncedReportPersist } from './dmrvReportApi';
import { rebuildDmrvReportSilent, type DmrvReportBuildOverrides } from './dmrvReportStore';
import type { DmrvReportSyncMeta } from './dmrvReportTypes';

const LIVE_DEBOUNCE_MS = 1200;

export type DmrvLiveReportSyncOptions = {
  projectContext?: DmrvProjectContext | null;
  draftInputConfigs?: DmrvInputConfig[];
  /** When set, replaces the matching input in the project's saved configs for live preview. */
  activeInputConfig?: DmrvInputConfig | null;
  draftSourceSelections?: Partial<Record<'satellite' | 'lidar', string[]>>;
  enabled?: boolean;
};

/**
 * Keeps the living report object in sync while the user edits a workflow step.
 * - Instant local rebuild (no audit event per keystroke)
 * - Debounced audit + optional remote persist (800–1500ms)
 */
export function useDmrvLiveReportSync(
  projectId: string | undefined,
  workflowStep: string,
  options?: DmrvLiveReportSyncOptions,
): void {
  const enabled = options?.enabled !== false;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAuditRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !projectId?.trim()) return undefined;

    const overrides: DmrvReportBuildOverrides = {};
    if (options?.projectContext) overrides.projectContext = options.projectContext;
    if (options?.draftInputConfigs) overrides.inputConfigs = options.draftInputConfigs;
    else if (options?.activeInputConfig) {
      overrides.activeInputConfig = options.activeInputConfig;
    }
    if (options?.draftSourceSelections) {
      overrides.draftSourceSelections = options.draftSourceSelections;
    }

    rebuildDmrvReportSilent(projectId, overrides);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const auditKey = `${workflowStep}:${JSON.stringify(overrides).length}`;
      if (auditKey === lastAuditRef.current) return;
      lastAuditRef.current = auditKey;
      const meta: Partial<DmrvReportSyncMeta> = {
        workflowStep,
        changeSummary: `Live update — ${workflowStep.replace(/-/g, ' ')}`,
        actor: 'user',
        fieldChanged: workflowStep,
      };
      scheduleDebouncedReportPersist(projectId, meta);
    }, LIVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    enabled,
    projectId,
    workflowStep,
    options?.projectContext,
    options?.draftInputConfigs,
    options?.activeInputConfig,
    options?.draftSourceSelections,
  ]);
}
