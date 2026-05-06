// src/field-os/skills/attachEvidenceSkill.ts

import { Skill, SkillParams, SkillResult } from '../types';
import { EvidenceVaultModule } from '../modules/EvidenceVaultModule';

export const attachEvidenceSkill: Skill = {
  name: 'attachEvidenceSkill',
  description: 'Attaches evidence to a report or case',

  async execute(params: SkillParams): Promise<SkillResult> {
    try {
      const { evidenceId, data } = params;

      const module = new EvidenceVaultModule();
      const result = await module.execute({
        action: 'store',
        evidenceId,
        data,
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
        error: error instanceof Error ? error.message : 'Failed to attach evidence',
      };
    }
  },
};