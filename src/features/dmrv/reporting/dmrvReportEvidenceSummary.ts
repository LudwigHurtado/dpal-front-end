import { syncThreatsFromReportGaps } from './dmrvReportThreatHeuristics';
import type {
  DmrvBiomassSnapshot,
  DmrvBlockchainAnchor,
  DmrvEvidencePacketSummary,
  DmrvReportEvidenceSummary,
  DmrvSatelliteReview,
  DmrvThreatRecord,
  DmrvValidatorMission,
} from './dmrvReportEvidenceTypes';
import type { DmrvReport, DmrvReportVersion } from './dmrvReportTypes';

const MISSING = 'Missing';

export function ensureReportLedgers(report: DmrvReport): DmrvReport {
  const base: DmrvReport = {
    ...report,
    satelliteReviewHistory: report.satelliteReviewHistory ?? [],
    biomassTimeline: report.biomassTimeline ?? [],
    threatRegister: report.threatRegister ?? [],
    validatorMissions: report.validatorMissions ?? [],
    evidencePackets: report.evidencePackets ?? [],
    blockchainAnchorLedger: report.blockchainAnchorLedger ?? [],
    unanchoredChanges: report.unanchoredChanges ?? report.anchorState?.hasUnanchoredChanges ?? false,
  };
  base.threatRegister = syncThreatsFromReportGaps(base);
  base.evidenceSummary = computeEvidenceSummary(base);
  return base;
}

function latestBiomass(
  timeline: DmrvBiomassSnapshot[],
  type: DmrvBiomassSnapshot['snapshotType'],
): DmrvBiomassSnapshot | undefined {
  return timeline
    .filter((s) => s.snapshotType === type)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
}

function formatBiomass(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return MISSING;
  return `${value.toFixed(1)} t/ha`;
}

export function computeEvidenceSummary(report: DmrvReport): DmrvReportEvidenceSummary {
  const lastReview = report.satelliteReviewHistory
    .slice()
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
  const baseline = latestBiomass(report.biomassTimeline, 'baseline');
  const current = latestBiomass(report.biomassTimeline, 'current');
  const lastBiomass = report.biomassTimeline
    .slice()
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];

  const baselineVal = baseline?.estimatedBiomassTonsPerHa;
  const currentVal = current?.estimatedBiomassTonsPerHa;
  const change =
    baselineVal !== undefined && currentVal !== undefined
      ? `${(currentVal - baselineVal >= 0 ? '+' : '')}${(currentVal - baselineVal).toFixed(1)} t/ha`
      : MISSING;

  const openThreats = report.threatRegister.filter((t) => t.status === 'open' || t.status === 'monitoring');
  const anchoredVersion = report.versions.filter((v) => v.anchored).pop();

  return {
    lastSatelliteReviewAt: lastReview?.reviewedAt?.slice(0, 10) ?? MISSING,
    lastBiomassUpdateAt: lastBiomass?.capturedAt?.slice(0, 10) ?? MISSING,
    baselineBiomassTonsPerHa: formatBiomass(baselineVal),
    currentBiomassTonsPerHa: formatBiomass(currentVal),
    biomassChangeTonsPerHa: change,
    openThreatCount: openThreats.length,
    validatorMissionCount: report.validatorMissions.length,
    evidencePacketCount: report.evidencePackets.length,
    anchoredVersionLabel: anchoredVersion?.label ?? MISSING,
    verifierReadinessGaps: buildVerifierGaps(report, openThreats),
  };
}

function buildVerifierGaps(report: DmrvReport, openThreats: DmrvThreatRecord[]): string[] {
  const gaps: string[] = [];
  if (!report.satelliteReviewHistory.length) {
    gaps.push('No satellite review on record');
  }
  if (!report.biomassTimeline.some((b) => b.snapshotType === 'baseline')) {
    gaps.push('Baseline biomass not configured');
  }
  if (!report.biomassTimeline.some((b) => b.snapshotType === 'current')) {
    gaps.push('Current biomass not calculated');
  }
  if (report.fieldPlotContext.plotCount === 0) {
    gaps.push('Field plot ground truth incomplete');
  }
  if (report.methodologyContext.status === 'missing') {
    gaps.push('Methodology not linked');
  }
  if (report.validationContext.humanVerificationRequired && report.validationContext.status !== 'complete') {
    gaps.push('Human verification required before VVB handoff');
  }
  if (openThreats.length > 0) {
    gaps.push(`${openThreats.length} open threat(s) in register`);
  }
  if (report.unanchoredChanges) {
    gaps.push('Unanchored changes since last anchor');
  }
  if (report.evidencePackets.length === 0) {
    gaps.push('No verifier evidence packet generated');
  }
  return gaps.slice(0, 12);
}

export function anchoredVersionLabel(versions: DmrvReportVersion[]): string {
  const anchored = versions.filter((v) => v.anchored);
  return anchored[anchored.length - 1]?.label ?? MISSING;
}

export function lastSatelliteReview(reviews: DmrvSatelliteReview[]): DmrvSatelliteReview | undefined {
  return reviews.slice().sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
}

export function openThreatCount(threats: DmrvThreatRecord[]): number {
  return threats.filter((t) => t.status === 'open' || t.status === 'monitoring').length;
}

export function activeValidatorMissions(missions: DmrvValidatorMission[]): number {
  return missions.filter((m) => m.missionStatus !== 'accepted' && m.missionStatus !== 'rejected').length;
}
