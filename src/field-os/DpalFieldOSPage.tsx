// src/field-os/DpalFieldOSPage.tsx

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY,
  FIELD_OS_SUPER_AGENT_HASH,
} from '../../utils/appRoutes';
import html2canvas from 'html2canvas';
import { getWorkflowDefinitions } from './workflowRegistry';
import { WorkflowRunner, WorkflowExecutionResult } from './workflowRunner';
import { DpalLeadAgent } from './super-agent/DpalLeadAgent';
import { SuperAgentPlan } from './super-agent/superAgentTypes';
import {
  PlanExecutionBridge,
  MappedExecutionPlan,
  ExecutionBridgeResult,
} from './super-agent/runtime/planExecutionBridge';
import { APPROVAL_GATES } from './super-agent/runtime/humanApprovalGate';
import { CaseWorkspace, CaseWorkspaceState } from './super-agent/runtime/caseWorkspace';
import { ExecutionTraceService, ExecutionTrace } from './super-agent/runtime/executionTraceService';
import { SuperAgentCompletionStatus } from './super-agent/runtime/superAgentRuntime';
import {
  getReviewStatus,
  submitCaseForReview,
  type ReviewerStatusResponse,
} from './super-agent/services/reviewerNodeClient';
import {
  getHubConnectivityLoadingRows,
  HUB_AUTO_REFRESH_MS,
  runEnvironmentalHubProbes,
  summarizePillarHubConnectivity,
  type HubConnectivityRow,
  type SuperAgentEvidencePillarKey,
} from '../services/environmentalHubConnectivity';

const runner = new WorkflowRunner();

const HUMAN_APPROVAL_GATE_IDS = [
  'final_report_publication',
  'public_qr_publication',
  'blockchain_anchoring',
  'validator_submission',
  'legal_packet_export',
  'viu_draft_issuance',
] as const;

const EVIDENCE_PACKAGE_PILLAR_LABELS = {
  water: 'Water (AquaScan)',
  earthObservation: 'Earth observation',
  pollution: 'Pollution / CARB',
  carbonViu: 'Carbon / VIU',
} as const;

const CLAIM_TRUTH_ROWS: { key: string; label: string }[] = [
  { key: 'observed', label: 'Observed' },
  { key: 'calculated', label: 'Calculated' },
  { key: 'imported', label: 'Imported' },
  { key: 'user_submitted', label: 'User-submitted' },
  { key: 'ai_inferred', label: 'AI-inferred' },
  { key: 'pending_verification', label: 'Pending verification' },
  { key: 'human_verified', label: 'Human-verified' },
  { key: 'blockchain_anchored', label: 'Blockchain-anchored' },
];

type SuperAgentWorkspaceTab = 'plan' | 'workspace' | 'execution';

type InvestigationTimes = {
  goalReceived?: Date;
  planGenerated?: Date;
  previewCompleted?: Date;
};

type EvidenceTimelineEntry = {
  id: string;
  sortIndex: number;
  at?: Date;
  title: string;
  detail: string;
  tone: 'default' | 'attention' | 'positive';
};

type UiExecutionTraceRow = {
  id: string;
  stepName: string;
  actor: string;
  mode: 'Dry Run' | 'Live' | 'Pending live service adapter';
  timestamp?: Date;
  outputSummary: string;
  status: string;
};

type SuperAgentCaseSnapshot = {
  currentPlan: SuperAgentPlan | null;
  currentCaseWorkspace: CaseWorkspaceState | null;
  evidenceTimeline: EvidenceTimelineEntry[];
  executionTraces: UiExecutionTraceRow[];
  completionStatus: SuperAgentCompletionStatus;
  approvalStatus: Record<string, boolean>;
  finalActionsBlocked: boolean;
  humanApprovalRequired: boolean;
  mappedExecutionPlan: MappedExecutionPlan | null;
  planExecutionResult: ExecutionBridgeResult | null;
  mappedWorkflows?: string[];
  pendingAdapters?: string[];
  evidenceRefs?: string[];
  claimLabels?: Record<string, boolean>;
  limitations?: string[];
  nextRecommendedAction?: string;
  analysisSummaries?: Record<string, unknown>;
  evidenceAttachments?: ReviewerEvidenceAttachment[];
  subAgentOutputs?: unknown[];
  workflowPreviewArtifacts?: unknown[];
  /** Last Environmental Hub connectivity strip snapshot (JSON-safe) for Reviewer Node. */
  environmentalHubConnectivity?: {
    probedAt: string | null;
    rows: Array<{
      id: string;
      label: string;
      status: string;
      detail: string;
      usingCachedResult: boolean;
      nextRetryAt: string | null;
      lastSuccessfulAt: string | null;
      lastError: string | null;
    }>;
  };
};

function serializeEnvironmentalHubConnectivityForSnapshot(
  rows: HubConnectivityRow[],
  probedAt: string | null,
): SuperAgentCaseSnapshot['environmentalHubConnectivity'] {
  if (!rows.length) return undefined;
  return {
    probedAt,
    rows: rows.map((r) => ({
      id: r.id,
      label: r.label,
      status: r.status,
      detail: r.detail,
      usingCachedResult: r.usingCachedResult,
      nextRetryAt: r.nextRetryAt?.toISOString() ?? null,
      lastSuccessfulAt: r.lastSuccessfulAt?.toISOString() ?? null,
      lastError: r.lastError,
    })),
  };
}

type ReviewStatusUi = {
  submitted: boolean;
  reportId: string | null;
  status: string | null;
  humanVerified: boolean;
  reviewerNotes: Array<{ note?: string; at?: string; reviewerId?: string }>;
  reviewedAt: string | null;
  decision: string | null;
};

type ReviewerEvidenceAttachment = {
  id: string;
  type: 'screenshot' | 'map' | 'chart' | 'document' | 'scan_artifact' | 'url' | 'note';
  title: string;
  description: string;
  url?: string;
  thumbnailUrl?: string;
  source: string;
  workflowId?: string;
  claimLabels?: Record<string, boolean>;
  createdAt: string;
};

function deriveFinalActionsBlocked(
  requiredApprovals: string[],
  gateApprovals: Record<string, boolean>,
  _executionResult: ExecutionBridgeResult | null
): boolean {
  if (requiredApprovals.length === 0) return false;
  return !requiredApprovals.every((gate) => gateApprovals[gate] === true);
}

function deriveWorkspaceStatus(params: {
  superAgentStatus: 'idle' | 'planning' | 'planned' | 'error';
  isPlanExecutionRunning: boolean;
  executionResult: ExecutionBridgeResult | null;
}): string {
  const { superAgentStatus, isPlanExecutionRunning, executionResult } = params;
  if (superAgentStatus === 'planning') return 'Planning — Dry Run preview';
  if (superAgentStatus === 'error') return 'Planning error — review inputs';
  if (isPlanExecutionRunning) return 'Workflow preview running — Dry Run';
  if (executionResult?.status === 'failed') return 'Preview finished with failures — Dry Run';
  if (executionResult?.status === 'partial') return 'Preview partially completed — Dry Run';
  if (executionResult?.status === 'needs_human_approval') {
    return 'Preview complete — final actions gated until approvals';
  }
  if (executionResult?.status === 'success') {
    return 'Preview complete — approvals cleared for this session — Dry Run';
  }
  return 'Plan ready — workflow preview not started';
}

/** Derives a chronological investigation narrative from current Super Agent UI state (Dry Run / Preview only). */
function buildEvidenceTimelineEntries(params: {
  times: InvestigationTimes;
  superAgentPlan: SuperAgentPlan;
  mappedExecutionPlan: MappedExecutionPlan | null;
  executionResult: ExecutionBridgeResult | null;
  gateApprovals: Record<string, boolean>;
}): EvidenceTimelineEntry[] {
  const { times, superAgentPlan, mappedExecutionPlan, executionResult, gateApprovals } = params;
  const required = superAgentPlan.humanApprovalCheckpoints;
  const gatesComplete = required.length === 0 || required.every((id) => gateApprovals[id] === true);
  const humanVerified = Boolean(superAgentPlan.claimLabels.human_verified);
  const chainAnchored = Boolean(superAgentPlan.claimLabels.blockchain_anchored);

  const entries: EvidenceTimelineEntry[] = [
    {
      id: 'goal',
      sortIndex: 10,
      at: times.goalReceived,
      title: 'User goal received',
      detail: 'Investigation goal captured for Super Agent planning (Preview — Dry Run).',
      tone: 'default',
    },
    {
      id: 'plan',
      sortIndex: 20,
      at: times.planGenerated,
      title: 'Lead Agent plan generated',
      detail: 'Structured plan, checkpoints, and claim safety labels drafted — Pending live service adapter for live connectors.',
      tone: 'default',
    },
    {
      id: 'workspace',
      sortIndex: 30,
      at: times.planGenerated,
      title: 'Case workspace created',
      detail: `Workspace opened for case ${superAgentPlan.caseId}.`,
      tone: 'default',
    },
    {
      id: 'agents',
      sortIndex: 40,
      at: times.planGenerated,
      title: 'Sub-agents assigned',
      detail: `Primary/support agents: ${superAgentPlan.subAgentsNeeded.join(', ') || 'None'}.`,
      tone: 'default',
    },
    {
      id: 'sub-out',
      sortIndex: 50,
      at: times.planGenerated,
      title: 'Sub-agent Dry Run outputs completed',
      detail:
        superAgentPlan.subAgentOutputs && superAgentPlan.subAgentOutputs.length > 0
          ? `${superAgentPlan.subAgentOutputs.length} preview output(s) recorded — Dry Run only.`
          : 'No sub-agent preview outputs were produced for this plan.',
      tone: superAgentPlan.subAgentOutputs?.length ? 'positive' : 'attention',
    },
    {
      id: 'map',
      sortIndex: 60,
      at: times.planGenerated,
      title: 'Plan mapped to registered workflows',
      detail: mappedExecutionPlan
        ? `Workflow previews queued: ${mappedExecutionPlan.mappedWorkflowIds.join(', ') || 'None'}.`
        : 'Mapping pending.',
      tone: mappedExecutionPlan?.mappedWorkflowIds.length ? 'positive' : 'attention',
    },
    {
      id: 'preview',
      sortIndex: 70,
      at: times.previewCompleted,
      title: 'Workflow preview executed',
      detail: executionResult
        ? `${executionResult.previewSteps.length} workflow preview step(s) — Dry Run.`
        : 'Workflow preview has not been run yet.',
      tone: executionResult ? 'positive' : 'attention',
    },
    {
      id: 'claims',
      sortIndex: 80,
      at: times.planGenerated,
      title: 'Claim safety labels applied',
      detail: humanVerified
        ? 'Plan marks human-verified signals where indicated — confirm independently before relying on them.'
        : 'Labels are advisory; human-verified is not asserted for this preview. Blockchain anchoring is not asserted unless explicitly indicated.',
      tone: humanVerified ? 'attention' : 'default',
    },
    {
      id: 'gates',
      sortIndex: 90,
      at: executionResult?.workflowResults[executionResult.workflowResults.length - 1]?.completedAt ?? times.previewCompleted ?? times.planGenerated,
      title: gatesComplete ? 'Human approval gates cleared for this session' : 'Human approval gates pending',
      detail: gatesComplete
        ? 'All checklist gates checked in this UI — final-action blocks cleared for reporting only (still Dry Run / Pending live service adapter).'
        : `Approvals still required: ${required.filter((id) => !gateApprovals[id]).length} gate(s).`,
      tone: gatesComplete ? 'positive' : 'attention',
    },
    {
      id: 'final',
      sortIndex: 100,
      at: times.previewCompleted ?? times.planGenerated,
      title: deriveFinalActionsBlocked(required, gateApprovals, executionResult)
        ? 'Final actions blocked'
        : 'Final actions cleared (preview scope)',
      detail: chainAnchored
        ? 'Blockchain-anchored label is indicated on the plan — confirm on-chain records separately.'
        : 'No blockchain anchoring is asserted for this preview.',
      tone: deriveFinalActionsBlocked(required, gateApprovals, executionResult) ? 'attention' : 'default',
    },
  ];

  return entries.sort((a, b) => a.sortIndex - b.sortIndex);
}

/** Structured execution trace rows for the Super Agent Preview path (Dry Run unless marked otherwise). */
function buildSuperAgentExecutionTraceRows(params: {
  times: InvestigationTimes;
  superAgentPlan: SuperAgentPlan;
  mappedExecutionPlan: MappedExecutionPlan | null;
  executionResult: ExecutionBridgeResult | null;
}): UiExecutionTraceRow[] {
  const { times, superAgentPlan, mappedExecutionPlan, executionResult } = params;
  const rows: UiExecutionTraceRow[] = [];
  let rid = 0;
  const dryRun = 'Dry Run' as const;
  const pendingAdapter = 'Pending live service adapter' as const;

  rows.push({
    id: `t-${rid++}`,
    stepName: 'Receive investigation goal',
    actor: 'User',
    mode: dryRun,
    timestamp: times.goalReceived,
    outputSummary: superAgentPlan.goal.slice(0, 160) + (superAgentPlan.goal.length > 160 ? '…' : ''),
    status: 'complete',
  });

  rows.push({
    id: `t-${rid++}`,
    stepName: 'Generate Super Agent plan',
    actor: 'DPAL Lead Agent',
    mode: dryRun,
    timestamp: times.planGenerated,
    outputSummary: `${superAgentPlan.subAgentsNeeded.length} agent(s) selected — ${superAgentPlan.caseSummary.slice(0, 120)}…`,
    status: 'complete',
  });

  rows.push({
    id: `t-${rid++}`,
    stepName: 'Apply claim safety labels',
    actor: 'Claim safety guard',
    mode: dryRun,
    timestamp: times.planGenerated,
    outputSummary: `human_verified=${Boolean(superAgentPlan.claimLabels.human_verified)}; blockchain_anchored=${Boolean(superAgentPlan.claimLabels.blockchain_anchored)} — advisory labels only unless independently confirmed.`,
    status: 'complete',
  });

  rows.push({
    id: `t-${rid++}`,
    stepName: 'Map plan to Field OS workflows',
    actor: 'PlanExecutionBridge',
    mode: dryRun,
    timestamp: times.planGenerated,
    outputSummary: mappedExecutionPlan
      ? `Mapped IDs: ${mappedExecutionPlan.mappedWorkflowIds.join(', ') || 'none'}; support agents: ${mappedExecutionPlan.supportAgents.join(', ') || 'none'}.`
      : 'No mapped plan object.',
    status: mappedExecutionPlan ? 'complete' : 'pending',
  });

  superAgentPlan.subAgentOutputs?.forEach((output) => {
    rows.push({
      id: `t-${rid++}`,
      stepName: `Sub-agent preview — ${output.name}`,
      actor: output.agentId,
      mode: dryRun,
      timestamp: times.planGenerated,
      outputSummary: `${output.findings[0] ?? 'No findings'}${output.limitations[0] ? ` — ${output.limitations[0]}` : ''}`,
      status: output.status,
    });
  });

  executionResult?.workflowResults.forEach((wf) => {
    rows.push({
      id: `t-${rid++}`,
      stepName: `Workflow preview — ${wf.workflowName}`,
      actor: `workflow:${wf.workflowId}`,
      mode: wf.dryRunLabel ? pendingAdapter : dryRun,
      timestamp: wf.completedAt,
      outputSummary: wf.dryRunLabel ?? `Confidence ${wf.confidence}; ${wf.nextRecommendedAction}`,
      status: wf.status.replace(/_/g, ' '),
    });
    wf.steps.forEach((step) => {
      rows.push({
        id: `t-${rid++}-${wf.workflowId}-${step.stepId}`,
        stepName: step.name,
        actor: wf.workflowName,
        mode: wf.dryRunLabel ? pendingAdapter : dryRun,
        timestamp: wf.completedAt,
        outputSummary:
          typeof step.output === 'object' && step.output !== null
            ? JSON.stringify(step.output).slice(0, 140) + (JSON.stringify(step.output).length > 140 ? '…' : '')
            : String(step.output ?? ''),
        status: step.status.replace(/_/g, ' '),
      });
    });
  });

  rows.push({
    id: `t-${rid++}`,
    stepName: 'Bridge preview summary',
    actor: 'PlanExecutionBridge',
    mode: dryRun,
    timestamp: times.previewCompleted,
    outputSummary: executionResult
      ? executionResult.executionTrace.replace(/\n/g, ' · ')
      : 'Preview not executed yet.',
    status: executionResult ? executionResult.status.replace(/_/g, ' ') : 'pending',
  });

  return rows;
}

/** Prefer persisted CaseWorkspace.evidenceTimeline rows when present (same caseId as active plan). */
function persistedTimelineToUi(ws: CaseWorkspaceState): EvidenceTimelineEntry[] {
  return ws.evidenceTimeline.map((row, index) => ({
    id: `persisted-${ws.caseId}-${index}`,
    sortIndex: index,
    at: row.timestamp,
    title: row.event,
    detail: row.source,
    tone: 'default' as const,
  }));
}

function persistedTracesToUi(traces: ExecutionTrace[]): UiExecutionTraceRow[] {
  return traces.map((t, i) => ({
    id: `ptr-${t.caseId ?? 'case'}-${i}-${t.timestamp.getTime()}`,
    stepName: t.step,
    actor: t.agent,
    mode:
      t.mode === 'dry-run'
        ? 'Dry Run'
        : t.mode === 'pending-adapter'
        ? 'Pending live service adapter'
        : 'Live',
    timestamp: t.timestamp,
    outputSummary: `${t.tool}: ${t.outputSummary}`,
    status: t.status,
  }));
}

const statusPillStyles: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-900',
  running: 'bg-blue-100 text-blue-900',
  completed: 'bg-emerald-100 text-emerald-900',
  failed: 'bg-rose-100 text-rose-900',
  needs_human_review: 'bg-amber-100 text-amber-900',
};

const DpalFieldOSPage: React.FC = () => {
  const location = useLocation();
  const workflows = useMemo(() => getWorkflowDefinitions(), []);
  const leadAgent = useMemo(() => new DpalLeadAgent(), []);
  const planBridge = useMemo(() => new PlanExecutionBridge(), []);
  const [execution, setExecution] = useState<WorkflowExecutionResult | null>(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [superAgentGoal, setSuperAgentGoal] = useState('');
  const [superAgentLocation, setSuperAgentLocation] = useState('');
  const [superAgentStartDate, setSuperAgentStartDate] = useState('');
  const [superAgentEndDate, setSuperAgentEndDate] = useState('');
  const [superAgentEvidenceRefs, setSuperAgentEvidenceRefs] = useState('');
  const [superAgentPlan, setSuperAgentPlan] = useState<SuperAgentPlan | null>(null);
  const [mappedExecutionPlan, setMappedExecutionPlan] = useState<MappedExecutionPlan | null>(null);
  const [planExecutionResult, setPlanExecutionResult] = useState<ExecutionBridgeResult | null>(null);
  const [isPlanExecutionRunning, setIsPlanExecutionRunning] = useState(false);
  const [planExecutionError, setPlanExecutionError] = useState<string | null>(null);
  const [superAgentStatus, setSuperAgentStatus] = useState<'idle' | 'planning' | 'planned' | 'error'>('idle');
  const [superAgentError, setSuperAgentError] = useState<string | null>(null);
  const [gateApprovals, setGateApprovals] = useState<Record<string, boolean>>({});
  const [superAgentTab, setSuperAgentTab] = useState<SuperAgentWorkspaceTab>('plan');
  const [investigationTimes, setInvestigationTimes] = useState<InvestigationTimes>({});
  const [persistVersion, setPersistVersion] = useState(0);
  const [loopNextRecommendedAction, setLoopNextRecommendedAction] = useState<string | null>(null);
  const [exportSnapshotJson, setExportSnapshotJson] = useState<string | null>(null);
  const [reviewStatusUi, setReviewStatusUi] = useState<ReviewStatusUi>({
    submitted: false,
    reportId: null,
    status: null,
    humanVerified: false,
    reviewerNotes: [],
    reviewedAt: null,
    decision: null,
  });
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewBusy, setIsReviewBusy] = useState(false);
  const [manualEvidenceUrl, setManualEvidenceUrl] = useState('');
  const [manualScreenshotUrl, setManualScreenshotUrl] = useState('');
  const [manualReviewerNote, setManualReviewerNote] = useState('');
  const [manualEvidenceAttachments, setManualEvidenceAttachments] = useState<ReviewerEvidenceAttachment[]>([]);
  const [isScreenshotCaptureBusy, setIsScreenshotCaptureBusy] = useState(false);
  const [screenshotCaptureError, setScreenshotCaptureError] = useState<string | null>(null);
  const [hubConnectivityRows, setHubConnectivityRows] = useState<HubConnectivityRow[]>(() => getHubConnectivityLoadingRows());
  const [hubConnectivityProbedAt, setHubConnectivityProbedAt] = useState<string | null>(null);

  const caseWorkspaceRef = useRef<CaseWorkspace | null>(null);
  const executionTraceRef = useRef<ExecutionTraceService | null>(null);
  const planSafetyPanelRef = useRef<HTMLDivElement | null>(null);
  const workspaceTimelinePanelRef = useRef<HTMLDivElement | null>(null);
  const previewExecutionPanelRef = useRef<HTMLDivElement | null>(null);
  const evidencePackagePanelRef = useRef<HTMLDivElement | null>(null);
  const superAgentSectionRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const fromHash = location.hash === FIELD_OS_SUPER_AGENT_HASH;
    let fromStorage = false;
    try {
      fromStorage = sessionStorage.getItem(FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY) === '1';
      if (fromStorage) sessionStorage.removeItem(FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY);
    } catch {
      /* ignore quota / private mode */
    }
    if (!fromHash && !fromStorage) return;
    const t = window.setTimeout(() => {
      superAgentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const { rows } = await runEnvironmentalHubProbes({ bypassCache: false });
        if (!cancelled) {
          setHubConnectivityRows(rows);
          setHubConnectivityProbedAt(new Date().toISOString());
        }
      } catch {
        if (!cancelled) {
          setHubConnectivityRows((prev) =>
            prev.map((r) => ({
              ...r,
              status: r.status === 'loading' ? 'offline' : r.status,
              detail: r.status === 'loading' ? 'Connectivity refresh failed' : r.detail,
            })),
          );
        }
      }
    };
    void refresh();
    const id = window.setInterval(() => void refresh(), HUB_AUTO_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const timelineEntries = useMemo(() => {
    if (!superAgentPlan) return [];
    const ws = caseWorkspaceRef.current;
    if (ws && ws.getState().caseId === superAgentPlan.caseId && ws.getState().evidenceTimeline.length > 0) {
      return persistedTimelineToUi(ws.getState());
    }
    return buildEvidenceTimelineEntries({
      times: investigationTimes,
      superAgentPlan,
      mappedExecutionPlan,
      executionResult: planExecutionResult,
      gateApprovals,
    });
  }, [
    superAgentPlan,
    mappedExecutionPlan,
    planExecutionResult,
    gateApprovals,
    investigationTimes,
    persistVersion,
  ]);

  const executionTraceRows = useMemo(() => {
    if (!superAgentPlan) return [];
    const ws = caseWorkspaceRef.current;
    const tracesSvc = executionTraceRef.current;
    if (
      ws &&
      tracesSvc &&
      ws.getState().caseId === superAgentPlan.caseId &&
      tracesSvc.getTraces().length > 0
    ) {
      return persistedTracesToUi(tracesSvc.getTraces());
    }
    return buildSuperAgentExecutionTraceRows({
      times: investigationTimes,
      superAgentPlan,
      mappedExecutionPlan,
      executionResult: planExecutionResult,
    });
  }, [superAgentPlan, mappedExecutionPlan, planExecutionResult, investigationTimes, persistVersion]);

  const finalActionsBlockedUi = useMemo(() => {
    if (!superAgentPlan) return false;
    const ws = caseWorkspaceRef.current;
    if (ws && ws.getState().caseId === superAgentPlan.caseId) {
      return ws.getState().finalActionsBlocked;
    }
    return deriveFinalActionsBlocked(superAgentPlan.humanApprovalCheckpoints, gateApprovals, planExecutionResult);
  }, [superAgentPlan, gateApprovals, planExecutionResult, persistVersion]);

  const humanApprovalRequiredUi = useMemo(() => {
    if (!superAgentPlan) return false;
    const ws = caseWorkspaceRef.current;
    if (ws && ws.getState().caseId === superAgentPlan.caseId) {
      return ws.getState().humanApprovalRequired;
    }
    return superAgentPlan.humanApprovalCheckpoints.some((id) => !gateApprovals[id]);
  }, [superAgentPlan, gateApprovals, persistVersion]);

  const humanVerifierStatusLabel = useMemo(() => {
    if (reviewStatusUi.humanVerified) return 'Human-verified (reviewer)';
    if (reviewStatusUi.submitted) return 'Not verified yet — submitted for review';
    return 'Not verified yet';
  }, [reviewStatusUi.humanVerified, reviewStatusUi.submitted]);

  const superAgentJourneyActiveIdx = useMemo(() => {
    if (superAgentStatus === 'planning') return 0;
    if (!superAgentPlan) return 0;
    if (!planExecutionResult) return 1;
    if (reviewStatusUi.submitted) return 3;
    return 2;
  }, [superAgentStatus, superAgentPlan, planExecutionResult, reviewStatusUi.submitted]);

  useEffect(() => {
    if (!superAgentPlan || !caseWorkspaceRef.current) return;
    if (caseWorkspaceRef.current.getState().caseId !== superAgentPlan.caseId) return;
    caseWorkspaceRef.current.syncGateEvaluationFromUi(gateApprovals, planExecutionResult);
  }, [gateApprovals, planExecutionResult, superAgentPlan]);

  /** Prefer in-memory CaseWorkspace fields when this session has persisted workspace state for the active plan. */
  const workspacePresentation = useMemo(() => {
    const ws = caseWorkspaceRef.current?.getState();
    const match =
      Boolean(ws && superAgentPlan && mappedExecutionPlan && ws.caseId === superAgentPlan.caseId);
    if (!superAgentPlan || !mappedExecutionPlan) {
      return null;
    }
    if (match && ws) {
      return {
        supportAgents: ws.supportAgents,
        expectedArtifacts: ws.expectedArtifacts,
        workflowAgents: ws.selectedAgents.filter((a) => !ws.supportAgents.includes(a)),
      };
    }
    return {
      supportAgents: mappedExecutionPlan.supportAgents,
      expectedArtifacts: superAgentPlan.expectedArtifacts,
      workflowAgents: superAgentPlan.subAgentsNeeded.filter((a) => !mappedExecutionPlan.supportAgents.includes(a)),
    };
  }, [superAgentPlan, mappedExecutionPlan, persistVersion]);

  const workspaceStatusLabel = deriveWorkspaceStatus({
    superAgentStatus,
    isPlanExecutionRunning,
    executionResult: planExecutionResult,
  });

  const startWorkflow = async (workflowId: string) => {
    const workflow = workflows.find((item) => item.id === workflowId);
    if (!workflow) return;

    setError(null);
    setIsRunning(true);
    setActiveWorkflowId(workflowId);
    setExecution(null);

    try {
      const result = await runner.run(workflowId, workflow.exampleInputs || {});
      setExecution(result);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Workflow execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const createSuperAgentPlan = async () => {
    const trimmedGoal = superAgentGoal.trim();

    if (!trimmedGoal) {
      setSuperAgentError('Please enter a clear investigation goal.');
      return;
    }

    setSuperAgentError(null);
    setSuperAgentStatus('planning');
    setSuperAgentPlan(null);
    setMappedExecutionPlan(null);
    setPlanExecutionResult(null);
    setPlanExecutionError(null);
    setGateApprovals({});
    setInvestigationTimes({});
    setSuperAgentTab('plan');
    setLoopNextRecommendedAction(null);
    setExportSnapshotJson(null);
    setReviewError(null);
    setManualEvidenceUrl('');
    setManualScreenshotUrl('');
    setManualReviewerNote('');
    setManualEvidenceAttachments([]);
    setScreenshotCaptureError(null);

    caseWorkspaceRef.current = null;
    executionTraceRef.current = null;

    const goalReceived = new Date();

    try {
      const evidenceRefs = superAgentEvidenceRefs
        .split(/\r?\n|,|;/)
        .map((line) => line.trim())
        .filter(Boolean);

      const plan = await leadAgent.generatePlan({
        goal: trimmedGoal,
        location: superAgentLocation.trim() || undefined,
        dateRange: {
          startDate: superAgentStartDate.trim() || undefined,
          endDate: superAgentEndDate.trim() || undefined,
        },
        evidenceRefs,
      });

      const mappedPlan = planBridge.mapPlanToWorkflows(plan);

      const ws = new CaseWorkspace(plan);
      ws.hydrateAfterPlanGeneration(plan, mappedPlan, evidenceRefs);
      caseWorkspaceRef.current = ws;

      const traceSvc = new ExecutionTraceService();
      executionTraceRef.current = traceSvc;
      const cid = plan.caseId;

      traceSvc.recordTrace(
        'User',
        'User goal received — Preview',
        'SuperAgentForm',
        'dry-run',
        {
          goal: trimmedGoal,
          location: superAgentLocation.trim() || undefined,
          dateRange: plan.dateRange,
          evidenceRefs,
        },
        `${evidenceRefs.length} evidence ref(s); Dry Run session.`,
        'success',
        cid
      );
      ws.addEvidenceTimelineEvent(
        'User goal received — Preview (Dry Run)',
        `Case ${cid}; ${evidenceRefs.length} evidence ref(s).`
      );

      traceSvc.recordTrace(
        'DPAL Lead Agent',
        'Lead Agent plan generated — Dry Run',
        'DpalLeadAgent',
        'dry-run',
        { caseId: cid },
        plan.caseSummary ?? plan.nextRecommendedAction,
        'success',
        cid
      );
      ws.addEvidenceTimelineEvent('Lead Agent plan generated — Dry Run', plan.caseSummary ?? 'Plan summary pending.');

      traceSvc.recordTrace(
        'CaseWorkspace',
        'Case workspace created — Preview',
        'CaseWorkspace',
        'dry-run',
        { caseId: cid },
        `mappedWorkflowIds=${mappedPlan.mappedWorkflowIds.join(',') || 'none'}`,
        'success',
        cid
      );
      ws.addEvidenceTimelineEvent(
        'Case workspace created — Preview',
        `Mapped workflows: ${mappedPlan.mappedWorkflowIds.join(', ') || 'none'}; support agents: ${mappedPlan.supportAgents.join(', ') || 'none'}.`
      );

      traceSvc.recordTrace(
        'DPAL Lead Agent',
        'Sub-agents assigned — Dry Run preview',
        'SubAgentOrchestrator',
        'dry-run',
        plan.subAgentsNeeded,
        plan.subAgentOutputs ?? [],
        'success',
        cid
      );
      ws.addEvidenceTimelineEvent(
        'Sub-agents assigned — Dry Run preview outputs',
        `${plan.subAgentOutputs?.length ?? 0} output record(s).`
      );

      traceSvc.recordTrace(
        'ClaimSafetyGuard',
        'Claim safety labels applied — advisory unless independently confirmed',
        'claimSafetyGuard',
        'dry-run',
        plan.claimLabels,
        `human_verified strictly ${plan.claimLabels.human_verified === true}; blockchain_anchored strictly ${plan.claimLabels.blockchain_anchored === true}`,
        'success',
        cid
      );
      ws.addEvidenceTimelineEvent(
        'Claim safety labels applied — advisory only unless independently confirmed',
        `human_verified=${plan.claimLabels.human_verified === true}; blockchain_anchored=${plan.claimLabels.blockchain_anchored === true}.`
      );

      traceSvc.recordTrace(
        'HumanApprovalGate',
        'Human approval gates initialized — Preview',
        'humanApprovalGate',
        'dry-run',
        plan.humanApprovalCheckpoints,
        `${plan.humanApprovalCheckpoints.length} checkpoint(s); Dry Run scope`,
        'pending',
        cid
      );
      ws.addEvidenceTimelineEvent(
        'Human approval gates initialized',
        `${plan.humanApprovalCheckpoints.length} checkpoints pending explicit confirmation.`
      );

      setSuperAgentPlan(plan);
      setMappedExecutionPlan(mappedPlan);
      setInvestigationTimes({ goalReceived, planGenerated: new Date() });
      setSuperAgentStatus('planned');
      setPersistVersion((v) => v + 1);
    } catch (planError) {
      setSuperAgentError(planError instanceof Error ? planError.message : 'Failed to create a Super Agent plan.');
      setSuperAgentStatus('error');
    }
  };

  const resetSuperAgentCaseState = () => {
    setSuperAgentPlan(null);
    setMappedExecutionPlan(null);
    setPlanExecutionResult(null);
    setPlanExecutionError(null);
    setGateApprovals({});
    setInvestigationTimes({});
    setSuperAgentStatus('idle');
    setSuperAgentError(null);
    setSuperAgentTab('plan');
    setLoopNextRecommendedAction(null);
    setExportSnapshotJson(null);
    setReviewStatusUi({
      submitted: false,
      reportId: null,
      status: null,
      humanVerified: false,
      reviewerNotes: [],
      reviewedAt: null,
      decision: null,
    });
    setReviewError(null);
    setManualEvidenceUrl('');
    setManualScreenshotUrl('');
    setManualReviewerNote('');
    setManualEvidenceAttachments([]);
    setScreenshotCaptureError(null);
    caseWorkspaceRef.current = null;
    executionTraceRef.current = null;
    setPersistVersion((v) => v + 1);
  };

  const checkCompletionStatusLocal = (): SuperAgentCompletionStatus => {
    if (!superAgentPlan) {
      return {
        caseId: '',
        planComplete: false,
        previewRun: false,
        evidenceSufficient: false,
        approvalsCleared: false,
        finalActionsBlocked: true,
        missingInputs: ['goal'],
        pendingAdapters: [],
        nextRecommendedAction: 'Generate a Super Agent plan first (Preview / Dry Run only).',
        loopShouldContinue: true,
      };
    }

    const missingInputs: string[] = [];
    if (!superAgentGoal.trim()) missingInputs.push('goal');
    if (!superAgentLocation.trim()) missingInputs.push('location');
    if (!superAgentStartDate.trim() || !superAgentEndDate.trim()) missingInputs.push('dateRange');
    const evidenceRefs = superAgentEvidenceRefs
      .split(/\r?\n|,|;/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (evidenceRefs.length === 0) missingInputs.push('evidenceRefs');

    const planComplete = missingInputs.length === 0;
    const preview = planExecutionResult;
    const previewRun = Boolean(preview);
    const previewHealthy = Boolean(preview && preview.status !== 'failed' && preview.dryRunPreviewCompleted);
    const approvalsCleared =
      superAgentPlan.humanApprovalCheckpoints.length === 0 ||
      superAgentPlan.humanApprovalCheckpoints.every((id) => gateApprovals[id] === true);
    const pendingAdapters = mappedExecutionPlan?.pendingAdapters ?? [];
    const evidenceSufficient = evidenceRefs.length > 0 || previewHealthy;

    let loopShouldContinue = true;
    let nextRecommendedAction = superAgentPlan.nextRecommendedAction;
    if (!planComplete) {
      nextRecommendedAction = `Provide missing inputs for the completion promise: ${missingInputs.join(', ')} (Preview only).`;
    } else if (!previewRun) {
      nextRecommendedAction =
        'Run Planned Workflow Preview (Dry Run) to continue this case; Pending live service adapter for live systems.';
    } else if (!previewHealthy) {
      nextRecommendedAction =
        'Preview indicates failures or incomplete Dry Run; review workflow results and rerun Preview.';
    } else if (!approvalsCleared) {
      nextRecommendedAction =
        'Human approval required — check all approval gates before final actions can clear.';
    } else {
      loopShouldContinue = false;
      nextRecommendedAction =
        'Dry Run Preview complete for this session; final actions may proceed only with explicit approvals and live adapters.';
      if (pendingAdapters.length > 0) {
        nextRecommendedAction += ` Pending live service adapter (informational): ${pendingAdapters.join('; ')}.`;
      }
    }

    return {
      caseId: superAgentPlan.caseId,
      planComplete,
      previewRun,
      evidenceSufficient,
      approvalsCleared,
      finalActionsBlocked: finalActionsBlockedUi,
      missingInputs,
      pendingAdapters,
      nextRecommendedAction,
      loopShouldContinue,
    };
  };

  const continueSuperAgentLoop = () => {
    if (!superAgentPlan) return;
    const completion = checkCompletionStatusLocal();
    setLoopNextRecommendedAction(completion.nextRecommendedAction);
    const ws = caseWorkspaceRef.current;
    const traceSvc = executionTraceRef.current;
    const cid = superAgentPlan.caseId;
    if (ws && ws.getState().caseId === cid) {
      ws.addEvidenceTimelineEvent(
        'Super Agent loop — completion check (Dry Run)',
        `${completion.loopShouldContinue ? 'Continue' : 'Ready for next phase'}: ${completion.nextRecommendedAction}`
      );
    }
    if (traceSvc) {
      traceSvc.recordTrace(
        'SuperAgentRuntime',
        'Super Agent loop — completion check (Dry Run)',
        'SuperAgentRuntime',
        'dry-run',
        completion,
        completion.nextRecommendedAction,
        'success',
        cid
      );
    }
    setPersistVersion((v) => v + 1);
  };

  const addManualEvidenceAttachment = () => {
    if (!manualEvidenceUrl.trim() && !manualScreenshotUrl.trim() && !manualReviewerNote.trim()) return;
    const now = new Date().toISOString();
    const items: ReviewerEvidenceAttachment[] = [];
    if (manualEvidenceUrl.trim()) {
      items.push({
        id: `manual-url-${Date.now()}`,
        type: 'url',
        title: 'Manual evidence URL',
        description: 'User-provided evidence reference URL.',
        url: manualEvidenceUrl.trim(),
        source: 'Field OS manual input',
        createdAt: now,
      });
    }
    if (manualScreenshotUrl.trim()) {
      items.push({
        id: `manual-shot-${Date.now()}`,
        type: 'screenshot',
        title: 'Manual screenshot URL',
        description: 'User-provided screenshot URL for reviewer context.',
        url: manualScreenshotUrl.trim(),
        thumbnailUrl: manualScreenshotUrl.trim(),
        source: 'Field OS manual input',
        createdAt: now,
      });
    }
    if (manualReviewerNote.trim()) {
      items.push({
        id: `manual-note-${Date.now()}`,
        type: 'note',
        title: 'Reviewer note',
        description: manualReviewerNote.trim(),
        source: 'Field OS manual input',
        createdAt: now,
      });
    }
    setManualEvidenceAttachments((prev) => [...prev, ...items]);
    setManualEvidenceUrl('');
    setManualScreenshotUrl('');
    setManualReviewerNote('');
  };

  const buildReviewerEvidencePackage = () => {
    const plan = superAgentPlan;
    if (!plan) {
      return {
        analysisSummaries: {},
        evidenceAttachments: [] as ReviewerEvidenceAttachment[],
        pendingAdapters: [] as string[],
      };
    }
    const ws = caseWorkspaceRef.current?.getState();
    const pendingAdapters = mappedExecutionPlan?.pendingAdapters ?? ws?.pendingAdapters ?? [];
    const outputByAgent = (id: string) => plan.subAgentOutputs?.find((o) => o.agentId === id);
    const byWorkflow = (id: string) => planExecutionResult?.workflowResults.find((w) => w.workflowId === id);
    const allArtifacts = planExecutionResult?.allArtifacts ?? [];
    const waterOutput = outputByAgent('AquaScanAgent');
    const eoOutput = outputByAgent('EarthObservationAgent');
    const pollutionOutput = outputByAgent('CarbEmissionsAgent');
    const viuOutput = outputByAgent('ValidatorAgent') ?? outputByAgent('ReportAgent');
    const wfIds = mappedExecutionPlan?.mappedWorkflowIds ?? [];
    const agents = plan.subAgentsNeeded;

    const findingBlurb = (o?: { findings?: string[] } | null, wfNext?: string | undefined, idle: string = 'Dry Run preview recorded — open Plan & safety for full sub-agent output.') => {
      const joined = o?.findings?.filter(Boolean).join(' ')?.trim();
      if (joined) return joined.length > 280 ? `${joined.slice(0, 277)}…` : joined;
      if (wfNext?.trim()) return wfNext.trim();
      return o ? idle : '';
    };

    const waterRich = waterOutput || byWorkflow('aquascan-investigation');
    const eoRich = eoOutput || byWorkflow('earth-observation-audit');
    const pollutionRich = pollutionOutput || byWorkflow('carb-emissions-audit');
    const carbonViuRich = byWorkflow('carbon-viu-project') || viuOutput;

    const waterInScope = agents.includes('AquaScanAgent') || wfIds.includes('aquascan-investigation');
    const eoInScope = agents.includes('EarthObservationAgent') || wfIds.includes('earth-observation-audit');
    const pollutionInScope = agents.includes('CarbEmissionsAgent') || wfIds.includes('carb-emissions-audit');
    const carbonViuInScope = wfIds.includes('carbon-viu-project');

    const mergePillar = (title: string, inScope: boolean, rich: boolean, richPayload: Record<string, unknown>) => {
      if (rich) {
        return {
          ...richPayload,
          pillarScope: 'in_scope' as const,
          pillarPhase: 'preview' as const,
        };
      }
      if (inScope) {
        return {
          title,
          summary:
            'This pillar is in your plan. Run Planned Workflow Preview (Dry Run) to populate preview lines here. Live connectors stay optional.',
          pillarScope: 'in_scope' as const,
          pillarPhase: 'awaiting_preview' as const,
          status: 'awaiting_preview',
        };
      }
      return {
        title,
        summary: 'Not assigned for this investigation. Regenerate the plan if you need this pillar.',
        pillarScope: 'out_of_scope' as const,
        pillarPhase: 'not_applicable' as const,
        status: 'not_applicable',
      };
    };

    const withHub = (pillar: SuperAgentEvidencePillarKey, payload: Record<string, unknown>) => {
      const h = summarizePillarHubConnectivity(pillar, hubConnectivityRows);
      return {
        ...payload,
        adapterStatus: h.adapterStatus,
        rateLimitStatus: h.rateLimitStatus,
        nextRetryAt: h.nextRetryAt,
        cachedStatus: h.cachedStatus,
        hubAdapterDetails: h.hubAdapterDetails,
      };
    };

    const analysisSummaries = {
      water: withHub(
        'water',
        mergePillar(
          'Water analysis',
          waterInScope,
          Boolean(waterRich),
          {
            title: 'Water analysis',
            summary:
              findingBlurb(waterOutput, byWorkflow('aquascan-investigation')?.nextRecommendedAction, 'Dry Run water preview — see assigned agents for details.') ||
              'Pending water analysis details.',
            findings: waterOutput?.findings ?? [],
            artifacts: waterOutput?.artifacts ?? [],
            confidence: waterOutput?.confidence ?? byWorkflow('aquascan-investigation')?.confidence ?? 'medium',
            limitations: waterOutput?.limitations ?? [],
            sourceWorkflowIds: ['aquascan-investigation'],
            status: waterOutput?.status ?? byWorkflow('aquascan-investigation')?.status ?? 'pending',
          }
        ) as Record<string, unknown>
      ),
      earthObservation: withHub(
        'earthObservation',
        mergePillar(
          'Vegetation / canopy analysis',
          eoInScope,
          Boolean(eoRich),
          {
            title: 'Vegetation / canopy analysis',
            summary:
              findingBlurb(eoOutput, byWorkflow('earth-observation-audit')?.nextRecommendedAction, 'Dry Run Earth Observation preview — see Plan & safety for details.') ||
              'Pending vegetation/canopy analysis.',
            vegetationHealth: eoOutput?.findings ?? [],
            canopyChange: eoOutput?.findings ?? [],
            ndviNotes: eoOutput?.limitations ?? [],
            biomassRelevance: eoOutput?.findings ?? [],
            artifacts: eoOutput?.artifacts ?? [],
            confidence: eoOutput?.confidence ?? byWorkflow('earth-observation-audit')?.confidence ?? 'medium',
            limitations: eoOutput?.limitations ?? [],
            sourceWorkflowIds: ['earth-observation-audit'],
            status: eoOutput?.status ?? byWorkflow('earth-observation-audit')?.status ?? 'pending',
          }
        ) as Record<string, unknown>
      ),
      pollution: withHub(
        'pollution',
        mergePillar(
          'Pollution / emissions analysis',
          pollutionInScope,
          Boolean(pollutionRich),
          {
            title: 'Pollution / emissions analysis',
            summary:
              findingBlurb(pollutionOutput, byWorkflow('carb-emissions-audit')?.nextRecommendedAction, 'Dry Run emissions audit preview — see Plan & safety for details.') ||
              'Pending pollution/emissions analysis.',
            carbOrEmissionsNotes: pollutionOutput?.findings ?? [],
            sourceReconciliationNotes: pollutionOutput?.limitations ?? [],
            artifacts: pollutionOutput?.artifacts ?? [],
            confidence: pollutionOutput?.confidence ?? byWorkflow('carb-emissions-audit')?.confidence ?? 'medium',
            limitations: pollutionOutput?.limitations ?? [],
            sourceWorkflowIds: ['carb-emissions-audit'],
            status: pollutionOutput?.status ?? byWorkflow('carb-emissions-audit')?.status ?? 'pending',
          }
        ) as Record<string, unknown>
      ),
      carbonViu: withHub(
        'carbonViu',
        mergePillar(
          'Carbon / VIU analysis',
          carbonViuInScope,
          Boolean(carbonViuRich),
          {
            title: 'Carbon / VIU analysis',
            summary:
              findingBlurb(
                viuOutput,
                byWorkflow('carbon-viu-project')?.nextRecommendedAction,
                'Dry Run carbon / VIU preview — see Plan & safety for details.'
              ) || 'Pending VIU analysis.',
            viuReadiness: byWorkflow('carbon-viu-project')?.status ?? 'pending',
            biomassOrCO2eNotes: viuOutput?.findings ?? [],
            issuanceStatus: 'Draft only (Dry Run)',
            artifacts: viuOutput?.artifacts ?? [],
            confidence: viuOutput?.confidence ?? byWorkflow('carbon-viu-project')?.confidence ?? 'medium',
            limitations: viuOutput?.limitations ?? ['Pending live service adapter'],
            sourceWorkflowIds: ['carbon-viu-project'],
            status: byWorkflow('carbon-viu-project')?.status ?? viuOutput?.status ?? 'pending',
          }
        ) as Record<string, unknown>
      ),
    };
    const parsedEvidenceRefs = superAgentEvidenceRefs
      .split(/\r?\n|,|;/)
      .map((line) => line.trim())
      .filter(Boolean);
    const refAttachments: ReviewerEvidenceAttachment[] = parsedEvidenceRefs.map((ref: string, idx: number) => {
      const isUrl = /^https?:\/\//i.test(ref);
      return {
        id: `ref-${idx}-${plan.caseId}`,
        type: isUrl ? 'url' : 'note',
        title: isUrl ? 'Evidence URL reference' : 'Evidence reference note',
        description: ref,
        url: isUrl ? ref : undefined,
        source: 'Super Agent evidenceRefs',
        claimLabels: plan.claimLabels,
        createdAt: new Date().toISOString(),
      };
    });
    const artifactAttachments: ReviewerEvidenceAttachment[] = allArtifacts.map((artifact: any, idx: number) => ({
      id: `artifact-${idx}-${plan.caseId}`,
      type: 'scan_artifact',
      title: String(artifact?.type || 'Workflow artifact'),
      description: String(artifact?.id || 'Preview artifact from workflow execution'),
      source: 'Workflow preview artifact',
      claimLabels: plan.claimLabels,
      createdAt: new Date().toISOString(),
    }));
    const pendingScreenshot: ReviewerEvidenceAttachment[] = manualEvidenceAttachments.some((a) => a.type === 'screenshot')
      ? []
      : [
          {
            id: `pending-screenshot-${plan.caseId}`,
            type: 'note',
            title: 'Pending screenshot capture',
            description: 'Pending screenshot capture for reviewer packet (Dry Run).',
            source: 'Field OS',
            createdAt: new Date().toISOString(),
          },
        ];
    const pendingAdapterAttachment: ReviewerEvidenceAttachment[] = pendingAdapters.length
      ? [
          {
            id: `pending-adapter-${plan.caseId}`,
            type: 'note',
            title: 'Pending live service adapter',
            description: pendingAdapters.join('; '),
            source: 'PlanExecutionBridge',
            createdAt: new Date().toISOString(),
          },
        ]
      : [];
    return {
      analysisSummaries,
      evidenceAttachments: [
        ...refAttachments,
        ...artifactAttachments,
        ...pendingScreenshot,
        ...pendingAdapterAttachment,
        ...manualEvidenceAttachments,
      ],
      pendingAdapters,
    };
  };

  const reviewerEvidencePackage = useMemo(
    () => buildReviewerEvidencePackage(),
    [
      superAgentPlan,
      mappedExecutionPlan,
      planExecutionResult,
      superAgentEvidenceRefs,
      manualEvidenceAttachments,
      hubConnectivityRows,
    ]
  );

  const captureScreenshotAttachment = async (
    targetRef: React.RefObject<HTMLDivElement | null>,
    title: string,
    description: string
  ) => {
    if (!superAgentPlan) return;
    const target = targetRef.current;
    if (!target) {
      setScreenshotCaptureError('Screenshot target area is not visible yet. Open the relevant tab and try again.');
      return;
    }
    setScreenshotCaptureError(null);
    setIsScreenshotCaptureBusy(true);
    try {
      const canvas = await html2canvas(target, {
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        backgroundColor: '#0f171b',
      });
      const dataUrl = canvas.toDataURL('image/png');
      // TODO: Upload screenshots to backend storage and send stable URLs in evidenceAttachments.
      const attachment: ReviewerEvidenceAttachment = {
        id: `screenshot-${Date.now()}`,
        type: 'screenshot',
        title,
        description: `${description} Local screenshot capture — backend storage pending.`,
        url: dataUrl,
        thumbnailUrl: dataUrl,
        source: 'field_os_screenshot_capture',
        workflowId: 'super-agent',
        claimLabels: superAgentPlan.claimLabels,
        createdAt: new Date().toISOString(),
      };
      setManualEvidenceAttachments((prev) => [...prev, attachment]);
    } catch (error) {
      setScreenshotCaptureError(error instanceof Error ? error.message : 'Screenshot capture failed.');
    } finally {
      setIsScreenshotCaptureBusy(false);
    }
  };

  const captureCurrentReportSnapshot = async () => {
    const map: Record<SuperAgentWorkspaceTab, React.RefObject<HTMLDivElement | null>> = {
      plan: planSafetyPanelRef,
      workspace: workspaceTimelinePanelRef,
      execution: previewExecutionPanelRef,
    };
    await captureScreenshotAttachment(
      map[superAgentTab],
      'Current report snapshot',
      `Captured from Super Agent ${superAgentTab} tab (Preview / Dry Run).`
    );
  };

  const buildCaseSnapshot = (): SuperAgentCaseSnapshot => {
    const completionStatus = checkCompletionStatusLocal();
    const approvalStatus = superAgentPlan
      ? Object.fromEntries(superAgentPlan.humanApprovalCheckpoints.map((id) => [id, Boolean(gateApprovals[id])]))
      : {};
    return {
      currentPlan: superAgentPlan,
      currentCaseWorkspace: caseWorkspaceRef.current?.getState() ?? null,
      evidenceTimeline: timelineEntries,
      executionTraces: executionTraceRows,
      completionStatus,
      approvalStatus,
      finalActionsBlocked: finalActionsBlockedUi,
      humanApprovalRequired: humanApprovalRequiredUi,
      mappedExecutionPlan,
      planExecutionResult,
      mappedWorkflows: mappedExecutionPlan?.mappedWorkflowIds ?? [],
      pendingAdapters: reviewerEvidencePackage.pendingAdapters,
      evidenceRefs: superAgentEvidenceRefs
        .split(/\r?\n|,|;/)
        .map((line) => line.trim())
        .filter(Boolean),
      claimLabels: superAgentPlan?.claimLabels ?? {},
      limitations: superAgentPlan?.limitations ?? [],
      nextRecommendedAction: superAgentPlan?.nextRecommendedAction ?? '',
      analysisSummaries: reviewerEvidencePackage.analysisSummaries,
      evidenceAttachments: reviewerEvidencePackage.evidenceAttachments,
      subAgentOutputs: superAgentPlan?.subAgentOutputs ?? [],
      workflowPreviewArtifacts: planExecutionResult?.allArtifacts ?? [],
      environmentalHubConnectivity: serializeEnvironmentalHubConnectivityForSnapshot(
        hubConnectivityRows,
        hubConnectivityProbedAt,
      ),
    };
  };

  const exportCaseSnapshot = () => {
    setExportSnapshotJson(JSON.stringify(buildCaseSnapshot(), null, 2));
  };

  const applyReviewerStatus = (status: ReviewerStatusResponse) => {
    setReviewStatusUi({
      submitted: true,
      reportId: status.reportId,
      status: status.status,
      humanVerified: Boolean(status.humanVerified),
      reviewerNotes: Array.isArray(status.reviewerNotes) ? status.reviewerNotes : [],
      reviewedAt: status.reviewedAt ?? null,
      decision: status.decision ?? null,
    });

    if (!superAgentPlan) return;
    if (status.humanVerified) {
      const ws = caseWorkspaceRef.current;
      const traceSvc = executionTraceRef.current;
      if (ws && ws.getState().caseId === superAgentPlan.caseId) {
        ws.getState().claimLabels.human_verified = true;
        ws.addEvidenceTimelineEvent('Reviewer marked case human-verified.', `Decision: ${status.decision ?? 'verified'}`);
      }
      if (traceSvc) {
        traceSvc.recordTrace(
          'ReviewerNode',
          'Reviewer marked case human-verified',
          'ReviewerNodeClient',
          'dry-run',
          { reportId: status.reportId, decision: status.decision },
          `status=${status.status}`,
          'success',
          superAgentPlan.caseId
        );
      }
      setPersistVersion((v) => v + 1);
    }
  };

  const requestVerificationReview = async () => {
    if (!superAgentPlan) return;
    const gateMissing = !gateApprovals.validator_submission;
    setReviewError(null);
    setIsReviewBusy(true);
    try {
      const snapshot = buildCaseSnapshot();
      const submitted = await submitCaseForReview(snapshot);
      setReviewStatusUi((prev) => ({
        ...prev,
        submitted: true,
        reportId: submitted.reportId,
        status: submitted.status,
        humanVerified: false,
      }));
      const ws = caseWorkspaceRef.current;
      const traceSvc = executionTraceRef.current;
      if (ws && ws.getState().caseId === superAgentPlan.caseId) {
        ws.addEvidenceTimelineEvent(
          'Case submitted to Reviewer Node for human verification.',
          `${submitted.status} · ${submitted.reportId}${
            gateMissing
              ? ' — submitted before the validator gate was checked; confirm with reviewer before treating as verified.'
              : ''
          }`
        );
      }
      if (traceSvc) {
        traceSvc.recordTrace(
          'ReviewerNode',
          'Request verification review',
          'ReviewerNodeClient',
          'dry-run',
          { caseId: superAgentPlan.caseId, reportId: submitted.reportId },
          submitted.message,
          'success',
          superAgentPlan.caseId
        );
      }
      setPersistVersion((v) => v + 1);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit case for review.');
    } finally {
      setIsReviewBusy(false);
    }
  };

  const refreshReviewStatus = async () => {
    if (!superAgentPlan) return;
    setReviewError(null);
    setIsReviewBusy(true);
    try {
      const status = await getReviewStatus(superAgentPlan.caseId);
      applyReviewerStatus(status);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to refresh review status.');
    } finally {
      setIsReviewBusy(false);
    }
  };

  const runPlannedWorkflow = async () => {
    if (!superAgentPlan || !mappedExecutionPlan) {
      setPlanExecutionError('A Super Agent plan must be generated before execution.');
      return;
    }

    setPlanExecutionError(null);
    setIsPlanExecutionRunning(true);
    setPlanExecutionResult(null);

    try {
      const result = await planBridge.executePlannedWorkflows(superAgentPlan, mappedExecutionPlan, {
        gateApprovals,
      });
      setPlanExecutionResult(result);

      const ws = caseWorkspaceRef.current;
      const traceSvc = executionTraceRef.current;
      const cid = superAgentPlan.caseId;

      if (ws && traceSvc && ws.getState().caseId === cid) {
        ws.ingestWorkflowPreviewRun(result, gateApprovals);

        traceSvc.recordTrace(
          'PlanExecutionBridge',
          'Plan mapped to registered workflows — Preview',
          'PlanExecutionBridge',
          'dry-run',
          mappedExecutionPlan.mappedWorkflowIds,
          result.plan.mappedWorkflowIds.join(', ') || 'none',
          'success',
          cid
        );

        traceSvc.recordTrace(
          'WorkflowRunner',
          'Workflow preview started — Dry Run',
          'WorkflowRunner',
          'dry-run',
          { previewSteps: result.previewSteps.length },
          `${result.workflowResults.length} workflow(s)`,
          'success',
          cid
        );

        result.workflowResults.forEach((wf) => {
          const wfMode = wf.dryRunLabel ? 'pending-adapter' : 'dry-run';
          traceSvc.recordTrace(
            `workflow:${wf.workflowId}`,
            `Workflow preview — ${wf.workflowName}`,
            'WorkflowRunner',
            wfMode,
            wf.workflowId,
            wf.dryRunLabel ?? wf.status,
            wf.status === 'failed' ? 'failed' : 'success',
            cid
          );
          wf.steps.forEach((step) => {
            const stepStatus: ExecutionTrace['status'] =
              step.status === 'failed'
                ? 'failed'
                : step.status === 'pending' || step.status === 'running'
                  ? 'pending'
                  : 'success';
            traceSvc.recordTrace(
              `workflow:${wf.workflowId}`,
              `${wf.workflowName}: ${step.name}`,
              'WorkflowBlueprintStep',
              wfMode,
              step.stepId,
              step.error ?? step.output ?? '',
              stepStatus,
              cid
            );
          });
        });

        traceSvc.recordTrace(
          'AdapterRegistry',
          'Pending live adapters recorded — Preview',
          'AdapterRegistry',
          'pending-adapter',
          result.plan.pendingAdapters,
          result.plan.pendingAdapters.join('; ') || 'none listed',
          'pending',
          cid
        );

        traceSvc.recordTrace(
          'HumanApprovalGate',
          'Human approval status evaluated — Preview',
          'humanApprovalGate',
          'dry-run',
          gateApprovals,
          `humanApprovalRequired=${result.humanApprovalRequired}`,
          'success',
          cid
        );

        traceSvc.recordTrace(
          'PlanExecutionBridge',
          result.finalActionsBlocked ? 'Final actions blocked — approvals pending' : 'Final actions cleared (preview scope)',
          'PlanExecutionBridge',
          'dry-run',
          result.blockedFinalActions,
          result.executionTrace,
          result.finalActionsBlocked ? 'pending' : 'success',
          cid
        );
      }

      setInvestigationTimes((prev) => ({ ...prev, previewCompleted: new Date() }));
      setPersistVersion((v) => v + 1);
    } catch (executionError) {
      setPlanExecutionError(executionError instanceof Error ? executionError.message : 'Workflow execution failed.');
    } finally {
      setIsPlanExecutionRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05090b] text-teal-50 px-6 py-8 [&_.bg-white]:bg-[#0f171b] [&_.bg-slate-50]:bg-[#0b1418] [&_.border-slate-200]:border-teal-900/40 [&_.text-slate-900]:text-teal-50 [&_.text-slate-800]:text-teal-100 [&_.text-slate-700]:text-teal-200 [&_.text-slate-600]:text-teal-300 [&_.text-slate-500]:text-teal-400">
      <div className="mx-auto max-w-screen-2xl">
        <header className="mb-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Agentic Command Center</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">DPAL Field OS</h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
            The agentic layer that turns DPAL tools into complete accountability workflows.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.85fr]">
          <section className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Level 1: Manual Tools</h2>
                <p className="mt-3 text-slate-600">
                  Continue using DPAL’s existing mission and investigation tools directly — AquaScan, Earth Observation, CARB audits, Good Wheels incident review, QR reports, blockchain logs, and situation rooms remain available.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Level 2: Agentic Workflows</h2>
                <p className="mt-3 text-slate-600">
                  Orchestrate those tools from a single command center. Workflows are designed to bring reports, evidence, scans, collaboration, and validation together as a single, traceable process.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Level 3: Super Agent Mode</h2>
                <p className="mt-3 text-slate-600">
                  Enter a natural-language goal and DPAL decides which agents and tools are needed. This is goal-driven planning on top of workflows.
                </p>
              </div>
            </div>

            <section
              ref={superAgentSectionRef}
              id="dpal-field-os-super-agent"
              className="rounded-3xl border-2 border-teal-600/35 bg-white p-4 shadow-md shadow-teal-950/10 sm:p-6"
              aria-labelledby="dpal-field-os-super-agent-heading"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2
                    id="dpal-field-os-super-agent-heading"
                    className="text-2xl font-bold text-slate-900 sm:text-3xl"
                  >
                    Super Agent Mode
                  </h2>
                  <p className="mt-2 text-base leading-relaxed text-slate-600 sm:mt-3">
                    Let DPAL decide which agents and tools are needed from a natural-language investigation goal.
                    Works in Dry Run / preview and when live adapters are connected — you can move forward while human
                    verification is still pending.
                  </p>
                </div>
                <span className="rounded-full bg-teal-200/90 px-4 py-1.5 text-sm font-bold text-[#041316] ring-1 ring-teal-600/40">
                  Goal-driven planning
                </span>
              </div>

              <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Super Agent steps">
                {(
                  [
                    { title: 'Goal & context', hint: 'Describe the investigation' },
                    { title: 'Plan', hint: 'Agents & checkpoints' },
                    { title: 'Preview', hint: 'Dry Run workflows' },
                    { title: 'Pack & review', hint: 'Evidence & reviewer' },
                  ] as const
                ).map((step, idx) => {
                  const active = idx === superAgentJourneyActiveIdx;
                  const done = idx < superAgentJourneyActiveIdx;
                  return (
                    <li
                      key={step.title}
                      className={`flex gap-3 rounded-2xl border px-3 py-3 text-left ${
                        active
                          ? 'border-teal-500 bg-teal-50/90 ring-1 ring-teal-600/30'
                          : done
                            ? 'border-slate-200 bg-slate-50'
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          done ? 'bg-emerald-600 text-white' : active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                        aria-hidden
                      >
                        {done ? '✓' : idx + 1}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{step.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-600">{step.hint}</span>
                        {active && superAgentStatus === 'planning' && idx === 0 ? (
                          <span className="mt-1 block text-xs font-medium text-teal-800">Planning…</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-6 grid gap-4">
                <label className="block text-sm font-medium text-slate-700" htmlFor="super-agent-goal">
                  Investigation goal
                </label>
                <textarea
                  id="super-agent-goal"
                  rows={4}
                  value={superAgentGoal}
                  onChange={(event) => setSuperAgentGoal(event.target.value)}
                  placeholder="Investigate whether this property shows vegetation decline and water stress from March to April 2026."
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-base leading-relaxed text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                />
                <label className="block text-sm font-medium text-slate-700" htmlFor="super-agent-location">
                  Optional focus location
                </label>
                <input
                  id="super-agent-location"
                  type="text"
                  value={superAgentLocation}
                  onChange={(event) => setSuperAgentLocation(event.target.value)}
                  placeholder="Example: 37.25, -119.80 or River Valley property"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="super-agent-start-date">
                      Optional start date
                    </label>
                    <input
                      id="super-agent-start-date"
                      type="date"
                      value={superAgentStartDate}
                      onChange={(event) => setSuperAgentStartDate(event.target.value)}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="super-agent-end-date">
                      Optional end date
                    </label>
                    <input
                      id="super-agent-end-date"
                      type="date"
                      value={superAgentEndDate}
                      onChange={(event) => setSuperAgentEndDate(event.target.value)}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                </div>

                <label className="block text-sm font-medium text-slate-700" htmlFor="super-agent-evidence-refs">
                  Optional evidence references
                </label>
                <textarea
                  id="super-agent-evidence-refs"
                  rows={3}
                  value={superAgentEvidenceRefs}
                  onChange={(event) => setSuperAgentEvidenceRefs(event.target.value)}
                  placeholder="Paste evidence URLs, IDs, or source notes here."
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-base leading-relaxed text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={createSuperAgentPlan}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Generate Super Agent Plan
                  </button>
                  {superAgentStatus === 'planning' && (
                    <p className="text-sm text-slate-600">Planning agents and tools for your investigation...</p>
                  )}
                  {superAgentError && (
                    <p className="text-sm text-rose-700">{superAgentError}</p>
                  )}
                </div>
              </div>

              {superAgentPlan && mappedExecutionPlan && (
                <div className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Investigation workspace</p>
                      <h3 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Super Agent output</h3>
                      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                        Dry Run / preview friendly — production connectors stay optional. Say “verified” only when Human-verified is explicitly true on the plan or from the reviewer.
                      </p>
                      <div ref={evidencePackagePanelRef} className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Evidence package for reviewer</p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-500">
                          Four pillars mirror Field OS workflows. “Awaiting preview” means the pillar is in scope but Planned Workflow Preview has not filled this row yet.
                        </p>
                        {(() => {
                          const summaries = reviewerEvidencePackage.analysisSummaries as Record<
                            string,
                            { rateLimitStatus?: string; adapterStatus?: string } | undefined
                          >;
                          const throttled = (['water', 'earthObservation', 'pollution', 'carbonViu'] as const)
                            .map((k) => {
                              const s = summaries[k];
                              if (!s) return null;
                              if (s.rateLimitStatus === 'rate_limited' || s.rateLimitStatus === 'cooldown') {
                                return s.adapterStatus ?? k;
                              }
                              return null;
                            })
                            .filter(Boolean) as string[];
                          if (!throttled.length) return null;
                          return (
                            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[11px] leading-snug text-amber-950">
                              Hub rate limit or cooldown: {throttled.join(' · ')} Planned Workflow Preview (Dry Run) stays
                              available; defer hub-backed live scans until retry.
                            </p>
                          );
                        })()}
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {(['water', 'earthObservation', 'pollution', 'carbonViu'] as const).map((key) => {
                            const summary = (reviewerEvidencePackage.analysisSummaries as Record<string, any>)[key];
                            const scope = summary?.pillarScope as string | undefined;
                            const phase = summary?.pillarPhase as string | undefined;
                            const chipClass =
                              scope === 'out_of_scope'
                                ? 'bg-slate-100 text-slate-600 ring-slate-200'
                                : phase === 'awaiting_preview'
                                  ? 'bg-amber-50 text-amber-950 ring-amber-200'
                                  : 'bg-teal-50 text-teal-950 ring-teal-700/25';
                            const chipLabel =
                              scope === 'out_of_scope'
                                ? 'Not in plan'
                                : phase === 'awaiting_preview'
                                  ? 'Awaiting preview'
                                  : 'Preview';
                            return (
                              <div
                                key={key}
                                className={`rounded-xl border border-slate-200 bg-white p-3 text-xs ${
                                  scope === 'out_of_scope' ? 'opacity-[0.88]' : ''
                                }`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <p className="font-semibold text-slate-900">{EVIDENCE_PACKAGE_PILLAR_LABELS[key]}</p>
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${chipClass}`}
                                  >
                                    {chipLabel}
                                  </span>
                                </div>
                                <p className="mt-2 leading-relaxed text-slate-600">{summary?.summary ?? '—'}</p>
                                {summary?.adapterStatus ? (
                                  <div className="mt-2 border-t border-slate-100 pt-2 text-[10px] leading-snug text-slate-600">
                                    <p className="font-semibold text-slate-700">Environmental Hub</p>
                                    <p className="mt-0.5">{summary.adapterStatus}</p>
                                    {summary.rateLimitStatus &&
                                      summary.rateLimitStatus !== 'none' &&
                                      summary.rateLimitStatus !== 'ok' && (
                                        <p className="mt-0.5 font-medium uppercase tracking-wide text-slate-500">
                                          {String(summary.rateLimitStatus).replace(/_/g, ' ')}
                                        </p>
                                      )}
                                    {summary.cachedStatus === true && (
                                      <p className="mt-0.5 text-slate-500">Using cached connectivity status</p>
                                    )}
                                    {summary.nextRetryAt && (
                                      <p className="mt-0.5 text-slate-500">
                                        Next retry: {new Date(summary.nextRetryAt).toLocaleString()}
                                      </p>
                                    )}
                                    {Array.isArray(summary.hubAdapterDetails) && summary.hubAdapterDetails.length > 0 && (
                                      <ul className="mt-1 list-inside list-disc text-slate-500">
                                        {summary.hubAdapterDetails.map(
                                          (d: { id: string; status: string; usingCachedResult?: boolean }) => (
                                            <li key={d.id}>
                                              {d.id}: {d.status}
                                              {d.usingCachedResult ? ' · cached strip' : ''}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                            <p className="font-semibold text-slate-900">Attachments / screenshots</p>
                            <p className="mt-2 text-slate-600">{reviewerEvidencePackage.evidenceAttachments.length} prepared for export</p>
                          </div>
                        </div>
                        {screenshotCaptureError && (
                          <p className="mt-2 text-xs text-rose-700">{screenshotCaptureError}</p>
                        )}
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <button
                            type="button"
                            onClick={captureCurrentReportSnapshot}
                            disabled={isScreenshotCaptureBusy}
                            className="w-full rounded-full bg-cyan-100 px-3 py-2 text-xs font-semibold text-cyan-900 ring-1 ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Capture Current Report Snapshot
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              captureScreenshotAttachment(
                                previewExecutionPanelRef,
                                'Preview & execution snapshot',
                                'Captured from Preview & execution tab (Dry Run).'
                              )
                            }
                            disabled={isScreenshotCaptureBusy}
                            className="w-full rounded-full bg-cyan-100 px-3 py-2 text-xs font-semibold text-cyan-900 ring-1 ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Capture Preview & Execution Snapshot
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              captureScreenshotAttachment(
                                evidencePackagePanelRef,
                                'Evidence package snapshot',
                                'Captured from Evidence package for reviewer panel (Dry Run).'
                              )
                            }
                            disabled={isScreenshotCaptureBusy}
                            className="w-full rounded-full bg-cyan-100 px-3 py-2 text-xs font-semibold text-cyan-900 ring-1 ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Capture Evidence Package Snapshot
                          </button>
                        </div>
                        {manualEvidenceAttachments.filter((item) => item.type === 'screenshot').length > 0 && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {manualEvidenceAttachments
                              .filter((item) => item.type === 'screenshot')
                              .slice(-6)
                              .map((shot) => (
                                <a
                                  key={shot.id}
                                  href={shot.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-xl border border-slate-200 bg-white p-2 text-xs"
                                >
                                  <p className="font-semibold text-slate-900">{shot.title}</p>
                                  {shot.thumbnailUrl && (
                                    <img
                                      src={shot.thumbnailUrl}
                                      alt={shot.title}
                                      className="mt-1 h-20 w-full rounded-md object-cover"
                                    />
                                  )}
                                  <p className="mt-1 text-slate-600">{shot.description}</p>
                                </a>
                              ))}
                          </div>
                        )}
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <input
                            value={manualEvidenceUrl}
                            onChange={(e) => setManualEvidenceUrl(e.target.value)}
                            placeholder="Add evidence URL"
                            className="rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900"
                          />
                          <input
                            value={manualScreenshotUrl}
                            onChange={(e) => setManualScreenshotUrl(e.target.value)}
                            placeholder="Add screenshot URL"
                            className="rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900"
                          />
                          <input
                            value={manualReviewerNote}
                            onChange={(e) => setManualReviewerNote(e.target.value)}
                            placeholder="Add note for reviewer"
                            className="rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addManualEvidenceAttachment}
                          className="mt-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Add evidence attachment
                        </button>
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSuperAgentTab('execution');
                          runPlannedWorkflow();
                        }}
                        disabled={!superAgentPlan || isPlanExecutionRunning}
                        className="min-h-[3rem] min-w-[14rem] flex-1 rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold leading-tight text-white transition hover:bg-slate-700 whitespace-normal disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        Run Planned Workflow Preview
                      </button>
                      <button
                        type="button"
                        onClick={createSuperAgentPlan}
                        disabled={superAgentStatus === 'planning'}
                        className="min-h-[3rem] min-w-[14rem] flex-1 rounded-full bg-teal-100/90 px-4 py-2 text-center text-sm font-semibold leading-tight text-[#041316] ring-1 ring-teal-700/30 transition hover:bg-teal-200 whitespace-normal disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Regenerate Plan
                      </button>
                      <button
                        type="button"
                        onClick={resetSuperAgentCaseState}
                        className="min-h-[3rem] min-w-[14rem] flex-1 rounded-full bg-teal-100/90 px-4 py-2 text-center text-sm font-semibold leading-tight text-[#041316] ring-1 ring-teal-700/30 transition hover:bg-teal-200 whitespace-normal"
                      >
                        Reset / Start New Case
                      </button>
                      <button
                        type="button"
                        onClick={continueSuperAgentLoop}
                        className="min-h-[3rem] min-w-[14rem] flex-1 rounded-full bg-amber-100 px-4 py-2 text-center text-sm font-semibold leading-tight text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-200 whitespace-normal"
                      >
                        Continue Loop
                      </button>
                      <button
                        type="button"
                        onClick={requestVerificationReview}
                        disabled={!superAgentPlan || isReviewBusy}
                        className="min-h-[3rem] min-w-[14rem] flex-1 rounded-full bg-emerald-100 px-4 py-2 text-center text-sm font-semibold leading-tight text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-200 whitespace-normal disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Request Verification Review
                      </button>
                      <button
                        type="button"
                        onClick={refreshReviewStatus}
                        disabled={!superAgentPlan || isReviewBusy}
                        className="min-h-[3rem] min-w-[14rem] flex-1 rounded-full bg-cyan-100 px-4 py-2 text-center text-sm font-semibold leading-tight text-cyan-900 ring-1 ring-cyan-200 transition hover:bg-cyan-200 whitespace-normal disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Refresh Review Status
                      </button>
                      <button
                        type="button"
                        onClick={exportCaseSnapshot}
                        className="min-h-[3rem] min-w-[14rem] flex-1 rounded-full bg-teal-100/90 px-4 py-2 text-center text-sm font-semibold leading-tight text-[#041316] ring-1 ring-teal-700/30 transition hover:bg-teal-200 whitespace-normal"
                      >
                        Export Case Snapshot
                      </button>
                    </div>
                    <div className="flex w-full flex-wrap gap-3">
                      {(['plan', 'workspace', 'execution'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setSuperAgentTab(tab)}
                          className={`min-h-[3rem] min-w-[13rem] flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold leading-tight whitespace-normal transition ${
                            superAgentTab === tab
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-teal-50 text-[#041316] ring-1 ring-teal-700/25 hover:bg-teal-100'
                          }`}
                        >
                          {tab === 'plan' ? 'Plan & safety' : tab === 'workspace' ? 'Workspace & timeline' : 'Preview & execution'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Case ID</p>
                      <p className="mt-1 font-mono text-sm text-slate-900">{superAgentPlan.caseId}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last Plan Generated</p>
                      <p className="mt-1 text-sm text-slate-900">{investigationTimes.planGenerated?.toLocaleString() ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last Preview Run</p>
                      <p className="mt-1 text-sm text-slate-900">{investigationTimes.previewCompleted?.toLocaleString() ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Publishing safeguards</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {finalActionsBlockedUi ? 'On — checklist open' : 'Cleared for this session'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Final publish / anchor actions stay cautious until gates are checked.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Human review status</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{humanVerifierStatusLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {humanApprovalRequiredUi
                          ? 'Approval checklist has open items — you can still run previews and queue review.'
                          : 'Checklist complete for this session.'}
                      </p>
                    </div>
                  </div>

                  {loopNextRecommendedAction && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                      <span className="font-semibold">Loop next action:</span> {loopNextRecommendedAction}
                    </div>
                  )}

                  {(reviewError || reviewStatusUi.submitted) && (
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
                      {reviewError && <p className="font-semibold">{reviewError}</p>}
                      {reviewStatusUi.submitted && (
                        <div className="space-y-1">
                          {!gateApprovals.validator_submission && (
                            <p className="rounded-lg border border-amber-200 bg-amber-50/90 p-2 text-amber-950">
                              Validator submission gate was not checked — your case was still queued. Treat as{' '}
                              <span className="font-semibold">not verified yet</span> until a reviewer confirms.
                            </p>
                          )}
                          <p>
                            <span className="font-semibold">Reviewer status:</span> {reviewStatusUi.status ?? 'pending_review'}
                          </p>
                          <p>
                            <span className="font-semibold">Decision:</span> {reviewStatusUi.decision ?? 'Pending'}
                          </p>
                          <p>
                            <span className="font-semibold">Reviewed at:</span>{' '}
                            {reviewStatusUi.reviewedAt ? new Date(reviewStatusUi.reviewedAt).toLocaleString() : 'Not reviewed yet'}
                          </p>
                          <p>
                            <span className="font-semibold">human_verified:</span>{' '}
                            {reviewStatusUi.humanVerified ? 'true' : 'false — not verified yet'}
                          </p>
                          <p>
                            <span className="font-semibold">blockchain_anchored:</span>{' '}
                            {superAgentPlan.claimLabels.blockchain_anchored ? 'true' : 'false'}
                          </p>
                          {reviewStatusUi.reviewerNotes.length > 0 && (
                            <ul className="list-disc pl-5">
                              {reviewStatusUi.reviewerNotes.map((note, idx) => (
                                <li key={`${note.at ?? 'note'}-${idx}`}>
                                  {note.note || 'Note'} {note.reviewerId ? `(${note.reviewerId})` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {exportSnapshotJson && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Case snapshot JSON</p>
                      <textarea
                        readOnly
                        value={exportSnapshotJson}
                        rows={12}
                        className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900"
                      />
                    </div>
                  )}

                  {superAgentTab === 'plan' && (
                  <div ref={planSafetyPanelRef} className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Truth &amp; Claim Safety</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Labels describe provenance for this Dry Run plan. Inactive rows are not asserted. Human-verified and Blockchain-anchored are shown only when explicitly true.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plan limitations</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                          {superAgentPlan.limitations.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CLAIM_TRUTH_ROWS.map(({ key, label }) => {
                          const active = Boolean(superAgentPlan.claimLabels[key]);
                          const isPendingKey = key === 'pending_verification';
                          const isHuman = key === 'human_verified';
                          const isChain = key === 'blockchain_anchored';
                          let tone = 'border-slate-200 bg-white text-slate-500';
                          if (active) {
                            if (isPendingKey) tone = 'border-amber-300 bg-amber-50 text-amber-950';
                            else if (isHuman || isChain) tone = 'border-slate-300 bg-slate-100 text-slate-900';
                            else tone = 'border-slate-300 bg-slate-50 text-slate-900';
                          } else if (isHuman || isChain) {
                            tone = 'border-slate-200 bg-white text-slate-400';
                          }
                          let caption: string;
                          if (isHuman) caption = active ? 'Flagged true on plan — confirm independently' : 'Not asserted';
                          else if (isChain) caption = active ? 'Flagged true on plan — confirm on-chain' : 'Not asserted';
                          else if (isPendingKey) caption = active ? 'Pending verification' : 'Inactive';
                          else caption = active ? 'Indicated for Preview' : 'Inactive';
                          return (
                            <div key={key} className={`rounded-2xl border px-4 py-3 ${tone}`}>
                              <p className="text-sm font-semibold text-slate-900">{label}</p>
                              <p className="text-xs text-slate-600">{caption}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Human Approval Gates</h3>
                    <p className="mt-2 text-sm text-slate-700">
                      Check each gate before you treat outputs as publication-ready. You can still generate plans, run
                      Dry Run previews, attach evidence, export snapshots, and request reviewer queue while gates are
                      open — open items mean “not verified yet,” not a hard stop on analysis. Workflow previews run from
                      the Preview &amp; execution tab — Dry Run only; Pending live service adapter for live publishing.
                    </p>
                    <ul className="mt-4 space-y-4">
                      {HUMAN_APPROVAL_GATE_IDS.map((gateId) => {
                        const meta = APPROVAL_GATES[gateId];
                        return (
                          <li key={gateId} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <label className="flex cursor-pointer items-start gap-3">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900"
                                checked={Boolean(gateApprovals[gateId])}
                                onChange={(event) =>
                                  setGateApprovals((prev) => ({ ...prev, [gateId]: event.target.checked }))
                                }
                              />
                              <span>
                                <span className="font-semibold text-slate-900">{meta.name}</span>
                                <span className="mt-1 block text-sm text-slate-600">{meta.description}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {mappedExecutionPlan && mappedExecutionPlan.supportAgents.length > 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Support agents</p>
                      <p className="mt-2 text-sm text-slate-600">
                        These agents contribute artifacts, drafts, or review scaffolding and are not mapped to standalone Field OS workflows:{' '}
                        <span className="font-semibold text-slate-900">{mappedExecutionPlan.supportAgents.join(', ')}</span>
                      </p>
                    </div>
                  )}

                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Assigned agents</p>
                    <ul className="mt-4 space-y-2 text-slate-700">
                      {superAgentPlan.subAgentsNeeded.map((agent) => (
                        <li key={agent} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <span className="font-semibold text-slate-900">{agent.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="ml-2 text-sm text-slate-500">Assigned</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Planned steps</p>
                    <ol className="mt-4 space-y-3 text-slate-700">
                      {superAgentPlan.plannedSteps.map((step) => (
                        <li key={step.stepId} className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-semibold text-slate-900">{step.task}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs uppercase tracking-[0.2em] text-slate-600">{step.status}</span>
                          </div>
                          <p className="text-sm text-slate-500">Agent: {step.agent.replace(/([A-Z])/g, ' $1').trim()}</p>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {superAgentPlan.subAgentOutputs && superAgentPlan.subAgentOutputs.length > 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Sub-agent dry-run outputs</p>
                      <ul className="mt-4 space-y-4 text-slate-700">
                        {superAgentPlan.subAgentOutputs.map((output) => (
                          <li key={`${output.agentId}-${output.task}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-lg font-semibold text-slate-900">{output.name}</p>
                              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-800">
                                {output.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{output.task}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">Findings</p>
                            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                              {output.findings.map((finding) => (
                                <li key={finding}>{finding}</li>
                              ))}
                            </ul>
                            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">Artifacts</p>
                            <p className="text-sm text-slate-800">{output.artifacts.join(', ') || 'None'}</p>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm">
                              <span className="rounded-full bg-white px-3 py-1 text-slate-800">Confidence: {output.confidence}</span>
                              {output.needsHumanReview && (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">Needs human review</span>
                              )}
                            </div>
                            {output.limitations.length > 0 && (
                              <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">Limitations: </span>
                                {output.limitations.join(' ')}
                              </div>
                            )}
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {CLAIM_TRUTH_ROWS.map(({ key, label }) => {
                                const active = Boolean(output.claimLabels[key]);
                                const isHuman = key === 'human_verified';
                                const isChain = key === 'blockchain_anchored';
                                let tone = 'border-slate-200 bg-white text-slate-400';
                                if (active) {
                                  if (isHuman || isChain) tone = 'border-slate-300 bg-slate-100 text-slate-900';
                                  else if (key === 'pending_verification') tone = 'border-amber-200 bg-amber-50 text-amber-950';
                                  else tone = 'border-slate-300 bg-slate-50 text-slate-900';
                                }
                                let subCaption = active ? 'Indicated for Preview' : 'Inactive';
                                if (isHuman) subCaption = active ? 'Flagged true — confirm independently' : 'Not asserted';
                                if (isChain) subCaption = active ? 'Flagged true — confirm on-chain' : 'Not asserted';
                                if (key === 'pending_verification' && active) subCaption = 'Pending verification';
                                return (
                                  <div key={`${output.agentId}-${key}`} className={`rounded-xl border px-3 py-2 text-xs ${tone}`}>
                                    <span className="font-semibold">{label}</span>
                                    <span className="block text-[11px]">{subCaption}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  </div>
                  )}

                  {superAgentTab === 'workspace' && (
                  <div ref={workspaceTimelinePanelRef} className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Case Workspace</p>
                      <h3 className="text-xl font-semibold text-slate-900">Active investigation case</h3>
                      <p className="text-sm text-slate-600">{superAgentPlan.caseSummary}</p>
                    </div>
                    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Case ID</dt>
                        <dd className="mt-1 font-mono text-sm text-slate-900">{superAgentPlan.caseId}</dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">{workspaceStatusLabel}</dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Goal</dt>
                        <dd className="mt-1 text-sm text-slate-800">{superAgentPlan.goal}</dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</dt>
                        <dd className="mt-1 text-sm text-slate-800">{superAgentPlan.location?.trim() || 'Not provided'}</dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date range</dt>
                        <dd className="mt-1 text-sm text-slate-800">
                          {superAgentPlan.dateRange?.startDate || superAgentPlan.dateRange?.endDate
                            ? `${superAgentPlan.dateRange?.startDate ?? '…'} → ${superAgentPlan.dateRange?.endDate ?? '…'}`
                            : 'Not provided'}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow-linked agents</dt>
                        <dd className="mt-1 text-sm text-slate-800">
                          {workspacePresentation?.workflowAgents.join(', ') || 'None'}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Support agents</dt>
                        <dd className="mt-1 text-sm text-slate-800">
                          {(workspacePresentation?.supportAgents ?? []).length > 0
                            ? (workspacePresentation?.supportAgents ?? []).join(', ')
                            : 'None — all assigned agents map to Preview workflows or orchestration roles.'}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected artifacts</dt>
                        <dd className="mt-1 text-sm text-slate-800">
                          {workspacePresentation?.expectedArtifacts.join(', ') ||
                            superAgentPlan.expectedArtifacts.join(', ')}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required approvals</dt>
                        <dd className="mt-1 text-sm text-slate-800">
                          {superAgentPlan.humanApprovalCheckpoints.map((id) => APPROVAL_GATES[id]?.name ?? id).join('; ')}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">finalActionsBlocked</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">{finalActionsBlockedUi ? 'true' : 'false'}</dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next recommended action</dt>
                        <dd className="mt-1 text-sm text-slate-800">{superAgentPlan.nextRecommendedAction}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="border-b border-slate-200 pb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Evidence Timeline</p>
                      <h3 className="mt-1 text-xl font-semibold text-slate-900">Investigation narrative (Preview)</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Derived from this session&apos;s Dry Run data — Pending live service adapter for externally sourced evidence feeds.
                      </p>
                    </div>
                    <ol className="relative mt-6 border-l border-slate-200 pl-6">
                      {timelineEntries.map((entry) => (
                        <li key={entry.id} className="mb-8 ml-1 last:mb-0">
                          <span
                            className={`absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full border-2 border-white ring-2 ${
                              entry.tone === 'attention'
                                ? 'bg-amber-500 ring-amber-100'
                                : entry.tone === 'positive'
                                ? 'bg-slate-700 ring-slate-200'
                                : 'bg-slate-400 ring-slate-100'
                            }`}
                          />
                          <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                          {entry.at && (
                            <p className="text-xs text-slate-500">{entry.at.toLocaleString()}</p>
                          )}
                          <p className="mt-2 text-sm text-slate-700">{entry.detail}</p>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                      Run a workflow Preview from the Preview &amp; execution tab to append bridge timestamps to this timeline.
                    </p>
                  </div>
                  </div>
                  )}

                  {superAgentTab === 'execution' && (
                  <div ref={previewExecutionPanelRef} className="space-y-6">
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={runPlannedWorkflow}
                      disabled={isPlanExecutionRunning}
                      className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      Run workflow Preview
                    </button>
                    <span className="text-sm text-slate-500">
                      Dry Run workflow Preview — Pending live service adapter. Checking every Human Approval Gate clears final-action blocks in bridge results.
                    </span>
                    {isPlanExecutionRunning && (
                      <p className="text-sm text-slate-600">Executing mapped workflows…</p>
                    )}
                  </div>

                  {planExecutionError && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{planExecutionError}</div>
                  )}

                  {planExecutionResult && (
                    <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Plan Execution</p>
                        <h3 className="text-2xl font-semibold text-slate-900">Execution Results</h3>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Mapped workflows</p>
                          <ul className="mt-3 space-y-2 text-slate-700">
                            {planExecutionResult.plan.mappedWorkflowIds.map((workflowId) => (
                              <li key={workflowId} className="rounded-2xl bg-white p-3 text-sm text-slate-700">{workflowId}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Pending adapters</p>
                          <p className="mt-2 text-slate-700">{planExecutionResult.plan.pendingAdapters.join(', ')}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Execution status</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {planExecutionResult.status === 'needs_human_approval'
                            ? 'Needs human approval (final actions gated)'
                            : planExecutionResult.status === 'partial'
                            ? 'Partial success'
                            : planExecutionResult.status === 'failed'
                            ? 'Failed'
                            : 'Success'}
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                          <li>
                            <span className="font-semibold text-slate-800">Dry-run preview:</span>{' '}
                            {planExecutionResult.dryRunPreviewCompleted ? 'Completed without failures.' : 'Review workflow statuses below.'}
                          </li>
                          <li>
                            <span className="font-semibold text-slate-800">Final actions blocked:</span>{' '}
                            {finalActionsBlockedUi ? 'Yes — confirm Human Approval Gates.' : 'No — all gates confirmed for this session.'}
                          </li>
                          <li>
                            <span className="font-semibold text-slate-800">humanApprovalRequired:</span>{' '}
                            {planExecutionResult.humanApprovalRequired ? 'true' : 'false'}
                          </li>
                          <li>
                            <span className="font-semibold text-slate-800">Required approvals (checklist ids):</span>{' '}
                            {planExecutionResult.plan.requiredApprovals.join(', ') || 'None'}
                          </li>
                          <li>
                            <span className="font-semibold text-slate-800">Blocked final actions:</span>{' '}
                            {planExecutionResult.blockedFinalActions.length > 0
                              ? planExecutionResult.blockedFinalActions.join('; ')
                              : 'None — gates cleared.'}
                          </li>
                          <li>
                            <span className="font-semibold text-slate-800">Pending adapters:</span>{' '}
                            {planExecutionResult.plan.pendingAdapters.join(', ')}
                          </li>
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Dry-run preview steps</p>
                        <ul className="mt-3 space-y-2 text-slate-700">
                          {planExecutionResult.previewSteps.map((step) => (
                            <li key={step.workflowId} className="rounded-2xl bg-white p-3">
                              <p className="font-semibold text-slate-900">{step.workflowName}</p>
                              <p className="text-sm text-slate-500">
                                {step.workflowId} · {step.status.replace(/_/g, ' ')}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Execution steps</p>
                        <ul className="mt-3 space-y-2 text-slate-700">
                          {planExecutionResult.plan.executionSequence.map((item) => (
                            <li key={item.workflowId} className="rounded-2xl bg-white p-3">
                              <p className="font-semibold text-slate-900">{item.workflowId}</p>
                              <p className="text-sm text-slate-500">Position: {item.position + 1}</p>
                              <p className="text-xs text-slate-500">
                                selectedDateRange:{' '}
                                {item.inputs?.selectedDateRange
                                  ? JSON.stringify(item.inputs.selectedDateRange)
                                  : item.inputs?.dateRange
                                  ? JSON.stringify(item.inputs.dateRange)
                                  : 'unspecified'}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Artifacts</p>
                        <ul className="mt-3 space-y-2 text-slate-700">
                          {planExecutionResult.allArtifacts.map((artifact) => (
                            <li key={artifact.id} className="rounded-2xl bg-slate-50 p-3">
                              <p className="font-semibold text-slate-900">{artifact.type}</p>
                              <p className="text-sm text-slate-500">{artifact.id}</p>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Next recommended action</p>
                        <p className="mt-2 text-slate-700">{planExecutionResult.plan.nextRecommendedAction}</p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <div className="border-b border-slate-200 pb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Execution Trace</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">Preview instrumentation</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Dry Run and Pending live service adapter modes only in this build — no Live execution rows unless adapters are connected.
                      </p>
                    </div>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="min-w-full text-left text-sm text-slate-800">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Step name</th>
                            <th className="px-4 py-3 font-semibold">Agent / workflow</th>
                            <th className="px-4 py-3 font-semibold">Mode</th>
                            <th className="px-4 py-3 font-semibold">Timestamp</th>
                            <th className="px-4 py-3 font-semibold">Output summary</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {executionTraceRows.map((row) => (
                            <tr key={row.id} className="bg-white">
                              <td className="px-4 py-3 align-top font-medium text-slate-900">{row.stepName}</td>
                              <td className="px-4 py-3 align-top text-slate-700">{row.actor}</td>
                              <td className="px-4 py-3 align-top text-slate-700">{row.mode}</td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500">{row.timestamp?.toLocaleString() ?? '—'}</td>
                              <td className="max-w-md px-4 py-3 align-top text-xs leading-relaxed text-slate-600">{row.outputSummary}</td>
                              <td className="px-4 py-3 align-top text-xs font-semibold uppercase tracking-wide text-slate-700">{row.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {planExecutionResult && (
                      <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-800">Raw Preview log</summary>
                        <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{planExecutionResult.executionTrace}</pre>
                      </details>
                    )}
                  </div>
                </div>
                  )}
                </div>
              )}
            </section>

            <div className="grid gap-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold text-slate-900">{workflow.name}</h3>
                      <p className="text-slate-600">{workflow.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        {workflow.defaultConfidence.charAt(0).toUpperCase() + workflow.defaultConfidence.slice(1)} confidence
                      </span>
                      {workflow.dryRun && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                          Dry Run
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Tools used</h4>
                      <p className="mt-2 text-slate-700">{workflow.toolsUsed.join(', ')}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Expected artifacts</h4>
                      <p className="mt-2 text-slate-700">{workflow.expectedArtifacts.join(', ')}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startWorkflow(workflow.id)}
                      className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Start Agentic Workflow
                    </button>
                    <span className="text-sm text-slate-500">Uses safe dry-run mode until live adapters are available.</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Execution panel</h2>
              <p className="mt-3 text-slate-600">
                Level 2 workflows run sequentially as Dry Run Previews — Pending live service adapter until production connectors are configured.
              </p>
              {isRunning && (
                <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">Workflow Preview running — Dry Run.</p>
              )}
              {!execution && !isRunning && (
                <p className="mt-4 text-slate-600">Select a workflow to simulate progress and see the agentic execution result.</p>
              )}
            </div>

            {error && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</div>
            )}

            {execution && (
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Execution</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">{execution.workflowName}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusPillStyles[execution.status] || statusPillStyles.pending}`}>
                    {execution.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {execution.dryRunLabel && (
                  <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{execution.dryRunLabel}</div>
                )}

                <div className="grid gap-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Timeline</p>
                    <p className="mt-2 text-sm text-slate-700">Started {execution.startedAt.toLocaleString()}</p>
                    <p className="text-sm text-slate-700">Completed {execution.completedAt?.toLocaleString()}</p>
                  </div>

                  <div className="space-y-3">
                    {execution.steps.map((step) => (
                      <div key={step.stepId} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">{step.name}</p>
                            <p className="text-sm text-slate-500">{step.stepId}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusPillStyles[step.status] || statusPillStyles.pending}`}>
                            {step.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {step.output && (
                          <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-100">
                            {JSON.stringify(step.output, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Generated artifacts</p>
                    <ul className="mt-3 space-y-3 text-slate-700">
                      {execution.artifacts.map((artifact) => (
                        <li key={artifact.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="font-semibold text-slate-900">{artifact.type}</p>
                          <p className="text-sm text-slate-500">{artifact.id}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Next recommended action</p>
                    <p className="mt-3 text-slate-700">{execution.nextRecommendedAction}</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default DpalFieldOSPage;
