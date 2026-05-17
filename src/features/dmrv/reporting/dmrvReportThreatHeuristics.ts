import type { DmrvThreatRecord } from './dmrvReportEvidenceTypes';
import type { DmrvReport } from './dmrvReportTypes';

function threatId(prefix: string): string {
  return `threat-${prefix}-${Date.now().toString(36)}`;
}

/** Upsert system-detected threats from report gaps — does not invent measurements. */
export function syncThreatsFromReportGaps(report: DmrvReport): DmrvThreatRecord[] {
  const existing = [...report.threatRegister];
  const byKey = new Map(existing.map((t) => [`${t.threatType}:${t.description}`, t]));

  const upsert = (
    partial: Omit<DmrvThreatRecord, 'threatId' | 'projectId' | 'reportId' | 'detectedAt' | 'evidenceIds'> & {
      key: string;
      evidenceIds?: string[];
    },
  ) => {
    const { key, evidenceIds, ...rest } = partial;
    const found = byKey.get(`${rest.threatType}:${rest.description}`);
    if (found) {
      if (found.status === 'resolved' || found.status === 'dismissed') return;
      Object.assign(found, rest);
      return;
    }
    const row: DmrvThreatRecord = {
      threatId: threatId(rest.threatType),
      projectId: report.projectId,
      reportId: report.reportId,
      detectedAt: new Date().toISOString(),
      evidenceIds: evidenceIds ?? [],
      ...rest,
    };
    existing.push(row);
    byKey.set(key, row);
  };

  if (!report.satelliteReviewHistory.length) {
    upsert({
      key: 'data_gap:no_satellite',
      threatType: 'data_gap',
      severity: 'medium',
      source: 'satellite',
      description: 'No satellite review has been recorded for this project.',
      recommendedAction: 'Run satellite scene configuration or Earth Observation screening and save results to the living report.',
      status: 'open',
    });
  }

  const lastReview = report.satelliteReviewHistory[report.satelliteReviewHistory.length - 1];
  if (lastReview?.status === 'needs_review' || lastReview?.status === 'flagged') {
    upsert({
      key: 'methodology_gap:review_flag',
      threatType: 'methodology_gap',
      severity: 'medium',
      source: 'satellite',
      description: lastReview.resultSummary || 'Latest satellite review flagged for human review.',
      recommendedAction: 'Review findings and create a validator mission if ground truth is required.',
      status: 'open',
      linkedSatelliteReviewId: lastReview.reviewId,
    });
  }

  if (lastReview?.cloudCover !== undefined && lastReview.cloudCover > 40) {
    upsert({
      key: 'cloud_gap:high_cloud',
      threatType: 'cloud_gap',
      severity: 'low',
      source: 'satellite',
      description: `Cloud cover limit may be exceeded (${lastReview.cloudCover}% recorded).`,
      recommendedAction: 'Adjust scene dates or cloud filter; document limitation in evidence packet.',
      status: 'monitoring',
      linkedSatelliteReviewId: lastReview.reviewId,
    });
  }

  if (!report.biomassTimeline.some((b) => b.snapshotType === 'baseline')) {
    upsert({
      key: 'data_gap:no_baseline_biomass',
      threatType: 'data_gap',
      severity: 'medium',
      source: 'user',
      description: 'Baseline biomass snapshot is missing.',
      recommendedAction: 'Calculate or enter baseline biomass using methodology counsel or field plots.',
      status: 'open',
    });
  }

  if (!report.biomassTimeline.some((b) => b.snapshotType === 'current')) {
    upsert({
      key: 'data_gap:no_current_biomass',
      threatType: 'data_gap',
      severity: 'medium',
      source: 'user',
      description: 'Current monitoring biomass has not been calculated.',
      recommendedAction: 'Run current biomass estimate after latest satellite review or field calibration.',
      status: 'open',
    });
  }

  if (report.fieldPlotContext.plotCount === 0) {
    upsert({
      key: 'data_gap:no_field_plots',
      threatType: 'data_gap',
      severity: 'high',
      source: 'field_plot',
      description: 'No field plots configured for ground-truth validation.',
      recommendedAction: 'Create Validator Mission: verify field plot sampling method and geo-tagged evidence.',
      status: 'open',
    });
  }

  if (report.methodologyContext.status === 'missing') {
    upsert({
      key: 'methodology_gap:unlinked',
      threatType: 'methodology_gap',
      severity: 'high',
      source: 'user',
      description: 'Methodology is not linked to validation rules and calculations.',
      recommendedAction: 'Select a methodology preset and align validation rules before verifier review.',
      status: 'open',
    });
  }

  if (report.unanchoredChanges) {
    upsert({
      key: 'permanence_risk:unanchored',
      threatType: 'permanence_risk',
      severity: 'low',
      source: 'user',
      description: 'Report has changes that have not yet been anchored to the blockchain ledger.',
      recommendedAction: 'Anchor a report snapshot after major workflow steps.',
      status: 'open',
    });
  }

  return existing.slice(-80);
}
