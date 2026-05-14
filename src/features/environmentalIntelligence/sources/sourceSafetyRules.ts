import type { DpalClaimType } from './sourceTypes';
import { businessUseCaseById, businessUseCaseMap } from './businessUseCaseMap';
import { dpalSourceRegistry, dpalSourceRegistryById } from './dpalSourceRegistry';

export const GLOBAL_SAFETY_RULE_IDS = [
  'no_auto_human_verify',
  'no_blockchain_claim',
  'no_carbon_credit_claim',
  'no_viu_claim',
  'no_registry_claim',
  'no_legal_conclusion',
  'future_mission_gate',
  'commercial_gate',
  'partner_gate',
  'field_validation_gate',
] as const;

export type GlobalSafetyRuleId = (typeof GLOBAL_SAFETY_RULE_IDS)[number];

export const globalSafetyRuleText: Readonly<Record<GlobalSafetyRuleId, string>> = {
  no_auto_human_verify: 'Never claim human verification unless human_verified is explicitly true in reviewer workflow data.',
  no_blockchain_claim: 'Never claim blockchain anchoring unless blockchain_anchored is explicitly true on a recorded chain artifact.',
  no_carbon_credit_claim: 'Never claim automatic carbon credit issuance, retirement, or market settlement.',
  no_viu_claim: 'Never claim automatic VIU eligibility or verified impact unit issuance.',
  no_registry_claim: 'Never claim automatic registry approval or compliance certification.',
  no_legal_conclusion:
    'Do not assert legal outcomes, enforcement, regulatory guilt, or liability. Use screening, anomaly, evidence packet, and review language.',
  future_mission_gate: 'Future-mission sources must not run as live providers or increase confidence until status is live in DPAL.',
  commercial_gate: 'Commercial and partner feeds require executed contracts and credentials; treat as absent until wired.',
  partner_gate: 'Partner-required missions require explicit data agreements before execution.',
  field_validation_gate: 'High-impact claims require field validation, lab metadata, or qualified human review.',
};

/** Narrative block keyed by business use case (for UI copy and packet headers). */
export function getSafetyLanguageForUseCase(useCaseId: string): string {
  const uc = businessUseCaseById[useCaseId as keyof typeof businessUseCaseById];
  if (!uc) {
    return `${globalSafetyRuleText.no_auto_human_verify} ${globalSafetyRuleText.no_legal_conclusion}`;
  }
  const base = uc.safetyLanguage;
  const extra = uc.validationRequired ? ` ${globalSafetyRuleText.field_validation_gate}` : '';
  return `${base}${extra}`;
}

export function getSourceLimitations(sourceId: string): readonly string[] {
  return dpalSourceRegistryById[sourceId]?.limitations ?? ['Unknown source id — treat as unavailable until registered.'];
}

const DISALLOWED_CLAIMS: readonly DpalClaimType[] = [
  'human_verified',
  'blockchain_anchored',
  'carbon_credit_issuance',
  'viu_eligibility',
  'registry_approval',
  'legal_enforcement',
  'regulatory_guilt',
];

/** Whether a source can support a given claim type without overstating certainty. */
export function canSourceSupportClaim(sourceId: string, claimType: DpalClaimType): boolean {
  const src = dpalSourceRegistryById[sourceId];
  if (!src) return false;
  if (DISALLOWED_CLAIMS.includes(claimType)) return false;
  if (claimType === 'screening_support' || claimType === 'evidence_lead') {
    if (src.status === 'future' || src.status === 'unavailable') return false;
    if (src.status === 'commercial' || src.status === 'partner_required') return false;
    return src.status === 'live' || src.status === 'public_record' || src.status === 'historical';
  }
  return false;
}

export function getGlobalSafetyRulesSummary(): { id: GlobalSafetyRuleId; text: string }[] {
  return GLOBAL_SAFETY_RULE_IDS.map((id) => ({ id, text: globalSafetyRuleText[id] }));
}

export function useCaseRequiresFieldValidation(useCaseId: string): boolean {
  return businessUseCaseById[useCaseId as keyof typeof businessUseCaseById]?.validationRequired ?? true;
}

export const businessUseCaseCount = businessUseCaseMap.length;
