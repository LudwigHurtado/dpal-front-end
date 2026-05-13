/**
 * Explainable anomaly heuristics (server). Mirrors frontend `anomalyScoring.ts` logic — not ML.
 */

export type Confidence = 'low' | 'medium' | 'high' | 'multi_source_supported' | 'field_validated' | 'official_record_supported';

export type AnomalyStatus =
  | 'aligned'
  | 'potential_mismatch'
  | 'unresolved_anomaly'
  | 'high_priority_review'
  | 'insufficient_data'
  | 'requires_field_validation'
  | 'requires_validator_review';

export type ValidationHint = 'none' | 'field_partial' | 'field_complete' | 'validator_pending' | 'validator_complete';

export interface ScoreSignalStub {
  previewOnly?: boolean;
  metadataOnly?: boolean;
  needsField?: boolean;
}

export interface ScoreInput {
  signals: ScoreSignalStub[];
  claimVague?: boolean;
  officialSupport?: boolean;
  independentSources?: number;
  locationMatch?: 'high' | 'medium' | 'low' | 'unknown';
  weatherExplainable?: boolean;
}

export function calculateAnomalyScore(input: ScoreInput): number {
  const { signals } = input;
  let score = 18;
  if (!signals.length) return Math.min(22, score);

  const weak = signals.filter((s) => s.previewOnly || s.metadataOnly).length;
  const weakRatio = weak / signals.length;
  score += Math.round(28 * (1 - weakRatio));

  const indep = Math.min(input.independentSources ?? 1, 5);
  score += indep * 6;
  if (input.officialSupport) score += 12;
  if (input.locationMatch === 'high') score += 10;
  else if (input.locationMatch === 'medium') score += 4;
  else if (input.locationMatch === 'low') score -= 6;
  if (input.claimVague) score += 8;
  if (input.weatherExplainable) score -= 14;
  const fieldGap = signals.filter((s) => s.needsField).length;
  if (fieldGap) score += Math.min(8, fieldGap * 3);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getAnomalyStatus(score: number, confidence: Confidence, validation: ValidationHint): AnomalyStatus {
  if (validation === 'validator_complete' && confidence === 'field_validated') return 'aligned';
  if (score < 22 && confidence === 'low') return 'insufficient_data';
  if (score < 28) return 'insufficient_data';
  if (validation === 'field_complete' && score < 45) return 'aligned';
  if (validation === 'validator_pending' || validation === 'validator_complete')
    return score >= 62 ? 'high_priority_review' : 'requires_validator_review';
  if (validation === 'field_partial') return 'requires_field_validation';
  if (score >= 78 && (confidence === 'high' || confidence === 'multi_source_supported')) return 'high_priority_review';
  if (score >= 55) return 'potential_mismatch';
  if (score >= 38) return 'unresolved_anomaly';
  if (validation === 'none' && score >= 42) return 'requires_field_validation';
  return 'aligned';
}
