// src/field-os/skills/hashEvidenceSkill.ts

import { Skill, SkillParams, SkillResult } from '../types';
import { BlockchainLogModule } from '../modules/BlockchainLogModule';

export const hashEvidenceSkill: Skill = {
  name: 'hashEvidenceSkill',
  description: 'Hashes evidence for blockchain anchoring',

  async execute(params: SkillParams): Promise<SkillResult> {
    try {
      const { data, hash } = params;

      const module = new BlockchainLogModule();
      const result = await module.execute({
        action: 'log',
        data,
        hash,
      });

      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to hash evidence',
      };
    }
  },
};