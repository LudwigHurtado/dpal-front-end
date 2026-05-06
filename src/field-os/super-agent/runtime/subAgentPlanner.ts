// src/field-os/super-agent/runtime/subAgentPlanner.ts

import { SuperAgentPlan } from '../superAgentTypes';

export interface SubAgentTask {
  agentId: string;
  agentName: string;
  stepId: string;
  task: string;
  dependencies: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: number;
}

export class SubAgentPlanner {
  plan(investigationPlan: SuperAgentPlan): SubAgentTask[] {
    return investigationPlan.plannedSteps.map((step, index) => ({
      agentId: step.agent.toLowerCase().replace(/agent$/, ''),
      agentName: step.agent,
      stepId: step.stepId,
      task: step.task,
      dependencies: index > 0 ? [investigationPlan.plannedSteps[index - 1].stepId] : [],
      priority: index === 0 ? 'high' : 'medium',
      estimatedDuration: 5000,
    }));
  }

  getExecutionOrder(tasks: SubAgentTask[]): SubAgentTask[] {
    const ordered: SubAgentTask[] = [];
    const remaining = new Set(tasks);

    while (remaining.size > 0) {
      const next = Array.from(remaining).find((task) => task.dependencies.length === 0 || task.dependencies.every((dep) => ordered.some((t) => t.stepId === dep)));

      if (!next) break;

      ordered.push(next);
      remaining.delete(next);
    }

    return ordered;
  }
}
