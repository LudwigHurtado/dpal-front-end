import { useEffect, useMemo, useRef } from 'react';
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

function stableSourceSelectionKey(
  draft?: Partial<Record<'satellite' | 'lidar', string[]>>,
): string {
  if (!draft) return '';
  return JSON.stringify({
    satellite: draft.satellite ?? [],
    lidar: draft.lidar ?? [],
  });
}

function stableInputConfigKey(config: DmrvInputConfig | null | undefined): string {
  if (!config) return '';
  return JSON.stringify(config);
}

function stableProjectContextKey(ctx: DmrvProjectContext | null | undefined): string {
  if (!ctx) return '';
  return JSON.stringify(ctx);
}

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
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const satelliteIdsKey = options?.draftSourceSelections?.satellite?.join('\0') ?? '';
  const lidarIdsKey = options?.draftSourceSelections?.lidar?.join('\0') ?? '';
  const draftKey = useMemo(
    () => stableSourceSelectionKey(options?.draftSourceSelections),
    [satelliteIdsKey, lidarIdsKey],
  );
  const activeConfigKey = useMemo(
    () => stableInputConfigKey(options?.activeInputConfig),
    [options?.activeInputConfig],
  );
  const projectContextKey = useMemo(
    () => stableProjectContextKey(options?.projectContext),
    [options?.projectContext],
  );
  const draftInputConfigsKey = useMemo(
    () => (options?.draftInputConfigs ? JSON.stringify(options.draftInputConfigs) : ''),
    [options?.draftInputConfigs],
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAuditRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !projectId?.trim()) return undefined;

    const liveOptions = optionsRef.current;
    const overrides: DmrvReportBuildOverrides = {};
    if (liveOptions?.projectContext) overrides.projectContext = liveOptions.projectContext;
    if (liveOptions?.draftInputConfigs) overrides.inputConfigs = liveOptions.draftInputConfigs;
    else if (liveOptions?.activeInputConfig) {
      overrides.activeInputConfig = liveOptions.activeInputConfig;
    }
    if (liveOptions?.draftSourceSelections) {
      overrides.draftSourceSelections = liveOptions.draftSourceSelections;
    }

    rebuildDmrvReportSilent(projectId, overrides);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const auditKey = `${workflowStep}:${projectContextKey}:${activeConfigKey}:${draftKey}`;
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
    projectContextKey,
    activeConfigKey,
    draftInputConfigsKey,
    draftKey,
  ]);
}
