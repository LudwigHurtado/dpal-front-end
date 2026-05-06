// src/field-os/super-agent/skills/dpalSituationRoomSkill.ts

export const dpalSituationRoomSkill = {
  skillId: 'dpal-situation-room',
  name: 'Situation Room Collaboration',
  description: 'Route evidence and findings to a Situation Room for real-time team collaboration and expert input.',
  requiredInputs: ['roomId', 'evidence'],
  optionalInputs: ['participants', 'permissions'],
  outputArtifacts: ['collaboration_notes', 'expert_reviews', 'field_photos', 'action_items'],
  toolsInvolved: ['Situation Room', 'Messaging', 'File Storage'],
};
