// src/field-os/super-agent/skills/dpalBlockchainLogSkill.ts

export const dpalBlockchainLogSkill = {
  skillId: 'dpal-blockchain-log',
  name: 'Blockchain Evidence Anchor',
  description: 'Anchor investigation evidence and findings to the blockchain for immutable record-keeping.',
  requiredInputs: ['evidence', 'caseId'],
  optionalInputs: ['metadata'],
  outputArtifacts: ['blockchain_hash', 'anchor_timestamp', 'ledger_reference'],
  toolsInvolved: ['Blockchain Service', 'IPFS', 'Hash Generator'],
};
