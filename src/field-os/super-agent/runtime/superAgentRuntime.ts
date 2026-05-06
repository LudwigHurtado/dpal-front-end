// src/field-os/super-agent/runtime/superAgentRuntime.ts
//
// TODO(backend persistence): mirror CaseWorkspace + ExecutionTraceService to API;
// load/save by caseId so Super Agent Loop survives reload and multi-device review.

import { SuperAgentGoalInput, SuperAgentPlan } from '../superAgentTypes';
import { DpalLeadAgent } from '../DpalLeadAgent';
import { CaseWorkspace, CaseWorkspaceState } from './caseWorkspace';
import { HumanApprovalGate } from './humanApprovalGate';
import { ExecutionTraceService, ExecutionTrace } from './executionTraceService';
import {
  PlanExecutionBridge,
  MappedExecutionPlan,
  ExecutionBridgeResult,
} from './planExecutionBridge';

export interface SuperAgentRuntimeConfig {
  dryRunMode?: boolean;
  autoApproveGates?: boolean;
}

/** Structured completion assessment for the Super Agent Loop (Dry Run / Preview scope). */
export interface SuperAgentCompletionStatus {
  caseId: string;
  planComplete: boolean;
  previewRun: boolean;
  evidenceSufficient: boolean;
  approvalsCleared: boolean;
  finalActionsBlocked: boolean;
  missingInputs: string[];
  pendingAdapters: string[];
  nextRecommendedAction: string;
  loopShouldContinue: boolean;
}

export interface SuperAgentRuntimeExport {
  currentPlan: SuperAgentPlan | null;
  currentCaseWorkspace: CaseWorkspaceState | null;
  evidenceTimeline: Array<{ timestamp: Date; event: string; source: string }>;
  executionTraces: ExecutionTrace[];
  completionStatus: SuperAgentCompletionStatus;
  approvalStatus: Record<string, any>;
  finalActionsBlocked: boolean;
  humanApprovalRequired: boolean;
  /** Present only when no investigation plan exists yet. */
  planExportReason?: string;
}

export class SuperAgentRuntime {
  private leadAgent: DpalLeadAgent;
  private planBridge: PlanExecutionBridge;
  private caseWorkspace: CaseWorkspace | null = null;
  private approvalGate: HumanApprovalGate | null = null;
  private traceService: ExecutionTraceService;
  private config: SuperAgentRuntimeConfig;
  private currentPlan: SuperAgentPlan | null = null;
  private mappedExecutionPlan: MappedExecutionPlan | null = null;
  private lastPreviewResult: ExecutionBridgeResult | null = null;
  private lastGoalInput: SuperAgentGoalInput | null = null;

  constructor(config: SuperAgentRuntimeConfig = {}) {
    this.leadAgent = new DpalLeadAgent();
    this.planBridge = new PlanExecutionBridge();
    this.traceService = new ExecutionTraceService();
    this.config = {
      dryRunMode: config.dryRunMode ?? true,
      autoApproveGates: config.autoApproveGates ?? false,
    };
  }

  /**
   * Goal → completion promise (SuperAgentPlan) → CaseWorkspace + gates + traces + timeline.
   * Mirrors DpalFieldOSPage Super Agent plan generation (Dry Run).
   */
  async createInvestigationPlan(input: SuperAgentGoalInput): Promise<SuperAgentPlan> {
    this.lastGoalInput = { ...input };
    this.lastPreviewResult = null;
    this.mappedExecutionPlan = null;

    const evidenceRefs = input.evidenceRefs ?? [];

    const plan = await this.leadAgent.generatePlan(input);
    const mappedPlan = this.planBridge.mapPlanToWorkflows(plan);

    this.currentPlan = plan;
    this.mappedExecutionPlan = mappedPlan;

    const ws = new CaseWorkspace(plan);
    ws.hydrateAfterPlanGeneration(plan, mappedPlan, evidenceRefs);
    this.caseWorkspace = ws;

    this.approvalGate = new HumanApprovalGate(plan.humanApprovalCheckpoints);

    const cid = plan.caseId;

    this.traceService.recordTrace(
      'User',
      'User goal received — Preview',
      'SuperAgentForm',
      'dry-run',
      {
        goal: input.goal,
        location: input.location,
        dateRange: input.dateRange,
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

    const promisePayload = {
      caseId: plan.caseId,
      goal: plan.goal,
      requiredInputs: plan.requiredInputs,
      selectedAgents: plan.subAgentsNeeded,
      plannedSteps: plan.plannedSteps.length,
      expectedArtifacts: plan.expectedArtifacts,
      limitations: plan.limitations,
      claimLabels: plan.claimLabels,
      approvalCheckpoints: plan.humanApprovalCheckpoints,
      nextRecommendedAction: plan.nextRecommendedAction,
    };

    this.traceService.recordTrace(
      'SuperAgentRuntime',
      'Completion promise created — Preview (plan acceptance criteria)',
      'SuperAgentRuntime',
      'dry-run',
      promisePayload,
      `Steps: ${plan.plannedSteps.length}; artifacts: ${plan.expectedArtifacts.length}; checkpoints: ${plan.humanApprovalCheckpoints.length}`,
      'success',
      cid
    );
    ws.addEvidenceTimelineEvent(
      'Completion promise recorded — Dry Run',
      `Acceptance criteria captured for case ${cid} (not verified until human_verified is true; chain claims require blockchain_anchored).`
    );

    this.traceService.recordTrace(
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

    this.traceService.recordTrace(
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

    this.traceService.recordTrace(
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

    this.traceService.recordTrace(
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
      `human_verified=${plan.claimLabels.human_verified === true}; blockchain_anchored=${plan.claimLabels.blockchain_anchored === true}; pending_verification=${plan.claimLabels.pending_verification === true}.`
    );

    this.traceService.recordTrace(
      'HumanApprovalGate',
      'Human approval gates initialized — Preview',
      'humanApprovalGate',
      'dry-run',
      plan.humanApprovalCheckpoints,
      `${plan.humanApprovalCheckpoints.length} checkpoint(s); Human approval required before final actions.`,
      'pending',
      cid
    );
    ws.addEvidenceTimelineEvent(
      'Human approval gates initialized',
      `${plan.humanApprovalCheckpoints.length} checkpoints pending explicit confirmation.`
    );

    this.syncCaseWorkspaceGates();

    return plan;
  }

  /**
   * Safe Dry Run workflow Preview only (PlanExecutionBridge + workflowRunner).
   * Updates CaseWorkspace via ingestWorkflowPreviewRun and appends traces (matches Field OS page).
   */
  async runPlannedWorkflowPreview(options?: {
    gateApprovals?: Record<string, boolean>;
  }): Promise<ExecutionBridgeResult> {
    if (!this.config.dryRunMode) {
      throw new Error('SuperAgentRuntime is configured for Dry Run Preview only; live execution is not enabled here.');
    }
    if (!this.currentPlan || !this.caseWorkspace || !this.mappedExecutionPlan) {
      throw new Error('No completion promise loaded — call createInvestigationPlan before runPlannedWorkflowPreview.');
    }

    const gateApprovals = options?.gateApprovals ?? this.gateApprovalsFromRuntime();

    const result = await this.planBridge.executePlannedWorkflows(
      this.currentPlan,
      this.mappedExecutionPlan,
      { gateApprovals }
    );

    this.lastPreviewResult = result;

    const ws = this.caseWorkspace;
    const cid = this.currentPlan.caseId;

    ws.ingestWorkflowPreviewRun(result, gateApprovals);

    this.traceService.recordTrace(
      'PlanExecutionBridge',
      'Plan mapped to registered workflows — Preview',
      'PlanExecutionBridge',
      'dry-run',
      this.mappedExecutionPlan.mappedWorkflowIds,
      result.plan.mappedWorkflowIds.join(', ') || 'none',
      'success',
      cid
    );

    this.traceService.recordTrace(
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
      this.traceService.recordTrace(
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
            : step.status === 'pending' || step.status === 'running' || step.status === 'needs_human_review'
              ? 'pending'
              : 'success';
        this.traceService.recordTrace(
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

    this.traceService.recordTrace(
      'AdapterRegistry',
      'Pending live adapters recorded — Preview',
      'AdapterRegistry',
      'pending-adapter',
      result.plan.pendingAdapters,
      result.plan.pendingAdapters.join('; ') || 'none listed',
      'pending',
      cid
    );

    this.traceService.recordTrace(
      'HumanApprovalGate',
      'Human approval status evaluated — Preview',
      'humanApprovalGate',
      'dry-run',
      gateApprovals,
      `humanApprovalRequired=${result.humanApprovalRequired}`,
      'success',
      cid
    );

    this.traceService.recordTrace(
      'PlanExecutionBridge',
      result.finalActionsBlocked ? 'Final actions blocked — Human approval required' : 'Final actions cleared (preview scope)',
      'PlanExecutionBridge',
      'dry-run',
      result.blockedFinalActions,
      result.executionTrace,
      result.finalActionsBlocked ? 'pending' : 'success',
      cid
    );

    ws.syncGateEvaluationFromUi(gateApprovals, result);

    return result;
  }

  /** Assess loop state: inputs, Preview run, evidence, approvals (Dry Run semantics). */
  checkCompletionStatus(): SuperAgentCompletionStatus {
    if (!this.currentPlan || !this.caseWorkspace) {
      return {
        caseId: '',
        planComplete: false,
        previewRun: false,
        evidenceSufficient: false,
        approvalsCleared: false,
        finalActionsBlocked: true,
        missingInputs: ['goal'],
        pendingAdapters: [],
        nextRecommendedAction: 'Call createInvestigationPlan with a clear goal — Preview / Dry Run only.',
        loopShouldContinue: true,
      };
    }

    this.syncCaseWorkspaceGates();

    const plan = this.currentPlan;
    const ws = this.caseWorkspace.getState();
    const caseId = plan.caseId;
    const missingInputs = this.computeMissingInputs();
    const planComplete = missingInputs.length === 0;

    const previewRun = this.lastPreviewResult !== null;
    const previewHealthy =
      previewRun &&
      this.lastPreviewResult!.status !== 'failed' &&
      this.lastPreviewResult!.dryRunPreviewCompleted;

    const gateMap = this.gateApprovalsFromRuntime();
    const approvalsCleared = plan.humanApprovalCheckpoints.every((id) => gateMap[id] === true);

    const evidenceRefsCount = this.lastGoalInput?.evidenceRefs?.length ?? 0;
    const evidenceSufficient = evidenceRefsCount > 0 || previewHealthy;

    const pendingAdapters = [...ws.pendingAdapters];

    let loopShouldContinue = true;
    let nextRecommendedAction = plan.nextRecommendedAction;

    if (!planComplete) {
      nextRecommendedAction = `Provide missing inputs for the completion promise: ${missingInputs.join(', ')} (Preview only).`;
    } else if (!previewRun) {
      nextRecommendedAction =
        'Run workflow Preview (Dry Run) via runPlannedWorkflowPreview() — Pending live service adapter for live feeds.';
    } else if (!previewHealthy) {
      nextRecommendedAction =
        'Review workflow Preview results — failures or incomplete Dry Run; Pending live service adapter may apply. Not verified unless human_verified is true.';
    } else if (!approvalsCleared) {
      nextRecommendedAction =
        'Human approval required — confirm all checkpoints in HumanApprovalGate before final actions (still Preview until live adapters).';
    } else {
      loopShouldContinue = false;
      nextRecommendedAction =
        'Dry Run path complete; approvals cleared for this session — final actions may proceed only when explicitly approved and live services are connected (not simulated here).';
      if (pendingAdapters.length > 0) {
        nextRecommendedAction += ` Pending live service adapter (informational): ${pendingAdapters.join('; ')}.`;
      }
    }

    const finalActionsBlocked = ws.finalActionsBlocked;
    const humanApprovalRequired = ws.humanApprovalRequired;

    return {
      caseId,
      planComplete,
      previewRun,
      evidenceSufficient,
      approvalsCleared,
      finalActionsBlocked,
      missingInputs,
      pendingAdapters,
      nextRecommendedAction,
      loopShouldContinue,
    };
  }

  /**
   * Loop heartbeat: records completion assessment without erasing memory of prior previews or traces.
   */
  continueLoop(): SuperAgentCompletionStatus {
    const completion = this.checkCompletionStatus();
    const cid = completion.caseId || undefined;

    this.traceService.recordTrace(
      'SuperAgentRuntime',
      'Super Agent loop — completion check (Dry Run)',
      'SuperAgentRuntime',
      'dry-run',
      {
        planComplete: completion.planComplete,
        previewRun: completion.previewRun,
        approvalsCleared: completion.approvalsCleared,
        loopShouldContinue: completion.loopShouldContinue,
      },
      completion.nextRecommendedAction,
      'success',
      cid
    );

    if (this.caseWorkspace && completion.caseId) {
      this.caseWorkspace.addEvidenceTimelineEvent(
        'Super Agent loop — completion check (Dry Run)',
        `${completion.loopShouldContinue ? 'Continue' : 'Ready for next phase'}: ${completion.nextRecommendedAction}`
      );
    }

    return completion;
  }

  getCaseWorkspace(): CaseWorkspaceState | null {
    return this.caseWorkspace?.getState() ?? null;
  }

  getExecutionTrace(): string {
    return this.traceService.export();
  }

  requestApproval(gateName: string): { approved: boolean; canProceed: boolean; message: string } {
    if (!this.approvalGate) {
      return {
        approved: false,
        canProceed: false,
        message: 'No investigation plan created yet.',
      };
    }

    const status = this.approvalGate.getStatus(gateName);
    if (!status) {
      return {
        approved: false,
        canProceed: false,
        message: `Approval gate "${gateName}" not found.`,
      };
    }

    if (this.config.autoApproveGates && !status.approved) {
      this.approvalGate.approve(gateName, 'auto-approval', 'Automatically approved in demo mode.');
      this.caseWorkspace?.approveGate(gateName, 'auto-approval');
      this.syncCaseWorkspaceGates();
      return {
        approved: true,
        canProceed: true,
        message: `"${gateName}" approved automatically.`,
      };
    }

    return {
      approved: status.approved,
      canProceed: status.approved,
      message: status.approved ? `"${gateName}" is approved.` : `"${gateName}" requires human approval.`,
    };
  }

  approveGate(gateName: string, reviewedBy: string, notes?: string): boolean {
    if (!this.approvalGate) return false;
    const ok = this.approvalGate.approve(gateName, reviewedBy, notes);
    if (ok && this.caseWorkspace) {
      this.caseWorkspace.approveGate(gateName, reviewedBy);
      this.syncCaseWorkspaceGates();
    }
    return ok;
  }

  getApprovalStatus(): Record<string, any> {
    if (!this.approvalGate) return {};
    return this.approvalGate.getAll();
  }

  export(): SuperAgentRuntimeExport {
    const completion = this.checkCompletionStatus();

    if (!this.currentPlan) {
      return {
        currentPlan: null,
        currentCaseWorkspace: this.caseWorkspace?.getState() ?? null,
        evidenceTimeline: [],
        executionTraces: [],
        completionStatus: completion,
        approvalStatus: this.getApprovalStatus(),
        finalActionsBlocked: completion.finalActionsBlocked,
        humanApprovalRequired: completion.finalActionsBlocked,
        planExportReason: 'No investigation plan has been created yet.',
      };
    }

    const caseId = this.currentPlan.caseId;
    const ws = this.caseWorkspace?.getState() ?? null;

    return {
      currentPlan: this.currentPlan,
      currentCaseWorkspace: ws,
      evidenceTimeline: ws?.evidenceTimeline ?? [],
      executionTraces: this.traceService.getTracesForCase(caseId),
      completionStatus: completion,
      approvalStatus: this.getApprovalStatus(),
      finalActionsBlocked: completion.finalActionsBlocked,
      humanApprovalRequired: ws?.humanApprovalRequired ?? completion.finalActionsBlocked,
    };
  }

  private gateApprovalsFromRuntime(): Record<string, boolean> {
    if (!this.approvalGate || !this.currentPlan) return {};
    const all = this.approvalGate.getAll();
    const out: Record<string, boolean> = {};
    for (const id of this.currentPlan.humanApprovalCheckpoints) {
      out[id] = all[id]?.approved === true;
    }
    return out;
  }

  private syncCaseWorkspaceGates(): void {
    if (!this.caseWorkspace) return;
    this.caseWorkspace.syncGateEvaluationFromUi(this.gateApprovalsFromRuntime(), this.lastPreviewResult);
  }

  private computeMissingInputs(): string[] {
    if (!this.currentPlan || !this.lastGoalInput) {
      return ['goal'];
    }
    const missing: string[] = [];
    for (const field of this.currentPlan.requiredInputs) {
      if (field === 'goal' && !this.lastGoalInput.goal?.trim()) {
        missing.push('goal');
      }
      if (field === 'location' && !this.lastGoalInput.location?.trim()) {
        missing.push('location');
      }
      if (field === 'dateRange') {
        const dr = this.lastGoalInput.dateRange;
        if (!dr?.startDate?.trim() || !dr?.endDate?.trim()) {
          missing.push('dateRange');
        }
      }
      if (field === 'evidenceRefs' && !(this.lastGoalInput.evidenceRefs?.length)) {
        missing.push('evidenceRefs');
      }
    }
    return missing;
  }
}
