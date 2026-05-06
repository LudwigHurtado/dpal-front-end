// src/field-os/super-agent/DpalLeadAgent.ts

import { claimSafetyGuard } from './runtime/claimSafetyGuard';
import { SubAgentOrchestrator } from './runtime/subAgentOrchestrator';
import { SuperAgentPlan, SuperAgentGoalInput, SuperAgentPlanStep } from './superAgentTypes';

export class DpalLeadAgent {
  private orchestrator = new SubAgentOrchestrator();

  async generatePlan(input: SuperAgentGoalInput): Promise<SuperAgentPlan> {
    const caseId = `case-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    /** Completion promise: loop treats missing optional fields as incomplete until supplied (Preview scope). */
    const requiredInputs = ['goal', 'location', 'dateRange', 'evidenceRefs'];
    const subAgentsNeeded = this.selectSubAgents(input.goal);
    const subAgentOutputs = await this.orchestrator.executeAgents(subAgentsNeeded, input.goal, {
      location: input.location,
      dateRange: input.dateRange,
      evidenceRefs: input.evidenceRefs,
    });
    const plannedSteps = this.buildSteps(subAgentsNeeded, input);
    const expectedArtifacts = ['report', 'evidence', 'validation', 'timeline'];
    const humanApprovalCheckpoints = ['final_report_publication', 'public_qr_publication', 'blockchain_anchoring', 'validator_submission', 'legal_packet_export', 'viu_draft_issuance'];
    const limitations = ['Dry-run plan only. Live service adapters pending.', 'Claim labels are advisory and require review.'];
    const nextRecommendedAction = 'Review the investigation plan and grant approval at required checkpoints before live execution.';

    const viuOrCarbonModeling =
      /\bviu\b/i.test(input.goal) ||
      /\bco2e\b/i.test(input.goal) ||
      /\bmrv\b/i.test(input.goal) ||
      /\bbiomas/i.test(input.goal);

    const claimLabels = claimSafetyGuard.labelClaims({
      observed: true,
      calculated: viuOrCarbonModeling,
      imported: Boolean(input.evidenceRefs?.length),
      user_submitted: Boolean(input.evidenceRefs?.length),
      ai_inferred: true,
      pending_verification: true,
      human_verified: false,
      blockchain_anchored: false,
    });

    return {
      caseId,
      goal: input.goal,
      location: input.location,
      dateRange: input.dateRange,
      requiredInputs,
      subAgentsNeeded,
      subAgentOutputs,
      plannedSteps,
      expectedArtifacts,
      humanApprovalCheckpoints,
      limitations,
      nextRecommendedAction,
      claimLabels,
      confidence: 'medium',
      caseSummary: `Generated investigation plan for ${input.goal}. This is a dry-run plan pending live service adapters.`,
    };
  }

  private selectSubAgents(goal: string): string[] {
    const normalized = goal.toLowerCase();
    const agents = new Set<string>();

    if (normalized.includes('water') || normalized.includes('river') || normalized.includes('lake')) {
      agents.add('AquaScanAgent');
    }
    if (
      normalized.includes('satellite') ||
      normalized.includes('land') ||
      normalized.includes('observation') ||
      normalized.includes('forest') ||
      normalized.includes('vegetation') ||
      normalized.includes('decline') ||
      normalized.includes('stress') ||
      normalized.includes('reforestation') ||
      normalized.includes('restoration')
    ) {
      agents.add('EarthObservationAgent');
    }
    const carbAuditCue =
      normalized.includes('carb') ||
      normalized.includes('emission') ||
      normalized.includes('facility') ||
      normalized.includes('ghg') ||
      normalized.includes('pollution') ||
      normalized.includes('industrial') ||
      normalized.includes('refinery') ||
      normalized.includes('regulated facility') ||
      normalized.includes('reporting boundary') ||
      normalized.includes('mrr');
    if (carbAuditCue) {
      agents.add('CarbEmissionsAgent');
    }
    const viuCue =
      /\bviu\b/.test(normalized) ||
      /\bmrv\b/.test(normalized) ||
      normalized.includes('impact units') ||
      normalized.includes('verified impact') ||
      normalized.includes('co2e') ||
      normalized.includes('reforestation') ||
      normalized.includes('restoration') ||
      normalized.includes('biomass');
    if (viuCue) {
      agents.add('EarthObservationAgent');
      agents.add('ReportAgent');
      agents.add('ValidatorAgent');
    }
    const goodWheelsCue =
      normalized.includes('good wheels') ||
      normalized.includes('transportation incident') ||
      (normalized.includes('driver') && normalized.includes('passenger')) ||
      normalized.includes('charity') ||
      /\bride\b/.test(normalized);
    if (goodWheelsCue) {
      agents.add('ReportAgent');
      agents.add('EvidenceAgent');
      agents.add('ValidatorAgent');
    }
    if (
      normalized.includes('report') ||
      normalized.includes('case') ||
      normalized.includes('investigation') ||
      normalized.includes('investigate')
    ) {
      agents.add('ReportAgent');
    }
    if (normalized.includes('investigate') || normalized.includes('investigation')) {
      agents.add('EvidenceAgent');
      agents.add('ValidatorAgent');
    }
    if (normalized.includes('validate') || normalized.includes('validator') || normalized.includes('review')) {
      agents.add('ValidatorAgent');
    }
    if (normalized.includes('mission') || normalized.includes('task') || normalized.includes('deployment')) {
      agents.add('MissionAgent');
    }
    if (agents.size === 0) {
      agents.add('EvidenceAgent');
    }

    return Array.from(agents);
  }

  private buildSteps(subAgents: string[], input: SuperAgentGoalInput): SuperAgentPlanStep[] {
    return subAgents.map((agent, index) => ({
      stepId: `step-${index + 1}`,
      agent,
      task: `Coordinate ${agent.replace(/Agent$/, '')} for the goal.`,
      status: 'pending',
      inputs: { goal: input.goal, location: input.location, dateRange: input.dateRange, evidenceRefs: input.evidenceRefs },
    }));
  }
}
