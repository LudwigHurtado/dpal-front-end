// src/field-os/skills/openSituationRoomSkill.ts

import { Skill, SkillParams, SkillResult } from '../types';
import { SituationRoomModule } from '../modules/SituationRoomModule';

export const openSituationRoomSkill: Skill = {
  name: 'openSituationRoomSkill',
  description: 'Opens a new Situation Room for collaborative investigation',

  async execute(params: SkillParams): Promise<SkillResult> {
    try {
      const { roomId, data } = params;

      const module = new SituationRoomModule();
      const result = await module.execute({
        action: 'create',
        roomId,
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
        error: error instanceof Error ? error.message : 'Failed to open situation room',
      };
    }
  },
};