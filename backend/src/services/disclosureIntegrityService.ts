/**
 * Server-side disclosure integrity helpers — preview-safe, no live NASA fabrication.
 */

export type AnalyzeBody = {
  companyName?: string;
  facilityName?: string;
  claimType?: string;
  claimText?: string;
  reportingPeriod?: string;
  selectedProviders?: string[];
};

const DISCLAIMER =
  'DPAL does not determine fraud or dishonesty. Status labels describe evidence alignment for reviewer follow-up only.';

export function buildAnalyzeDisclaimer(): string {
  return DISCLAIMER;
}

export function buildEvidenceShellMessage(): string {
  return 'Evidence packet shell — final scientific validation requires provider data, field validation, official records, or qualified review.';
}
