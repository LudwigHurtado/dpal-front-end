// src/field-os/super-agent/skills/dpalValidatorReviewSkill.ts

export const dpalValidatorReviewSkill = {
  skillId: 'dpal-validator-review',
  name: 'Validator Review Queue',
  description: 'Submit evidence to validators for expert review and verification.',
  requiredInputs: ['evidence', 'reviewCriteria'],
  optionalInputs: ['validatorId', 'urgency'],
  outputArtifacts: ['validator_review', 'validation_decision', 'review_notes', 'confidence_score'],
  toolsInvolved: ['Validator Portal', 'Review Queue', 'Scoring Engine'],
};
