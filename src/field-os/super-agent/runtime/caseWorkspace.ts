// src/field-os/super-agent/runtime/caseWorkspace.ts
//
// TODO(backend persistence): hydrate CaseWorkspaceState from API / IndexedDB by caseId;
// replace in-memory refs in DpalFieldOSPage with repository.load(caseId) / repository.save(state).

import { SuperAgentPlan, SubAgentOutput } from '../superAgentTypes';
import type { MappedExecutionPlan, ExecutionBridgeResult } from './planExecutionBridge';

export interface PreviewExecutionSnapshot {
  bridgeStatus: string;
  completedAt: Date;
  workflowSummaries: Array<{ workflowId: string; status: string }>;
  executionTraceText: string;
  dryRunPreviewCompleted: boolean;
}

export interface CaseWorkspaceState {
  caseId: string;
  goal: string;
  location?: string;
  dateRange?: { startDate?: string; endDate?: string };
  inputs: Record<string, any>;
  evidence: Record<string, any>;
  subAgentNotes: string[];
  artifacts: Array<{ type: string; id: string; data: any }>;
  evidenceTimeline: Array<{ timestamp: Date; event: string; source: string }>;
  approvalGates: Record<string, { required: boolean; approved: boolean; reviewedBy?: string; timestamp?: Date }>;
  finalRecommendation: string;
  createdAt: Date;
  updatedAt: Date;

  /** User-supplied evidence pointers captured at plan generation. */
  evidenceRefs: string[];
  selectedAgents: string[];
  supportAgents: string[];
  expectedArtifacts: string[];
  limitations: string[];
  claimLabels: Record<string, boolean>;
  humanApprovalCheckpointIds: string[];
  mappedWorkflowIds: string[];
  pendingAdapters: string[];
  finalActionsBlocked: boolean;
  humanApprovalRequired: boolean;
  subAgentDryRunOutputs: SubAgentOutput[];
  previewExecutionSnapshot?: PreviewExecutionSnapshot;
}

export class CaseWorkspace {
  private state: CaseWorkspaceState;

  constructor(plan: SuperAgentPlan) {
    const now = new Date();
    this.state = {
      caseId: plan.caseId,
      goal: plan.goal,
      location: plan.location,
      dateRange: plan.dateRange,
      inputs: {},
      evidence: {},
      subAgentNotes: [],
      artifacts: [],
      evidenceTimeline: [],
      approvalGates: plan.humanApprovalCheckpoints.reduce(
        (acc, checkpoint) => ({
          ...acc,
          [checkpoint]: { required: true, approved: false },
        }),
        {}
      ),
      finalRecommendation: plan.nextRecommendedAction,
      createdAt: now,
      updatedAt: now,

      evidenceRefs: [],
      selectedAgents: [...plan.subAgentsNeeded],
      supportAgents: [],
      expectedArtifacts: [...plan.expectedArtifacts],
      limitations: [...plan.limitations],
      claimLabels: { ...plan.claimLabels },
      humanApprovalCheckpointIds: [...plan.humanApprovalCheckpoints],
      mappedWorkflowIds: [],
      pendingAdapters: [],
      finalActionsBlocked: plan.humanApprovalCheckpoints.length > 0,
      humanApprovalRequired: plan.humanApprovalCheckpoints.length > 0,
      subAgentDryRunOutputs: plan.subAgentOutputs ? [...plan.subAgentOutputs] : [],
      previewExecutionSnapshot: undefined,
    };
  }

  getState(): CaseWorkspaceState {
    return this.state;
  }

  /**
   * Persist Super Agent plan + bridge mapping into workspace state (in-memory until backend lands).
   */
  hydrateAfterPlanGeneration(plan: SuperAgentPlan, mapped: MappedExecutionPlan, evidenceRefs: string[]): void {
    this.state.evidenceRefs = [...evidenceRefs];
    this.state.selectedAgents = [...plan.subAgentsNeeded];
    this.state.supportAgents = [...mapped.supportAgents];
    this.state.expectedArtifacts = [...mapped.expectedArtifacts];
    this.state.limitations = [...plan.limitations];
    this.state.claimLabels = { ...plan.claimLabels };
    this.state.humanApprovalCheckpointIds = [...plan.humanApprovalCheckpoints];
    this.state.mappedWorkflowIds = [...mapped.mappedWorkflowIds];
    this.state.pendingAdapters = [...mapped.pendingAdapters];
    this.state.subAgentDryRunOutputs = plan.subAgentOutputs ? [...plan.subAgentOutputs] : [];
    this.state.inputs = {
      ...this.state.inputs,
      evidenceRefs,
      mappedWorkflowIds: mapped.mappedWorkflowIds,
      supportAgents: mapped.supportAgents,
    };
    this.state.updatedAt = new Date();
  }

  /**
   * After a workflow Preview run: merge bridge outputs + append evidence timeline milestones.
   */
  ingestWorkflowPreviewRun(result: ExecutionBridgeResult, gateApprovals: Record<string, boolean>): void {
    const plan = result.plan;
    this.state.mappedWorkflowIds = [...plan.mappedWorkflowIds];
    this.state.pendingAdapters = [...plan.pendingAdapters];
    this.state.expectedArtifacts = [...plan.expectedArtifacts];
    this.state.finalActionsBlocked = result.finalActionsBlocked;
    this.state.humanApprovalRequired = result.humanApprovalRequired;
    this.state.previewExecutionSnapshot = {
      bridgeStatus: result.status,
      completedAt: new Date(),
      workflowSummaries: result.workflowResults.map((w) => ({ workflowId: w.workflowId, status: w.status })),
      executionTraceText: result.executionTrace,
      dryRunPreviewCompleted: result.dryRunPreviewCompleted,
    };
    this.state.inputs.lastBridgePreviewStatus = result.status;
    this.state.inputs.lastGateApprovalsSnapshot = { ...gateApprovals };

    this.addEvidenceTimelineEvent(
      'Plan mapped to registered workflows — Preview',
      plan.mappedWorkflowIds.join(', ') || 'None mapped.'
    );

    this.addEvidenceTimelineEvent(
      'Workflow preview started — Dry Run',
      `${result.previewSteps.length} preview step(s) queued.`
    );

    result.workflowResults.forEach((wf) => {
      const tail = wf.dryRunLabel ?? wf.nextRecommendedAction ?? wf.status;
      this.addEvidenceTimelineEvent(
        wf.status === 'failed'
          ? `Workflow preview failed — ${wf.workflowName}`
          : `Workflow preview completed — ${wf.workflowName}`,
        `${wf.workflowId}: ${tail}`
      );
    });

    this.addEvidenceTimelineEvent(
      'Pending live service adapters recorded — Preview',
      plan.pendingAdapters.join('; ') || 'None listed.'
    );

    const totalGates = plan.requiredApprovals.length;
    const clearedGates = plan.requiredApprovals.filter((id) => gateApprovals[id]).length;
    this.addEvidenceTimelineEvent(
      'Human approval status evaluated — Preview',
      `humanApprovalRequired=${result.humanApprovalRequired}; checklist ${clearedGates}/${totalGates} acknowledged in UI (Dry Run — not third-party verified).`
    );

    this.addEvidenceTimelineEvent(
      result.finalActionsBlocked ? 'Final actions blocked — approvals pending' : 'Final actions cleared (preview scope)',
      result.finalActionsBlocked
        ? result.blockedFinalActions.join('; ') || 'Awaiting gate confirmations.'
        : 'Dry Run — no live publication or anchoring performed.'
    );

    this.state.updatedAt = new Date();
  }

  /**
   * Keeps finalActionsBlocked / humanApprovalRequired aligned when reviewers toggle checklist without re-running Preview.
   * Always derives from current UI gate checkboxes vs required checkpoints (Preview snapshot alone would go stale).
   */
  syncGateEvaluationFromUi(gateApprovals: Record<string, boolean>, _bridgeResult: ExecutionBridgeResult | null): void {
    const required = this.state.humanApprovalCheckpointIds;
    const blocked = required.length > 0 && !required.every((id) => gateApprovals[id] === true);
    this.state.finalActionsBlocked = blocked;
    this.state.humanApprovalRequired = blocked;

    this.state.updatedAt = new Date();
  }

  addSubAgentNote(agent: string, note: string): void {
    this.state.subAgentNotes.push(`[${agent}] ${note}`);
    this.state.updatedAt = new Date();
  }

  addArtifact(type: string, id: string, data: any): void {
    this.state.artifacts.push({ type, id, data });
    this.state.updatedAt = new Date();
  }

  addEvidenceTimelineEvent(event: string, source: string): void {
    this.state.evidenceTimeline.push({ timestamp: new Date(), event, source });
    this.state.updatedAt = new Date();
  }

  approveGate(gateName: string, reviewedBy: string): boolean {
    if (this.state.approvalGates[gateName]) {
      this.state.approvalGates[gateName].approved = true;
      this.state.approvalGates[gateName].reviewedBy = reviewedBy;
      this.state.approvalGates[gateName].timestamp = new Date();
      this.state.updatedAt = new Date();
      return true;
    }
    return false;
  }

  isGateApproved(gateName: string): boolean {
    return this.state.approvalGates[gateName]?.approved ?? false;
  }

  export(): CaseWorkspaceState {
    return { ...this.state };
  }
}
