// src/field-os/super-agent/skills/dpalEarthObservationAuditSkill.ts

export const dpalEarthObservationAuditSkill = {
  skillId: 'dpal-earth-observation-audit',
  name: 'Earth Observation Satellite Audit',
  description: 'Run a satellite-based environmental audit with NDVI, vegetation change, and land-use analysis.',
  requiredInputs: ['location', 'analysisType'],
  optionalInputs: ['dateRange', 'parameters'],
  outputArtifacts: ['vegetation_index_report', 'change_detection', 'land_use_analysis', 'risk_assessment'],
  toolsInvolved: ['Earth Observation', 'Planetary Computer STAC', 'Evidence Vault'],
};
