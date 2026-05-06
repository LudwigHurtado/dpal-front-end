// src/field-os/super-agent/skills/dpalCarbAuditSkill.ts

export const dpalCarbAuditSkill = {
  skillId: 'dpal-carb-audit',
  name: 'CARB Emissions Audit',
  description: 'Audit facility emissions records against satellite verification and regulatory compliance.',
  requiredInputs: ['facilityId', 'reportingYear'],
  optionalInputs: ['location', 'comparisonYear'],
  outputArtifacts: ['emissions_audit_report', 'satellite_verification', 'compliance_findings', 'discrepancy_summary'],
  toolsInvolved: ['CARB Data Service', 'Satellite Adapter', 'Validator Review'],
};
