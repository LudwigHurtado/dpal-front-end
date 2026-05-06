// src/field-os/super-agent/skills/dpalEvidenceReportSkill.ts

export const dpalEvidenceReportSkill = {
  skillId: 'dpal-evidence-report',
  name: 'Evidence Report Generation',
  description: 'Compile collected evidence into a structured, verified investigation report.',
  requiredInputs: ['caseId', 'evidence'],
  optionalInputs: ['reportTemplate'],
  outputArtifacts: ['evidence_report', 'timeline_summary', 'claim_labels', 'legal_copy'],
  toolsInvolved: ['Evidence Vault', 'Report Generator', 'Claim Safety Guard'],
};
