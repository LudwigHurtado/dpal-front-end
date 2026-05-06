// src/field-os/skills/createReportSkill.ts

import { Skill, SkillParams, SkillResult } from '../types';
import { ReportIntakeModule } from '../modules/ReportIntakeModule';

export const createReportSkill: Skill = {
  name: 'createReportSkill',
  description: 'Creates a new DPAL report using the Report Intake Module',

  async execute(params: SkillParams): Promise<SkillResult> {
    try {
      const { category, description, location, evidence } = params;

      const module = new ReportIntakeModule();
      const result = await module.execute({
        category,
        description,
        location,
        evidence,
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
        error: error instanceof Error ? error.message : 'Failed to create report',
      };
    }
  },
};