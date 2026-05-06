// src/field-os/skills/requestValidationSkill.ts

import { Skill, SkillParams, SkillResult } from '../types';
import { ValidatorReviewModule } from '../modules/ValidatorReviewModule';

export const requestValidationSkill: Skill = {
  name: 'requestValidationSkill',
  description: 'Requests validation review for evidence',

  async execute(params: SkillParams): Promise<SkillResult> {
    try {
      const { evidenceId, validatorId } = params;

      const module = new ValidatorReviewModule();
      const result = await module.execute({
        action: 'request_review',
        evidenceId,
        validatorId,
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
        error: error instanceof Error ? error.message : 'Failed to request validation',
      };
    }
  },
};