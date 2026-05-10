export type ReviewerCaseSnapshot = {
  currentPlan: {
    caseId: string;
    goal: string;
    location?: string;
    dateRange?: { startDate?: string; endDate?: string };
    evidenceRefs?: string[];
    claimLabels?: Record<string, boolean>;
    limitations?: string[];
    nextRecommendedAction?: string;
  } | null;
  currentCaseWorkspace: unknown | null;
  evidenceTimeline: unknown[];
  executionTraces: unknown[];
  mappedExecutionPlan: { mappedWorkflowIds?: string[] } | null;
  planExecutionResult: { allArtifacts?: unknown[] } | null;
  approvalStatus: Record<string, boolean>;
  finalActionsBlocked: boolean;
  humanApprovalRequired: boolean;
  pendingAdapters?: string[];
  mappedWorkflows?: string[];
  evidenceRefs?: string[];
  claimLabels?: Record<string, boolean>;
  limitations?: string[];
  nextRecommendedAction?: string;
  analysisSummaries?: Record<string, unknown>;
  evidenceAttachments?: unknown[];
  subAgentOutputs?: unknown[];
  workflowPreviewArtifacts?: unknown[];
};

export type ReviewerSubmissionResponse = {
  ok: boolean;
  caseId: string;
  reportId: string;
  status: string;
  reviewUrl: string;
  message: string;
};

export type ReviewerStatusResponse = {
  caseId: string;
  reportId: string;
  status: string;
  humanVerified: boolean;
  reviewerNotes: Array<{ note?: string; at?: string; reviewerId?: string }>;
  reviewedAt: string | null;
  reviewerId: string | null;
  decision: string | null;
  updatedAt?: string | null;
};

function reviewerApiBase(): string {
  return (import.meta.env.VITE_REVIEWER_NODE_API_BASE || 'http://localhost:8787/api').replace(/\/$/, '');
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function getReviewerNodeHealth(): Promise<{
  ok: boolean;
  service?: string;
  upstreamConfigured?: boolean;
}> {
  const url = `${reviewerApiBase()}/reviewer/v1/health`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(`Reviewer node health failed (${res.status})`);
  return {
    ok: Boolean(data.ok),
    service: typeof data.service === 'string' ? data.service : undefined,
    upstreamConfigured:
      typeof data.upstreamConfigured === 'boolean' ? data.upstreamConfigured : undefined,
  };
}

export async function submitCaseForReview(caseSnapshot: ReviewerCaseSnapshot): Promise<ReviewerSubmissionResponse> {
  const plan = caseSnapshot.currentPlan;
  if (!plan?.caseId) throw new Error('Missing caseId in Super Agent snapshot.');
  if (!plan.goal?.trim()) throw new Error('Missing goal in Super Agent snapshot.');

  const payload = {
    caseId: plan.caseId,
    source: 'field_os_super_agent',
    goal: plan.goal,
    location: plan.location || '',
    dateRange: plan.dateRange || {},
    evidenceRefs: toArray(caseSnapshot.evidenceRefs ?? plan.evidenceRefs),
    claimLabels: caseSnapshot.claimLabels || plan.claimLabels || {},
    limitations: toArray(caseSnapshot.limitations ?? plan.limitations),
    caseWorkspace: caseSnapshot.currentCaseWorkspace || {},
    evidenceTimeline: toArray(caseSnapshot.evidenceTimeline),
    executionTraces: toArray(caseSnapshot.executionTraces),
    mappedWorkflows: toArray(caseSnapshot.mappedWorkflows ?? caseSnapshot.mappedExecutionPlan?.mappedWorkflowIds),
    pendingAdapters: toArray(caseSnapshot.pendingAdapters),
    artifacts: toArray(caseSnapshot.planExecutionResult?.allArtifacts),
    workflowPreviewArtifacts: toArray(caseSnapshot.workflowPreviewArtifacts),
    subAgentOutputs: toArray(caseSnapshot.subAgentOutputs),
    analysisSummaries: caseSnapshot.analysisSummaries || {},
    evidenceAttachments: toArray(caseSnapshot.evidenceAttachments),
    approvalStatus: caseSnapshot.approvalStatus || {},
    finalActionsBlocked: Boolean(caseSnapshot.finalActionsBlocked),
    humanApprovalRequired: Boolean(caseSnapshot.humanApprovalRequired),
    nextRecommendedAction: caseSnapshot.nextRecommendedAction || plan.nextRecommendedAction || '',
  };

  const url = `${reviewerApiBase()}/reviewer/v1/verifier/cases`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error((data.error as string) || `Reviewer submission failed (${res.status})`);
  return data as unknown as ReviewerSubmissionResponse;
}

export async function getReviewStatus(caseId: string): Promise<ReviewerStatusResponse> {
  const url = `${reviewerApiBase()}/reviewer/v1/verifier/cases/${encodeURIComponent(caseId)}/status`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await parseJson(res);
  if (!res.ok) throw new Error((data.error as string) || `Reviewer status failed (${res.status})`);
  return data as unknown as ReviewerStatusResponse;
}
