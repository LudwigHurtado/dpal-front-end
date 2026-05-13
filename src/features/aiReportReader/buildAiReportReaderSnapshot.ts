export type AiReportReaderPageType =
  | 'situation_room'
  | 'transparency_ledger'
  | 'public_report'
  | 'command_center'
  | 'aquascan_report'
  | 'carb_report'
  | 'generic';

export type BuildAiReportReaderSnapshotInput = {
  pageType: AiReportReaderPageType;
  reportId?: string | null;
  roomId?: string | null;
  runId?: string | null;
  title?: string | null;
  category?: string | null;
  location?: string | null;
  dates?: { start?: string; end?: string } | null;
  description?: string | null;
  evidencePacket?: unknown;
  moduleResults?: unknown;
  providerLanes?: unknown;
  evidenceRefs?: unknown;
  limitations?: unknown;
  safetyLabels?: unknown;
  ledger?: unknown;
  currentVisibleSections?: string[];
  /** Latest Command Center orchestration / run payload (structured only). */
  commandCenterRun?: unknown;
  extra?: Record<string, unknown>;
};

/**
 * Structured context for AI Report Reader — only report/evidence fields (no tokens, no unrelated browser state).
 */
export function buildAiReportReaderSnapshot(input: BuildAiReportReaderSnapshotInput): Record<string, unknown> {
  const snap: Record<string, unknown> = {
    pageType: input.pageType,
    reportId: input.reportId ?? undefined,
    roomId: input.roomId ?? undefined,
    runId: input.runId ?? undefined,
    title: input.title ?? undefined,
    category: input.category ?? undefined,
    location: input.location ?? undefined,
    dates: input.dates ?? undefined,
    description: input.description ?? undefined,
    evidencePacket: input.evidencePacket,
    moduleResults: input.moduleResults,
    providerLanes: input.providerLanes,
    evidenceRefs: input.evidenceRefs,
    limitations: input.limitations,
    safetyLabels: input.safetyLabels,
    ledger: input.ledger,
    commandCenterRun: input.commandCenterRun,
    currentVisibleSections: input.currentVisibleSections ?? [],
  };
  if (input.extra && typeof input.extra === 'object') {
    Object.assign(snap, input.extra);
  }
  return snap;
}
