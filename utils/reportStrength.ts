import type { ReportDraft } from '../types/categoryGateway';

export function calculateReportStrength(draft: ReportDraft): number {
  let score = 0;
  if (draft.reportTypeId) score += 10;
  if (draft.summary) score += 15;
  if (draft.location && (draft.location.label || draft.location.address || draft.location.lat != null)) score += 15;
  if (draft.time && (draft.time.iso || draft.time.approximate)) score += 10;
  if (draft.evidence?.length) score += 20;
  if (draft.severity) score += 10;
  if (draft.repeated !== undefined) score += 10;
  if (draft.patternNotes) score += 10;
  return Math.min(score, 100);
}

export function reportStrengthLabel(score: number): string {
  if (score <= 25) return 'Basic';
  if (score <= 50) return 'Developing';
  if (score <= 75) return 'Strong';
  return 'High Confidence';
}
