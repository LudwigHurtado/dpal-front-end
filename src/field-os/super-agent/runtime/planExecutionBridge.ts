// src/field-os/super-agent/runtime/planExecutionBridge.ts

import { SuperAgentPlan } from '../superAgentTypes';
import { WorkflowRunner, WorkflowExecutionResult } from '../../workflowRunner';
import { getWorkflowDefinition } from '../../workflowRegistry';
import { APPROVAL_GATES } from './humanApprovalGate';

export interface MappedExecutionPlan {
  caseId: string;
  goal: string;
  mappedWorkflowIds: string[];
  /** Agents selected only for artifacts / drafts / review — no standalone Field OS workflow. */
  supportAgents: string[];
  executionSequence: Array<{ workflowId: string; position: number; inputs: Record<string, any> }>;
  /** Final accountability actions that stay gated until explicit human approval. */
  blockedActions: string[];
  requiredApprovals: string[];
  expectedArtifacts: string[];
  pendingAdapters: string[];
  confidence: string;
  nextRecommendedAction: string;
  dryRunLabel: string;
}

export interface ExecutionPreviewStep {
  workflowId: string;
  workflowName: string;
  status: string;
}

export interface ExecutionBridgeResult {
  caseId: string;
  plan: MappedExecutionPlan;
  workflowResults: WorkflowExecutionResult[];
  allArtifacts: any[];
  executionTrace: string;
  /**
   * Overall bridge outcome. Dry-run workflow previews may succeed while final_actions remain gated —
   * use `finalActionsBlocked` and `needs_human_approval` semantics instead of a misleading "blocked" run.
   */
  status: 'success' | 'partial' | 'needs_human_approval' | 'failed';
  /** True when standard publication / anchoring / export gates have not all been explicitly approved. */
  humanApprovalRequired: boolean;
  finalActionsBlocked: boolean;
  allRequiredGatesApproved: boolean;
  /** Same as plan.blockedActions when finalActionsBlocked — cleared once every gate is approved in UI. */
  blockedFinalActions: string[];
  dryRunPreviewCompleted: boolean;
  previewSteps: ExecutionPreviewStep[];
}

/** Agents that contribute artifacts, drafts, or review scaffolding — intentionally not mapped 1:1 to workflows. */
const SUPPORT_AGENT_IDS = new Set<string>(['EvidenceAgent', 'ReportAgent', 'ValidatorAgent']);

/**
 * Primary-agent → workflow coverage (dry-run registry IDs).
 *
 * EvidenceAgent — support agent: contributes artifacts / evidence timeline (no standalone workflow).
 * ReportAgent — support agent: contributes draft report assembly (no standalone workflow).
 * ValidatorAgent — support agent: contributes validator review checklist (no standalone workflow).
 */
const AGENT_TO_WORKFLOW_MAP: Record<string, string[]> = {
  AquaScanAgent: ['aquascan-investigation'],
  EarthObservationAgent: ['earth-observation-audit'],
  CarbEmissionsAgent: ['carb-emissions-audit'],
  EvidenceAgent: [],
  ReportAgent: [],
  ValidatorAgent: [],
  MissionAgent: ['mission-verification'],
};

export class PlanExecutionBridge {
  private runner: WorkflowRunner;

  constructor() {
    this.runner = new WorkflowRunner();
  }

  /** Infer optional workflows from natural-language signals (does not replace curated agent mapping). */
  private inferWorkflowIdsFromPlan(plan: SuperAgentPlan): string[] {
    const haystack = `${plan.goal} ${plan.location ?? ''}`.toLowerCase();
    const next: string[] = [];

    const viuCue =
      /\bviu\b/.test(haystack) ||
      /\bcarbon\b/.test(haystack) ||
      /\bmrv\b/.test(haystack) ||
      /impact units/.test(haystack) ||
      /restoration/.test(haystack) ||
      /reforestation/.test(haystack) ||
      /biomass/.test(haystack) ||
      /co2e/.test(haystack) ||
      /verified impact/.test(haystack);

    const goodWheelsCue =
      /good wheels/.test(haystack) ||
      /\bride\b/.test(haystack) ||
      /driver/.test(haystack) ||
      /passenger/.test(haystack) ||
      /charity/.test(haystack) ||
      /transportation incident/.test(haystack);

    if (viuCue) next.push('carbon-viu-project');
    if (goodWheelsCue) next.push('good-wheels-incident-review');

    return next;
  }

  mapPlanToWorkflows(plan: SuperAgentPlan): MappedExecutionPlan {
    const mappedWorkflowIds = new Set<string>();
    const workflowSequence = new Map<string, { workflowId: string; position: number; inputs: Record<string, any> }>();

    const supportAgents = plan.subAgentsNeeded.filter((a) => SUPPORT_AGENT_IDS.has(a));
    const workflowAgents = plan.subAgentsNeeded.filter((a) => !SUPPORT_AGENT_IDS.has(a));

    let seqPosition = 0;

    workflowAgents.forEach((agent) => {
      const workflowIds = AGENT_TO_WORKFLOW_MAP[agent] ?? [];
      workflowIds.forEach((workflowId) => {
        if (mappedWorkflowIds.has(workflowId)) return;
        mappedWorkflowIds.add(workflowId);
        workflowSequence.set(workflowId, {
          workflowId,
          position: seqPosition++,
          inputs: this.buildWorkflowInputs(workflowId, plan),
        });
      });
    });

    this.inferWorkflowIdsFromPlan(plan).forEach((workflowId) => {
      if (mappedWorkflowIds.has(workflowId)) return;
      mappedWorkflowIds.add(workflowId);
      workflowSequence.set(workflowId, {
        workflowId,
        position: seqPosition++,
        inputs: this.buildWorkflowInputs(workflowId, plan),
      });
    });

    const blockedActions = plan.humanApprovalCheckpoints.map(
      (checkpoint) => APPROVAL_GATES[checkpoint]?.name ?? checkpoint.replace(/_/g, ' ')
    );

    const pendingAdapters = plan.subAgentsNeeded.map((agent) => `${agent} adapter`);

    return {
      caseId: plan.caseId,
      goal: plan.goal,
      mappedWorkflowIds: Array.from(mappedWorkflowIds),
      supportAgents,
      executionSequence: Array.from(workflowSequence.values()).sort((a, b) => a.position - b.position),
      blockedActions,
      requiredApprovals: plan.humanApprovalCheckpoints,
      expectedArtifacts: plan.expectedArtifacts,
      pendingAdapters,
      confidence: plan.confidence,
      nextRecommendedAction: plan.nextRecommendedAction,
      dryRunLabel: 'Dry Run — pending live service adapter.',
    };
  }

  private buildWorkflowInputs(workflowId: string, plan: SuperAgentPlan): Record<string, any> {
    const selectedDateRange = plan.dateRange?.startDate || plan.dateRange?.endDate
      ? { startDate: plan.dateRange?.startDate, endDate: plan.dateRange?.endDate }
      : undefined;
    const baseInputs: Record<string, any> = {
      goal: plan.goal,
      location: plan.location,
      dateRange: plan.dateRange,
      selectedDateRange,
      caseId: plan.caseId,
    };

    switch (workflowId) {
      case 'aquascan-investigation':
        return {
          ...baseInputs,
          concern: plan.goal,
          parameters: {
            analysisType: 'water_quality',
            selectedDateRange: selectedDateRange ?? 'unspecified',
          },
        };

      case 'earth-observation-audit':
        return {
          ...baseInputs,
          analysisType: 'land_change',
          parameters: {
            selectedDateRange:
              selectedDateRange ?? {
                startDate: 'unspecified',
                endDate: 'unspecified',
              },
          },
        };

      case 'carb-emissions-audit':
        return {
          ...baseInputs,
          facilityId: 'case-facility',
          reportingYear: new Date().getFullYear(),
          validatorId: 'validator-01',
        };

      case 'carbon-viu-project':
        return {
          ...baseInputs,
          projectType: 'observation_study',
          baseline: plan.goal,
          parameters: {
            vegetationIndex: 'NDVI',
            selectedDateRange:
              selectedDateRange ?? {
                startDate: 'unspecified',
                endDate: 'unspecified',
              },
          },
        };

      case 'good-wheels-incident-review':
        return {
          ...baseInputs,
          incidentType: 'Field OS investigation goal',
          location: typeof plan.location === 'string' ? this.parseLocationCoords(plan.location) : plan.location,
          participants: ['driver', 'passenger'],
          tripId: `trip-${plan.caseId}`,
          validatorId: 'validator-field-os',
        };

      case 'mission-verification':
        return {
          ...baseInputs,
          missionId: `mission-${plan.caseId}`,
        };

      default:
        return baseInputs;
    }
  }

  /** Best-effort: reuse lat/lng object when the optional location field encodes coordinates. */
  private parseLocationCoords(location: string): { lat: number; lng: number } | string {
    const m = location.match(/(-?\d+\.?\d*)[\s,]+(-?\d+\.?\d*)/);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
    return location;
  }

  private gatesFullyApproved(requiredApprovals: string[], gateApprovals: Record<string, boolean>): boolean {
    if (requiredApprovals.length === 0) return true;
    return requiredApprovals.every((gate) => gateApprovals[gate] === true);
  }

  /**
   * Always runs safe dry-run workflow previews via WorkflowRunner (no live publication).
   * Final accountability actions (report publication, QR, chain anchor, etc.) remain blocked in product terms
   * until every required gate is explicitly marked approved in `gateApprovals`.
   */
  async executePlannedWorkflows(
    plan: SuperAgentPlan,
    mappedPlan: MappedExecutionPlan,
    options?: { gateApprovals?: Record<string, boolean> }
  ): Promise<ExecutionBridgeResult> {
    const workflowResults: WorkflowExecutionResult[] = [];
    const allArtifacts: any[] = [];

    const gateApprovals = options?.gateApprovals ?? {};
    const allRequiredGatesApproved = this.gatesFullyApproved(mappedPlan.requiredApprovals, gateApprovals);
    const finalActionsBlocked = mappedPlan.requiredApprovals.length > 0 && !allRequiredGatesApproved;

    const blockedFinalActions = finalActionsBlocked ? [...mappedPlan.blockedActions] : [];

    for (const execution of mappedPlan.executionSequence) {
      const workflowDef = getWorkflowDefinition(execution.workflowId);
      if (!workflowDef) continue;

      try {
        const result = await this.runner.run(execution.workflowId, execution.inputs);
        workflowResults.push(result);
        allArtifacts.push(...result.artifacts);
      } catch (error) {
        console.error(`Error executing workflow ${execution.workflowId}:`, error);
      }
    }

    const previewSteps: ExecutionPreviewStep[] = workflowResults.map((result) => ({
      workflowId: result.workflowId,
      workflowName: result.workflowName,
      status: result.status,
    }));

    const executionTrace = workflowResults
      .map((result) => `[${result.workflowName}] Status: ${result.status}`)
      .join('\n');

    const dryRunPreviewCompleted = workflowResults.length > 0 && workflowResults.every((r) => r.status !== 'failed');

    const anyFailed = workflowResults.some((r) => r.status === 'failed');
    const allFailed = workflowResults.length > 0 && workflowResults.every((r) => r.status === 'failed');

    let status: ExecutionBridgeResult['status'];
    if (allFailed) {
      status = 'failed';
    } else if (anyFailed) {
      status = 'partial';
    } else if (finalActionsBlocked) {
      status = 'needs_human_approval';
    } else {
      status = 'success';
    }

    return {
      caseId: plan.caseId,
      plan: mappedPlan,
      workflowResults,
      allArtifacts,
      executionTrace,
      status,
      humanApprovalRequired: finalActionsBlocked,
      finalActionsBlocked,
      allRequiredGatesApproved,
      blockedFinalActions,
      dryRunPreviewCompleted,
      previewSteps,
    };
  }
}
