import type { DmrvInputConfig } from '../services/dmrvInputConfigTypes';
import { ensureReportLedgers } from './dmrvReportEvidenceSummary';
import type {
  DmrvBiomassSnapshot,
  DmrvBlockchainAnchor,
  DmrvEvidencePacketSummary,
  DmrvReportEventType,
  DmrvSatelliteReview,
  DmrvThreatRecord,
  DmrvValidatorMission,
} from './dmrvReportEvidenceTypes';
import { DMRV_REPORT_EVENT_TYPES } from './dmrvReportEvidenceTypes';
import {
  getDmrvReport,
  patchDmrvReport,
  rebuildAndPersistDmrvReport,
  rebuilDMRVReportSilent,
} from './dmrvReportStore';
import { dispatchDmrvReportEvent } from './dmrvReportEvents';
import type { DmrvReport, DmrvReportSyncMeta } from './dmrvReportTypes';

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function persistLedgers(
  projectId: string,
  mutate: (report: DmrvReport) => Partial<DmrvReport>,
  meta: Partial<DmrvReportSyncMeta>,
  markUnanchored = true,
): DmrvReport {
  return patchDmrvReport(
    projectId,
    (current) => {
      const patch = mutate(current);
      let next: DmrvReport = { ...current, ...patch };
      if (markUnanchored) {
        next = {
          ...next,
          unanchoredChanges: true,
          anchorState: { ...next.anchorState, hasUnanchoredChanges: true },
        };
      }
      return next;
    },
    meta,
  );
}

export function appendSatelliteReviewToReport(
  projectId: string,
  review: Omit<DmrvSatelliteReview, 'reviewId' | 'projectId' | 'reportId'> & { reviewId?: string },
): DmrvReport {
  const report = getDmrvReport(projectId) ?? rebuilDMRVReportSilent(projectId);
  const row: DmrvSatelliteReview = {
    reviewId: review.reviewId ?? id('sat-review'),
    projectId,
    reportId: report.reportId,
    ...review,
  };
  const updated = persistLedgers(
    projectId,
    (r) => ({
      satelliteReviewHistory: [...r.satelliteReviewHistory, row].slice(-40),
    }),
    {
      workflowStep: 'satellite-review',
      changeSummary: `Satellite review recorded: ${row.satellite} — ${row.status}`,
      actor: 'user',
      fieldChanged: 'satelliteReviewHistory',
    },
  );
  dispatchDmrvReportEvent(projectId, DMRV_REPORT_EVENT_TYPES.SATELLITE_REVIEW_COMPLETED, { reviewId: row.reviewId });
  return updated;
}

export function appendBiomassSnapshotToReport(
  projectId: string,
  snapshot: Omit<DmrvBiomassSnapshot, 'snapshotId' | 'projectId' | 'reportId'> & { snapshotId?: string },
): DmrvReport {
  const report = getDmrvReport(projectId) ?? rebuilDMRVReportSilent(projectId);
  const row: DmrvBiomassSnapshot = {
    snapshotId: snapshot.snapshotId ?? id('biomass'),
    projectId,
    reportId: report.reportId,
    ...snapshot,
  };
  const eventType =
    row.snapshotType === 'baseline'
      ? DMRV_REPORT_EVENT_TYPES.BIOMASS_BASELINE_CREATED
      : row.snapshotType === 'current'
        ? DMRV_REPORT_EVENT_TYPES.BIOMASS_CURRENT_UPDATED
        : DMRV_REPORT_EVENT_TYPES.BIOMASS_COMPARISON_CREATED;

  const updated = persistLedgers(
    projectId,
    (r) => {
      const withoutType = r.biomassTimeline.filter(
        (b) => !(b.snapshotType === row.snapshotType && row.snapshotType !== 'comparison'),
      );
      return { biomassTimeline: [...withoutType, row].slice(-30) };
    },
    {
      workflowStep: 'biomass',
      changeSummary: `Biomass ${row.snapshotType} snapshot: ${row.estimatedBiomassTonsPerHa ?? 'Not Yet Configured'} t/ha`,
      actor: 'user',
      fieldChanged: 'biomassTimeline',
    },
  );
  dispatchDmrvReportEvent(projectId, eventType, { snapshotId: row.snapshotId });
  return updated;
}

export function appendThreatToReport(
  projectId: string,
  threat: Omit<DmrvThreatRecord, 'threatId' | 'projectId' | 'reportId' | 'detectedAt'> & { threatId?: string },
): DmrvReport {
  const report = getDmrvReport(projectId) ?? rebuilDMRVReportSilent(projectId);
  const row: DmrvThreatRecord = {
    threatId: threat.threatId ?? id('threat'),
    projectId,
    reportId: report.reportId,
    detectedAt: new Date().toISOString(),
    ...threat,
  };
  const updated = persistLedgers(
    projectId,
    (r) => ({ threatRegister: [...r.threatRegister.filter((t) => t.threatId !== row.threatId), row] }),
    {
      workflowStep: 'threat-register',
      changeSummary: `Threat registered: ${row.threatType} — ${row.severity}`,
      actor: 'system',
      fieldChanged: 'threatRegister',
    },
  );
  dispatchDmrvReportEvent(projectId, DMRV_REPORT_EVENT_TYPES.THREAT_DETECTED, { threatId: row.threatId });
  return updated;
}

export function createValidatorMissionInReport(
  projectId: string,
  mission: Omit<DmrvValidatorMission, 'missionId' | 'projectId' | 'reportId' | 'createdAt' | 'missionStatus' | 'evidenceCollected'> & {
    missionId?: string;
    missionStatus?: DmrvValidatorMission['missionStatus'];
    evidenceCollected?: string[];
  },
): DmrvReport {
  const report = getDmrvReport(projectId) ?? rebuilDMRVReportSilent(projectId);
  const row: DmrvValidatorMission = {
    missionId: mission.missionId ?? id('mission'),
    projectId,
    reportId: report.reportId,
    createdAt: new Date().toISOString(),
    missionStatus: mission.missionStatus ?? 'draft',
    evidenceCollected: mission.evidenceCollected ?? [],
    ...mission,
  };
  const updated = persistLedgers(
    projectId,
    (r) => ({ validatorMissions: [...r.validatorMissions, row].slice(-50) }),
    {
      workflowStep: 'validator-mission',
      changeSummary: `Validator mission created: ${row.title}`,
      actor: 'user',
      fieldChanged: 'validatorMissions',
    },
  );
  dispatchDmrvReportEvent(projectId, DMRV_REPORT_EVENT_TYPES.VALIDATOR_MISSION_CREATED, { missionId: row.missionId });
  return updated;
}

export function completeValidatorMissionInReport(
  projectId: string,
  missionId: string,
  patch: Partial<Pick<DmrvValidatorMission, 'missionStatus' | 'submittedAt' | 'evidenceCollected' | 'validatorNotes' | 'reviewerDecision'>>,
): DmrvReport {
  const updated = persistLedgers(
    projectId,
    (r) => ({
      validatorMissions: r.validatorMissions.map((m) =>
        m.missionId === missionId
          ? {
              ...m,
              ...patch,
              submittedAt: patch.submittedAt ?? m.submittedAt ?? new Date().toISOString(),
            }
          : m,
      ),
    }),
    {
      workflowStep: 'validator-mission',
      changeSummary: `Validator mission updated: ${missionId}`,
      actor: 'user',
      fieldChanged: 'validatorMissions',
    },
  );
  dispatchDmrvReportEvent(projectId, DMRV_REPORT_EVENT_TYPES.VALIDATOR_MISSION_COMPLETED, { missionId });
  return updated;
}

export function appendEvidencePacketToReport(
  projectId: string,
  packet: Omit<DmrvEvidencePacketSummary, 'createdAt' | 'status'> & { status?: DmrvEvidencePacketSummary['status'] },
): DmrvReport {
  const row: DmrvEvidencePacketSummary = {
    createdAt: new Date().toISOString(),
    status: packet.status ?? 'generated',
    ...packet,
  };
  const updated = persistLedgers(
    projectId,
    (r) => ({
      evidencePackets: [...r.evidencePackets.filter((p) => p.packetId !== row.packetId), row],
    }),
    {
      workflowStep: 'evidence-packet',
      changeSummary: `Evidence packet linked: ${row.packetId}`,
      actor: 'user',
      sourceEvidenceId: row.packetId,
      fieldChanged: 'evidencePackets',
    },
  );
  dispatchDmrvReportEvent(projectId, DMRV_REPORT_EVENT_TYPES.EVIDENCE_PACKET_GENERATED, { packetId: row.packetId });
  return updated;
}

export function appendBlockchainAnchorToReport(
  projectId: string,
  anchor: Omit<DmrvBlockchainAnchor, 'anchorId' | 'createdAt' | 'status'> & { anchorId?: string },
  opts?: { skipUnanchoredFlag?: boolean },
): DmrvReport {
  const row: DmrvBlockchainAnchor = {
    anchorId: anchor.anchorId ?? id('anchor'),
    createdAt: new Date().toISOString(),
    status: 'anchored',
    ...anchor,
  };
  const updated = persistLedgers(
    projectId,
    (r) => ({
      blockchainAnchorLedger: [...r.blockchainAnchorLedger, row].slice(-80),
      unanchoredChanges: opts?.skipUnanchoredFlag ? r.unanchoredChanges : false,
      anchorState: opts?.skipUnanchoredFlag
        ? r.anchorState
        : {
            ...r.anchorState,
            hasUnanchoredChanges: false,
            lastAnchoredHash: row.reportJsonHash ?? r.anchorState.lastAnchoredHash,
            lastAnchoredAt: row.createdAt,
          },
    }),
    {
      workflowStep: 'blockchain-anchor',
      changeSummary: `Blockchain anchor (${row.anchorType}): ${row.sourceObjectId}`,
      actor: 'system',
      hash: row.reportJsonHash,
      fieldChanged: 'blockchainAnchorLedger',
    },
    !opts?.skipUnanchoredFlag,
  );
  dispatchDmrvReportEvent(projectId, DMRV_REPORT_EVENT_TYPES.BLOCKCHAIN_ANCHOR_CREATED, { anchorId: row.anchorId });
  return updated;
}

/** Build satellite review row from saved satellite input config (no invented scene metrics). */
export function satelliteReviewFromInputConfig(
  config: DmrvInputConfig,
  opts?: { ok?: boolean; message?: string; sceneAutofill?: boolean },
): Omit<DmrvSatelliteReview, 'reviewId' | 'projectId' | 'reportId'> {
  const ds = config.dataSourceSettings;
  const provider = String(ds.provider ?? '').trim() || 'Not Yet Configured';
  const satellites = String(ds.selectedSatellites ?? '').trim();
  const indices: string[] = [];
  if (ds.ndviFormula) indices.push('NDVI');
  if (ds.ndwiFormula) indices.push('NDWI');
  if (ds.nbrFormula) indices.push('NBR');
  if (ds.ndmiFormula) indices.push('NDMI');
  const cloudRaw = ds.cloudCoverLimit;
  const cloudCover =
    typeof cloudRaw === 'number' ? cloudRaw : typeof cloudRaw === 'string' && cloudRaw.trim() ? Number(cloudRaw) : undefined;

  const sceneIds: string[] = [];
  if (ds.sceneId) sceneIds.push(String(ds.sceneId));
  if (ds.collection) sceneIds.push(String(ds.collection));

  const status: DmrvSatelliteReview['status'] =
    opts?.ok === false ? 'failed' : opts?.sceneAutofill ? 'needs_review' : opts?.ok ? 'passed' : 'needs_review';

  return {
    reviewedAt: new Date().toISOString(),
    satellite: satellites || config.inputLabel,
    sensor: String(ds.collection ?? '').trim() || undefined,
    provider,
    sceneIds,
    indices: indices.length ? indices : ['Not Yet Configured'],
    cloudCover: Number.isFinite(cloudCover) ? cloudCover : undefined,
    resultSummary: opts?.message ?? (opts?.sceneAutofill ? 'Scene configuration applied — execute live scan when API is ready.' : 'Satellite data source configuration recorded.'),
    findings: satellites ? [`Selected sources: ${satellites}`] : ['No satellite sources selected yet'],
    limitations: [
      'Scene-level statistics require Earth Observation scan on configured API host.',
      'DPAL does not invent biomass or carbon quantities from configuration alone.',
    ],
    status,
    evidenceIds: [config.inputKey],
  };
}

export function biomassSnapshotFromCalculation(
  projectId: string,
  snapshotType: DmrvBiomassSnapshot['snapshotType'],
  outputs: Record<string, string | number>,
  inputs: Record<string, string | number | boolean>,
  methodLabel: string,
): Omit<DmrvBiomassSnapshot, 'snapshotId' | 'projectId' | 'reportId'> {
  const num = (key: string): number | undefined => {
    const v = outputs[key] ?? inputs[key];
    const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? n : undefined;
  };
  const biomass = num('biomassTHa') ?? num('estimatedBiomassTonsPerHa') ?? num('biomass');
  const carbon = num('carbonTonsPerHa') ?? num('tCPerHa');
  const co2e = num('co2eTons') ?? num('estimatedCo2e');

  return {
    capturedAt: new Date().toISOString(),
    snapshotType,
    estimatedBiomassTonsPerHa: biomass,
    estimatedCarbonTonsPerHa: carbon,
    estimatedCo2e: co2e,
    meanNdvi: num('ndvi'),
    calculationMethod: methodLabel || 'Not Yet Configured',
    confidence: biomass !== undefined ? 'medium' : 'low',
    limitations: biomass === undefined ? ['Biomass value not computed — enter inputs in methodology calculator'] : ['Indicative estimate — verifier review required'],
    evidenceIds: ['biomass-data'],
  };
}

export function suggestValidatorMissionFromThreat(
  projectId: string,
  threat: DmrvThreatRecord,
): DmrvReport {
  return createValidatorMissionInReport(projectId, {
    missionType: threat.threatType === 'data_gap' ? 'field_plot_verification' : 'threat_inspection',
    title: `Inspect: ${threat.threatType.replace(/_/g, ' ')}`,
    description: threat.recommendedAction,
    linkedThreatId: threat.threatId,
    missionStatus: 'draft',
  });
}

export function processDmrvReportEvent(
  projectId: string,
  eventType: DmrvReportEventType,
  payload: Record<string, unknown>,
): DmrvReport | null {
  switch (eventType) {
    case DMRV_REPORT_EVENT_TYPES.REPORT_VERSION_SAVED:
    case DMRV_REPORT_EVENT_TYPES.REPORT_VERSION_LOCKED:
      dispatchDmrvReportEvent(projectId, eventType, payload);
      return getDmrvReport(projectId);
    default:
      return getDmrvReport(projectId);
  }
}

export function recordSatelliteReviewFromConfig(
  config: DmrvInputConfig,
  opts?: { ok?: boolean; message?: string; sceneAutofill?: boolean },
): DmrvReport {
  const review = satelliteReviewFromInputConfig(config, opts);
  const report = appendSatelliteReviewToReport(config.projectId, review);
  if (opts?.ok || opts?.sceneAutofill) {
    const row = report.satelliteReviewHistory[report.satelliteReviewHistory.length - 1];
    if (row) {
      appendBlockchainAnchorToReport(
        config.projectId,
        {
          reportId: report.reportId,
          version: report.version,
          anchorType: 'satellite_review',
          sourceObjectId: row.reviewId,
          reportJsonHash: row.hash,
        },
        { skipUnanchoredFlag: true },
      );
    }
  }
  return getDmrvReport(config.projectId) ?? report;
}

export function recordBiomassFromMethodologyCalc(
  projectId: string,
  snapshotType: DmrvBiomassSnapshot['snapshotType'],
  outputs: Record<string, string | number>,
  inputs: Record<string, string | number | boolean>,
  methodLabel: string,
): DmrvReport {
  const snapshot = biomassSnapshotFromCalculation(projectId, snapshotType, outputs, inputs, methodLabel);
  const report = appendBiomassSnapshotToReport(projectId, snapshot);
  const row = report.biomassTimeline[report.biomassTimeline.length - 1];
  if (row?.estimatedBiomassTonsPerHa !== undefined) {
    appendBlockchainAnchorToReport(
      projectId,
      {
        reportId: report.reportId,
        version: report.version,
        anchorType: 'biomass_snapshot',
        sourceObjectId: row.snapshotId,
      },
      { skipUnanchoredFlag: true },
    );
  }
  return getDmrvReport(projectId) ?? report;
}

