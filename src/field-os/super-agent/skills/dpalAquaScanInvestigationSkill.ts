// src/field-os/super-agent/skills/dpalAquaScanInvestigationSkill.ts

export const dpalAquaScanInvestigationSkill = {
  skillId: 'dpal-aquascan-investigation',
  name: 'AquaScan Water Investigation',
  description: 'Conduct a structured water quality and stress investigation using satellite imagery and field evidence.',
  requiredInputs: ['location', 'concern'],
  optionalInputs: ['dateRange', 'parameters'],
  outputArtifacts: ['water_quality_report', 'satellite_scan', 'evidence_packet', 'situation_room_brief'],
  toolsInvolved: ['AquaScan', 'Satellite Adapter', 'Evidence Vault', 'Situation Room'],
};
