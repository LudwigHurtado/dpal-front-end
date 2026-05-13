import type {
  DisclosureClaim,
  DisclosureIntegrityAnomalyStatus,
  DisclosureIntegrityConfidenceLevel,
  DisclosureIntegrityFinding,
  EvidenceStrengthSummary,
  ObservedEnvironmentalSignal,
} from './disclosureIntegrityTypes';
import { SatelliteConfidenceLevel, SatelliteEvidenceReadiness } from './satelliteIntelligenceTypes';
import { summarizeProviderReadiness } from '../accountability/providerStatusAggregator';
import { SATELLITE_SOURCE_REGISTRY } from './satelliteSourceRegistry';

export type AnomalyScoreValidationHint =
  | 'none'
  | 'field_partial'
  | 'field_complete'
  | 'validator_pending'
  | 'validator_complete';

export interface AnomalyScoreInput {
  observedSignals: ObservedEnvironmentalSignal[];
  claim: Pick<DisclosureClaim, 'claimType' | 'claimText' | 'reportedValue' | 'confidenceInClaimRecord'>;
  /** How well observations line up with the claimed facility / AOI */
  facilityLocationMatch?: 'high' | 'medium' | 'low' | 'unknown';
  /** Distinct provider families contributing (not double-counting preview duplicates) */
  independentSourceCount?: number;
  /** Distinct DPAL modules contributing (sourceModuleId) */
  independentModuleCount?: number;
  /** Regulatory or official dataset flags a concern */
  officialRecordSupport?: boolean;
  /** Same signal class observed across multiple dates / passes */
  repeatedTemporalPattern?: boolean;
  /** Disclosure text lacks quantified or verifiable targets */
  companyDisclosureVague?: boolean;
  /** Season / weather plausibly explains the satellite signal */
  weatherExplainable?: boolean;
}

function countPreviewOrMetadataOnly(signals: ObservedEnvironmentalSignal[]): number {
  return signals.filter(
    (s) =>
      s.previewOnly ||
      s.confidenceLevel === SatelliteConfidenceLevel.metadata_only ||
      s.confidenceLevel === SatelliteConfidenceLevel.preview_only ||
      s.evidenceReadiness === SatelliteEvidenceReadiness.preview_only,
  ).length;
}

function countFieldValidationNeeded(signals: ObservedEnvironmentalSignal[]): number {
  return signals.filter(
    (s) =>
      s.confidenceLevel === SatelliteConfidenceLevel.requires_field_validation ||
      s.evidenceReadiness === SatelliteEvidenceReadiness.needs_field_validation,
  ).length;
}

function countValidatorReviewSignals(signals: ObservedEnvironmentalSignal[]): number {
  return signals.filter((s) => s.evidenceReadiness === SatelliteEvidenceReadiness.needs_validator_review).length;
}

export function deriveAnomalyScoreInputFromFinding(finding: DisclosureIntegrityFinding): AnomalyScoreInput {
  const observedSignals = finding.observedSignals;
  const moduleIds = new Set(observedSignals.map((s) => s.sourceModuleId).filter(Boolean));
  const providerIds = new Set(observedSignals.map((s) => s.providerId));
  const officialRecordSupport = observedSignals.some(
    (s) =>
      s.providerId === 'EPA_DATASET' ||
      s.providerId === 'CARB_DATASET' ||
      s.sourceModuleId === 'carb_emissions_audit' ||
      s.sourceModuleId === 'hazardous_waste_audit' ||
      s.sourceModuleId === 'envirofacts_geo',
  );
  return {
    observedSignals,
    claim: finding.claim,
    facilityLocationMatch: 'high',
    independentSourceCount: Math.max(1, providerIds.size),
    independentModuleCount: Math.max(1, moduleIds.size),
    officialRecordSupport,
    repeatedTemporalPattern: observedSignals.some((s) => s.baselineDate && s.currentDate),
    companyDisclosureVague: finding.claim.claimText.length < 48,
    weatherExplainable: false,
  };
}

export function buildEvidenceStrengthSummary(finding: DisclosureIntegrityFinding): EvidenceStrengthSummary {
  const signals = finding.observedSignals;
  const modules = new Set(signals.map((s) => s.sourceModuleId).filter(Boolean));
  const providers = new Set(signals.map((s) => s.providerId));
  const official = signals.some(
    (s) =>
      s.providerId === 'EPA_DATASET' ||
      s.providerId === 'CARB_DATASET' ||
      s.sourceModuleId === 'carb_emissions_audit' ||
      s.sourceModuleId === 'envirofacts_geo',
  );
  const fieldRequired = signals.some(
    (s) =>
      s.evidenceReadiness === SatelliteEvidenceReadiness.needs_field_validation ||
      s.confidenceLevel === SatelliteConfidenceLevel.requires_field_validation,
  );
  const validatorDone = finding.confidenceLevel === 'field_validated';

  if (validatorDone) {
    return {
      tier: 'validator_reviewed',
      label: 'Validator reviewed',
      detail: 'Finding marked field-validated — still not a final legal determination.',
    };
  }
  if (official && (modules.size >= 2 || providers.size >= 2)) {
    return {
      tier: 'official_record_cross_check',
      label: 'Official record cross-check',
      detail: 'Public or regulatory record context combined with additional observation lanes.',
    };
  }
  if (modules.size >= 2 || providers.size >= 3) {
    return {
      tier: 'multi_source',
      label: 'Multi-source support',
      detail: 'Multiple independent lanes or modules point in a related direction — corroboration, not proof.',
    };
  }
  if (fieldRequired) {
    return {
      tier: 'field_validation_required',
      label: 'Field validation required',
      detail: 'Signals rely on screening or metadata — attach field sampling or facility walk-down before strong claims.',
    };
  }
  return {
    tier: 'single_source',
    label: 'Single-source indication',
    detail: 'Limited corroboration — widen modules, providers, or official records where possible.',
  };
}

export function explainAnomalyScore(finding: DisclosureIntegrityFinding): string[] {
  const input = deriveAnomalyScoreInputFromFinding(finding);
  const bullets: string[] = [];
  const weak = countPreviewOrMetadataOnly(input.observedSignals);
  const ratio = weak / Math.max(input.observedSignals.length, 1);
  if (ratio > 0.5) bullets.push('Score reduced because several sources are preview-only or metadata-only.');
  if (ratio < 0.35 && input.observedSignals.length > 0)
    bullets.push('Score increased because a larger share of signals carry non-metadata confidence levels.');

  if ((input.independentModuleCount ?? 1) >= 2)
    bullets.push('Score increased because multiple independent modules reported related signals.');
  if ((input.independentSourceCount ?? 1) >= 3)
    bullets.push('Score increased because multiple provider families contributed observations.');

  if (input.officialRecordSupport) bullets.push('Score increased because official or regulatory record context is present.');
  if (input.repeatedTemporalPattern) bullets.push('Score increased because baseline and current dates suggest a temporal comparison.');
  if (input.facilityLocationMatch === 'high') bullets.push('Score increased because the observed signal is near the claimed facility AOI.');
  if (input.facilityLocationMatch === 'low') bullets.push('Score reduced because location alignment with the claim is weak or unknown.');

  if (countFieldValidationNeeded(input.observedSignals) > 0)
    bullets.push('Score reduced because field validation has not been attached to key screening signals.');
  if (countValidatorReviewSignals(input.observedSignals) > 0)
    bullets.push('Validator review is recommended before high-stakes external use.');

  if (input.companyDisclosureVague) bullets.push('Score increased slightly because the disclosure text is short or lacks quantified targets.');
  if (input.weatherExplainable) bullets.push('Score reduced because seasonal or weather explanations may apply.');

  if (!bullets.length) bullets.push('Score reflects default transparency weighting — add modules and official records for richer review priority.');
  return bullets;
}

/**
 * Transparent heuristic score (0–100). Higher = more review priority — not a fraud verdict.
 */
export function calculateAnomalyScore(input: AnomalyScoreInput): number {
  const { observedSignals, claim } = input;
  let score = 18;

  if (!observedSignals.length) {
    score = Math.min(score, 22);
    return clamp(score);
  }

  const weakSources = countPreviewOrMetadataOnly(observedSignals);
  const weakRatio = weakSources / Math.max(observedSignals.length, 1);
  score += Math.round(28 * (1 - weakRatio));

  const indep = Math.min(input.independentSourceCount ?? 1, 5);
  score += indep * 6;

  const mod = Math.min(input.independentModuleCount ?? 1, 4);
  score += Math.max(0, mod - 1) * 5;

  if (input.officialRecordSupport) score += 12;
  if (input.repeatedTemporalPattern) score += 10;
  if (input.facilityLocationMatch === 'high') score += 10;
  else if (input.facilityLocationMatch === 'medium') score += 4;
  else if (input.facilityLocationMatch === 'low') score -= 6;

  if (input.companyDisclosureVague) score += 8;
  if (claim.confidenceInClaimRecord === 'low') score += 4;
  if (claim.reportedValue == null || String(claim.reportedValue).trim() === '') score += 3;

  if (input.weatherExplainable) score -= 14;

  const fieldGap = countFieldValidationNeeded(observedSignals);
  if (fieldGap > 0) score += Math.min(8, fieldGap * 3);

  const valGap = countValidatorReviewSignals(observedSignals);
  if (valGap > 0) score += Math.min(6, valGap * 2);

  return clamp(score);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function getAnomalyStatus(
  score: number,
  confidence: DisclosureIntegrityConfidenceLevel,
  validation: AnomalyScoreValidationHint,
): DisclosureIntegrityAnomalyStatus {
  if (validation === 'validator_complete' && confidence === 'field_validated') return 'aligned';
  if (score < 22 && confidence === 'low') return 'insufficient_data';
  if (score < 28) return 'insufficient_data';
  if (validation === 'field_complete' && score < 45) return 'aligned';
  if (validation === 'validator_pending' || validation === 'validator_complete')
    return score >= 62 ? 'high_priority_review' : 'requires_validator_review';
  if (validation === 'field_partial') return 'requires_field_validation';
  if (score >= 78 && (confidence === 'high' || confidence === 'multi_source_supported'))
    return 'high_priority_review';
  if (score >= 55) return 'potential_mismatch';
  if (score >= 38) return 'unresolved_anomaly';
  if (validation === 'none' && score >= 42) return 'requires_field_validation';
  return 'aligned';
}

export function getLegalSafeFindingLabel(status: DisclosureIntegrityAnomalyStatus): string {
  switch (status) {
    case 'aligned':
      return 'Aligned — consistent with available evidence';
    case 'potential_mismatch':
      return 'Potential mismatch — compare claim to observations';
    case 'unresolved_anomaly':
      return 'Unresolved anomaly — further review recommended';
    case 'high_priority_review':
      return 'High-priority review — multiple indicators warrant attention';
    case 'insufficient_data':
      return 'Not enough data — widen sources or time window';
    case 'requires_field_validation':
      return 'Requires field validation';
    case 'requires_validator_review':
      return 'Requires validator review';
    default:
      return 'Not enough data';
  }
}

export function getRecommendedActions(finding: DisclosureIntegrityFinding): string[] {
  const base = [...finding.recommendedActions];
  const push = (s: string) => {
    if (!base.includes(s)) base.push(s);
  };
  switch (finding.anomalyStatus) {
    case 'potential_mismatch':
    case 'unresolved_anomaly':
      push('Cross-check satellite lanes with regulatory filings and independent public records.');
      push('Document limitations and preview-only lanes in the evidence packet.');
      break;
    case 'high_priority_review':
      push('Escalate to qualified validator or counsel — high-priority review queue.');
      break;
    case 'requires_field_validation':
      push('Schedule field sampling or facility walk-down to confirm satellite-indicated signals.');
      break;
    case 'requires_validator_review':
      push('Route packet to validator workflow with source hashes and timestamps preserved.');
      break;
    case 'insufficient_data':
      push('Acquire additional observations or clarify the disclosure record before scoring.');
      break;
    default:
      push('Maintain audit trail even when signals align — transparency supports trust.');
      break;
  }
  return base;
}

/** Merge registry readiness, evidence strength, and explainable anomaly bullets for UI. */
export function enrichDisclosureFinding(finding: DisclosureIntegrityFinding): DisclosureIntegrityFinding {
  const input = deriveAnomalyScoreInputFromFinding(finding);
  const anomalyScore = calculateAnomalyScore(input);
  const withScore = { ...finding, anomalyScore };
  return {
    ...withScore,
    providerReadinessSnapshot: summarizeProviderReadiness(SATELLITE_SOURCE_REGISTRY),
    evidenceStrengthSummary: buildEvidenceStrengthSummary(withScore),
    anomalyScoreExplanations: explainAnomalyScore(withScore),
  };
}

export function getAnomalyBadgeClass(status: DisclosureIntegrityAnomalyStatus): string {
  switch (status) {
    case 'aligned':
      return 'bg-emerald-50 text-emerald-900 border border-emerald-200';
    case 'potential_mismatch':
    case 'unresolved_anomaly':
      return 'bg-amber-50 text-amber-950 border border-amber-200';
    case 'high_priority_review':
      return 'bg-orange-50 text-orange-950 border border-orange-200';
    case 'requires_field_validation':
    case 'requires_validator_review':
      return 'bg-sky-50 text-sky-950 border border-sky-200';
    case 'insufficient_data':
    default:
      return 'bg-slate-50 text-slate-800 border border-slate-200';
  }
}

export function buildExamplePreviewFinding(): DisclosureIntegrityFinding {
  const claim: DisclosureClaim = {
    id: 'claim-preview-1',
    companyName: 'Example Facility — Preview Only',
    facilityName: 'Example Riverfront Station',
    reportingPeriod: 'FY2025 (preview)',
    claimType: 'methane_emissions',
    claimText: 'We report no material abnormal methane releases at this facility for the period.',
    reportedValue: '0',
    reportedUnit: 'anomaly events',
    confidenceInClaimRecord: 'medium',
  };

  const observedSignals: ObservedEnvironmentalSignal[] = [
    {
      id: 'sig-preview-1',
      providerId: 'SENTINEL_5P_TROPOMI',
      providerLabel: 'Sentinel-5P TROPOMI (planned lane)',
      sourceModuleId: 'aquascan_water',
      sourceModuleLabel: 'AquaScan / Water Monitor',
      signalType: 'methane_plume',
      location: 'Near facility fence line (preview coordinates)',
      aoi: '5 km buffer — preview',
      observedDate: new Date().toISOString().slice(0, 10),
      confidenceLevel: SatelliteConfidenceLevel.satellite_indicated,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_field_validation,
      sourceSummary:
        'Satellite-indicated methane enhancement in preview scenario — not verified emissions quantification.',
      limitations: ['Lane is planned on this deployment', 'No facility stack ID linked automatically in preview'],
      previewOnly: true,
    },
    {
      id: 'sig-preview-2',
      providerId: 'EPA_DATASET',
      providerLabel: 'EPA / public record (preview)',
      sourceModuleId: 'envirofacts_geo',
      sourceModuleLabel: 'EPA / Envirofacts Geo',
      signalType: 'air_pollution_hotspot',
      location: 'Facility record neighborhood (preview)',
      aoi: '10 km buffer — preview',
      observedDate: new Date().toISOString().slice(0, 10),
      confidenceLevel: SatelliteConfidenceLevel.multi_source_supported,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_cross_dataset_comparison,
      sourceSummary: 'Official-record context for triage — not an enforcement determination.',
      limitations: ['Preview linkage — verify facility IDs on a configured host'],
      previewOnly: true,
    },
  ];

  const anomalyScore = calculateAnomalyScore({
    observedSignals,
    claim,
    facilityLocationMatch: 'high',
    independentSourceCount: 2,
    independentModuleCount: 2,
    officialRecordSupport: false,
    repeatedTemporalPattern: true,
    companyDisclosureVague: false,
    weatherExplainable: false,
  });

  const confidenceLevel: DisclosureIntegrityConfidenceLevel = 'medium';
  const anomalyStatus: DisclosureIntegrityAnomalyStatus = 'requires_validator_review';

  const draft: DisclosureIntegrityFinding = {
    id: 'finding-preview-1',
    companyName: claim.companyName,
    facilityName: claim.facilityName,
    claim,
    observedSignals,
    anomalyStatus,
    anomalyScore,
    confidenceLevel,
    riskFlags: [
      'Preview scenario — not a live finding',
      'Satellite-indicated plume context requires field validation',
    ],
    recommendedActions: [
      'Treat as investigation lead — not a final determination.',
      'Compare against any filed emissions inventories for the same period.',
    ],
    legalSafeSummary:
      'Observed conditions may warrant review against the disclosure text. DPAL does not infer dishonesty or fraud — status reflects evidence alignment for reviewer follow-up.',
    evidencePacketReady: false,
    blockchainReady: false,
    qrReady: false,
    createdAt: new Date().toISOString(),
  };

  return enrichDisclosureFinding(draft);
}
