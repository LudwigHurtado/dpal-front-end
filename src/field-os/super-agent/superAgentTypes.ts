// src/field-os/super-agent/superAgentTypes.ts

export interface SuperAgentGoalInput {
  goal: string;
  location?: string;
  dateRange?: { startDate?: string; endDate?: string };
  evidenceRefs?: string[];
}

export interface SuperAgentPlanStep {
  stepId: string;
  agent: string;
  task: string;
  status: 'pending' | 'ready' | 'blocked';
  inputs: Record<string, any>;
}

export interface SubAgentOutput {
  agentId: string;
  name: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  findings: string[];
  artifacts: string[];
  confidence: 'low' | 'medium' | 'high';
  limitations: string[];
  needsHumanReview: boolean;
  claimLabels: Record<string, boolean>;
}

export interface SuperAgentPlan {
  caseId: string;
  goal: string;
  location?: string;
  dateRange?: { startDate?: string; endDate?: string };
  requiredInputs: string[];
  subAgentsNeeded: string[];
  plannedSteps: SuperAgentPlanStep[];
  expectedArtifacts: string[];
  humanApprovalCheckpoints: string[];
  limitations: string[];
  nextRecommendedAction: string;
  claimLabels: Record<string, boolean>;
  confidence: 'low' | 'medium' | 'high';
  caseSummary: string;
  /** Dry-run outputs from invoked sub-agents (Level 3 preview). */
  subAgentOutputs?: SubAgentOutput[];
}
