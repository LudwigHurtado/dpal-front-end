import { getAllBusinessUseCases } from './businessUseCasesBackend';

export function getSafetyRulesSummary(): {
  rules: string[];
  blocksAutomaticClaims: string[];
} {
  return {
    rules: [
      'Never claim human_verified unless reviewer-attested data explicitly sets it true.',
      'Never claim blockchain_anchored unless a chain record exists and is referenced.',
      'Never claim automatic carbon credit issuance, VIU eligibility, or registry approval.',
      'Never assert legal, enforcement, regulatory guilt, or liability conclusions.',
      'Use screening, anomaly, evidence packet, and review language by default.',
    ],
    blocksAutomaticClaims: ['human_verified', 'blockchain_anchored', 'carbon_credits', 'viu', 'registry', 'legal_liability'],
  };
}

export function assertSafetyInvariants(): boolean {
  const text = JSON.stringify(getAllBusinessUseCases());
  if (/human_verified\s*:\s*true/i.test(text)) return false;
  if (/blockchain_anchored\s*:\s*true/i.test(text)) return false;
  return true;
}
