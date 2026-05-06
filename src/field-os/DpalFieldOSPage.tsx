// src/field-os/DpalFieldOSPage.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const runner = new WorkflowRunner();

const HUMAN_APPROVAL_GATE_IDS = [
  'final_report_publication',
  'public_qr_publication',
  'blockchain_anchoring',
  'validator_submission',
  'legal_packet_export',
  'viu_draft_issuance',
] as const;

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

  const caseWorkspaceRef = useRef<CaseWorkspace | null>(null);
  const executionTraceRef = useRef<ExecutionTraceService | null>(null);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-8">
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

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Super Agent Mode</h2>
                  <p className="mt-3 text-slate-600">
                    Let DPAL decide which agents and tools are needed from a natural-language investigation goal.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                  Goal-driven planning
                </span>
              </div>

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
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
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
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
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
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
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
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
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
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
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
                <div className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Investigation workspace</p>
                      <h3 className="mt-1 text-xl font-semibold text-slate-900">Super Agent output</h3>
                      <p className="mt-1 max-w-2xl text-sm text-slate-600">
                        Preview and Dry Run only — Pending live service adapter for production connectors. “Verified” language applies only when Human-verified is explicitly true on the plan.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(['plan', 'workspace', 'execution'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setSuperAgentTab(tab)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            superAgentTab === tab
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {tab === 'plan' ? 'Plan & safety' : tab === 'workspace' ? 'Workspace & timeline' : 'Preview & execution'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {superAgentTab === 'plan' && (
                  <div className="space-y-6">
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
                      Final accountability actions stay blocked until each gate is explicitly confirmed for this case. Workflow previews run from the Preview &amp; execution tab — Dry Run only; Pending live service adapter for live publishing.
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
                  <div className="space-y-6">
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
                  <div className="space-y-6">
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
