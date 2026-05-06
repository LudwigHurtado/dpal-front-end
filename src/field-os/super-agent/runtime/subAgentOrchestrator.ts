// src/field-os/super-agent/runtime/subAgentOrchestrator.ts

import { SubAgentOutput } from '../superAgentTypes';
import { AquaScanAgent } from '../subAgents/AquaScanAgent';
import { EarthObservationAgent } from '../subAgents/EarthObservationAgent';
import { CarbEmissionsAgent } from '../subAgents/CarbEmissionsAgent';
import { EvidenceAgent } from '../subAgents/EvidenceAgent';
import { ReportAgent } from '../subAgents/ReportAgent';
import { ValidatorAgent } from '../subAgents/ValidatorAgent';
import { MissionAgent } from '../subAgents/MissionAgent';

export class SubAgentOrchestrator {
  private agents: Map<string, any>;

  constructor() {
    this.agents = new Map<string, any>([
      ['AquaScanAgent', new AquaScanAgent()],
      ['EarthObservationAgent', new EarthObservationAgent()],
      ['CarbEmissionsAgent', new CarbEmissionsAgent()],
      ['EvidenceAgent', new EvidenceAgent()],
      ['ReportAgent', new ReportAgent()],
      ['ValidatorAgent', new ValidatorAgent()],
      ['MissionAgent', new MissionAgent()],
    ]);
  }

  async executeAgent(agentName: string, goal: string, location?: string): Promise<SubAgentOutput | null> {
    const agent = this.agents.get(agentName);
    if (!agent) return null;

    try {
      return await agent.executeTask(goal, location);
    } catch (error) {
      return {
        agentId: agentName.toLowerCase(),
        name: agentName,
        task: 'Failed to execute',
        status: 'failed',
        findings: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        artifacts: [],
        confidence: 'low',
        limitations: ['Agent execution failed.'],
        needsHumanReview: true,
        claimLabels: {
          observed: false,
          calculated: false,
          imported: false,
          user_submitted: false,
          ai_inferred: false,
          pending_verification: true,
          human_verified: false,
          blockchain_anchored: false,
        },
      };
    }
  }

  async executeAgents(agentNames: string[], goal: string, location?: string): Promise<SubAgentOutput[]> {
    const results: SubAgentOutput[] = [];
    for (const agentName of agentNames) {
      const result = await this.executeAgent(agentName, goal, location);
      if (result) results.push(result);
    }
    return results;
  }

  getAvailableAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}
