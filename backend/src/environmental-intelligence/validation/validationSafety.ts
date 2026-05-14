import type { EnvironmentalValidationSafetyLabels } from './validationTypes';

/** Default safety flags for a validation request record (no verification implied). */
export const DEFAULT_VALIDATION_REQUEST_SAFETY: EnvironmentalValidationSafetyLabels = {
  pending_verification: true,
  human_verified: false,
  blockchain_anchored: false,
};

/** Limitations stored on the request — screening / workflow only. */
export const VALIDATION_REQUEST_CORE_LIMITATIONS: string[] = [
  'Creating or updating a validation request does not verify evidence.',
  'Assigning a reviewer does not verify evidence.',
  'Integrity hashes are document fingerprints only; they are not blockchain anchoring.',
  'This workflow does not assert legal, regulatory, enforcement, liability, or guilt.',
  'This workflow does not assert carbon credit issuance, VIU eligibility, registry approval, or chain transactions.',
];
