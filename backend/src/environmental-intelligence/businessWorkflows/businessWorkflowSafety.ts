import type { BusinessWorkflowSafetyLabels } from './businessWorkflowTypes';
import { getBusinessWorkflowTemplate } from './businessWorkflowRegistry';

const WORKFLOW_CORE_LIMITATIONS: string[] = [
  'Starting a workflow does not verify claims.',
  'Evidence collection is not a legal, regulatory, or enforcement conclusion.',
  'Creating a validation request is not human verification.',
  'Human verification occurs only through Phase 7 validation completion rules.',
  'Integrity hashes on evidence packets are fingerprints only; they are not blockchain anchoring.',
];

export function getBusinessWorkflowSafetyLabels(): BusinessWorkflowSafetyLabels {
  return {
    pending_verification: true,
    human_verified: false,
    blockchain_anchored: false,
  };
}

export function getBusinessWorkflowLimitations(workflowId: string): string[] {
  const t = getBusinessWorkflowTemplate(workflowId.trim());
  return [...new Set([...WORKFLOW_CORE_LIMITATIONS, ...(t?.limitations ?? [])])];
}

/** Detects affirmative forbidden claim signals in serialized workflow outputs (ignores normal safety disclaimers). */
export function scanWorkflowOutputForForbiddenClaims(output: unknown): string[] {
  const raw = JSON.stringify(output);
  const violations: string[] = [];
  const add = (id: string, re: RegExp) => {
    if (re.test(raw)) violations.push(id);
  };
  add('human_verified_json_true', /["']human_verified["']\s*:\s*true\b/);
  add('blockchain_anchored_json_true', /["']blockchain_anchored["']\s*:\s*true\b/);
  add('legal_advice_affirm', /\b(?:we |DPAL )?provides? legal advice\b/i);
  add('enforcement_determination', /\benforcement (?:determination|decision) (?:is|was|has been) (?:final|issued)\b/i);
  add('registry_approval_granted', /\bregistry approval (?:granted|issued|secured)\b/i);
  add('carbon_credits_issued', /\bcarbon credits? (?:were |are )?issued\b/i);
  add('viu_approved', /\bviu (?:approval|eligibility) (?:granted|confirmed)\b/i);
  add('chain_transaction_confirmed', /\b(?:on[- ]chain|blockchain) transaction (?:confirmed|recorded)\b/i);
  add('anchored_on_chain', /\banchored on (?:the )?blockchain\b/i);
  return violations;
}
