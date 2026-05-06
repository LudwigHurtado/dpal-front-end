// src/field-os/workflowRunner.ts

import { getWorkflowDefinition } from './workflowRegistry';
import type { WorkflowResult, Artifact } from './types';

export type WorkflowExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'needs_human_review';

export interface WorkflowExecutionStep {
  stepId: string;
  name: string;
  status: WorkflowExecutionStatus;
  output?: any;
  error?: string;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  workflowName: string;
  executionId: string;
  startedAt: Date;
  completedAt?: Date;
  status: WorkflowExecutionStatus;
  steps: WorkflowExecutionStep[];
  artifacts: Artifact[];
  confidence: string;
  nextRecommendedAction: string;
  dryRunLabel?: string;
  error?: string;
}

export class WorkflowRunner {
  async run(workflowId: string, input: Record<string, any>): Promise<WorkflowExecutionResult> {
    const definition = getWorkflowDefinition(workflowId);
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date();

    if (!definition) {
      return {
        workflowId,
        workflowName: 'Unknown workflow',
        executionId,
        startedAt,
        completedAt: new Date(),
        status: 'failed',
        steps: [],
        artifacts: [],
        confidence: 'low',
        nextRecommendedAction: 'Select a valid workflow.',
        error: `Workflow ${workflowId} not found.`,
      };
    }

    const steps = definition.blueprint.steps.map((step) => ({
      stepId: step.id,
      name: step.name,
      status: 'pending' as WorkflowExecutionStatus,
    }));

    try {
      const result: WorkflowResult = await definition.blueprint.executeWorkflow(input);
      const stepResults = result.steps.map((step) => {
        const definitionStep = definition.blueprint.steps.find((definitionStep) => definitionStep.id === step.stepId);
        const status: WorkflowExecutionStatus = step.success ? 'completed' : 'failed';
        return {
          stepId: step.stepId,
          name: definitionStep?.name ?? step.stepId,
          status,
          output: step.output,
          error: step.success ? undefined : step.output?.error || 'Step failed',
        };
      });

      const hasFailure = stepResults.some((step) => step.status === 'failed');
      const status: WorkflowExecutionStatus = hasFailure
        ? 'failed'
        : definition.dryRun
        ? 'needs_human_review'
        : 'completed';

      return {
        workflowId: definition.id,
        workflowName: definition.name,
        executionId,
        startedAt,
        completedAt: new Date(),
        status,
        steps: stepResults,
        artifacts: result.outputArtifacts,
        confidence: result.confidenceStatus,
        nextRecommendedAction: result.nextRecommendedAction,
        dryRunLabel: definition.dryRun ? definition.dryRunLabel : undefined,
      };
    } catch (error) {
      return {
        workflowId: definition.id,
        workflowName: definition.name,
        executionId,
        startedAt,
        completedAt: new Date(),
        status: 'failed',
        steps,
        artifacts: [],
        confidence: 'low',
        nextRecommendedAction: 'Review the workflow definition and try again.',
        error: error instanceof Error ? error.message : 'Workflow execution failed.',
      };
    }
  }
}
