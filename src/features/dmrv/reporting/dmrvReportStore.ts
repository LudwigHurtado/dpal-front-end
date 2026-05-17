import { buildDmrvReport, type DmrvReportBuildOverrides } from './dmrvReportBuilder';
import { ensureReportLedgers } from './dmrvReportEvidenceSummary';
import { emitDmrvReportDirty, emitDmrvReportUpdated, DMRV_REPORT_DIRTY_EVENT, DMRV_REPORT_UPDATED_EVENT } from './dmrvReportEvents';
import { computeDmrvReportJsonHashSync } from './dmrvReportHash';
import type {
  DmrvAuditEvent,
  DmrvReport,
  DmrvReportBlockchainAnchor,
  DmrvReportSyncMeta,
  DmrvReportVersion,
} from './dmrvReportTypes';

const STORAGE_KEY = 'dpal_dmrv_live_reports_v1';

function readAll(): Record<string, DmrvReport> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DmrvReport>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, DmrvReport>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function auditId(): string {
  return `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function anchorId(): string {
  return `anchor-${Date.now().toString(36)}`;
}

function versionId(): string {
  return `ver-${Date.now().toString(36)}`;
}

function migrateReport(report: DmrvReport): DmrvReport {
  const hash = computeDmrvReportJsonHashSync(report);
  const versions = report.versions ?? [];
  const blockchainAnchors = report.blockchainAnchors ?? [];
  const lastAnchor = blockchainAnchors[blockchainAnchors.length - 1];
  const anchorState = report.anchorState ?? {
    currentReportHash: hash,
    lastAnchoredHash: lastAnchor?.reportJsonHash,
    lastAnchoredVersionId: lastAnchor?.versionId,
    lastAnchoredAt: lastAnchor?.timestamp,
    evidencePacketHash: lastAnchor?.evidenceBundleHash,
    hasUnanchoredChanges: Boolean(lastAnchor && lastAnchor.reportJsonHash !== hash),
  };
  const withLedgers: DmrvReport = {
    ...report,
    satelliteReviewHistory: report.satelliteReviewHistory ?? [],
    biomassTimeline: report.biomassTimeline ?? [],
    threatRegister: report.threatRegister ?? [],
    validatorMissions: report.validatorMissions ?? [],
    evidencePackets: report.evidencePackets ?? [],
    blockchainAnchorLedger: report.blockchainAnchorLedger ?? [],
    unanchoredChanges: report.unanchoredChanges ?? anchorState.hasUnanchoredChanges,
    versions,
    blockchainAnchors,
    anchorState: { ...anchorState, currentReportHash: hash },
  };
  return ensureReportLedgers(withLedgers);
}

function appendAudit(report: DmrvReport, meta: DmrvReportSyncMeta): DmrvAuditEvent[] {
  if (!meta.changeSummary.trim()) return report.auditTrail;
  const event: DmrvAuditEvent = {
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: meta.actor ?? 'system',
    workflowStep: meta.workflowStep,
    fieldChanged: meta.fieldChanged ?? meta.workflowStep,
    previousSummary: meta.previousSummary,
    newSummary: meta.changeSummary,
    sourceEvidenceId: meta.sourceEvidenceId,
    hash: meta.hash,
  };
  return [...report.auditTrail, event].slice(-200);
}

function withAnchorState(report: DmrvReport): DmrvReport {
  const hash = computeDmrvReportJsonHashSync(report);
  const lastAnchor = report.blockchainAnchors[report.blockchainAnchors.length - 1];
  return {
    ...report,
    anchorState: {
      currentReportHash: hash,
      lastAnchoredHash: lastAnchor?.reportJsonHash,
      lastAnchoredVersionId: lastAnchor?.versionId,
      lastAnchoredAt: lastAnchor?.timestamp,
      evidencePacketHash: lastAnchor?.evidenceBundleHash,
      hasUnanchoredChanges: Boolean(lastAnchor && lastAnchor.reportJsonHash !== hash),
    },
  };
}

function persistReport(projectId: string, report: DmrvReport, emitUpdate = true): DmrvReport {
  const map = readAll();
  map[projectId] = report;
  writeAll(map);
  if (emitUpdate) emitDmrvReportUpdated(projectId);
  return report;
}

export type { DmrvReportBuildOverrides };

export function getDmrvReport(projectId: string): DmrvReport | null {
  const raw = readAll()[projectId];
  return raw ? migrateReport(raw) : null;
}

/** Rebuild report from workflow stores + optional in-form drafts — no audit trail entry. */
export function rebuildDmrvReportSilent(
  projectId: string,
  overrides?: DmrvReportBuildOverrides,
): DmrvReport {
  const previous = getDmrvReport(projectId);
  const built = buildDmrvReport(projectId, previous, overrides);
  const next = withAnchorState(migrateReport(built));
  return persistReport(projectId, next);
}

/** Patch evidence ledgers without wiping workflow-derived sections. */
export function patchDmrvReport(
  projectId: string,
  mutator: (report: DmrvReport) => DmrvReport,
  meta?: Partial<DmrvReportSyncMeta>,
): DmrvReport {
  rebuildDmrvReportSilent(projectId);
  const current = getDmrvReport(projectId);
  if (!current) return rebuildAndPersistDmrvReport(projectId, meta);
  let next = mutator(current);
  if (meta?.changeSummary) {
    next = {
      ...next,
      auditTrail: appendAudit(next, {
        workflowStep: meta.workflowStep ?? 'evidence-engine',
        changeSummary: meta.changeSummary,
        actor: meta.actor,
        fieldChanged: meta.fieldChanged,
        previousSummary: meta.previousSummary,
        sourceEvidenceId: meta.sourceEvidenceId,
        hash: meta.hash,
      }),
    };
  }
  next = withAnchorState(ensureReportLedgers(next));
  return persistReport(projectId, next);
}

export function rebuildAndPersistDmrvReport(
  projectId: string,
  meta?: Partial<DmrvReportSyncMeta>,
  overrides?: DmrvReportBuildOverrides,
): DmrvReport {
  const previous = getDmrvReport(projectId);
  let next = migrateReport(buildDmrvReport(projectId, previous, overrides));
  if (meta?.changeSummary) {
    next = {
      ...next,
      auditTrail: appendAudit(next, {
        workflowStep: meta.workflowStep ?? 'system',
        changeSummary: meta.changeSummary,
        actor: meta.actor,
        fieldChanged: meta.fieldChanged,
        previousSummary: meta.previousSummary,
        sourceEvidenceId: meta.sourceEvidenceId,
        hash: meta.hash,
      }),
    };
  }
  next = withAnchorState(next);
  persistReport(projectId, next);
  return next;
}

export function saveReportSnapshot(
  projectId: string,
  label: string,
  workflowStep: string,
): DmrvReport {
  const report = rebuildAndPersistDmrvReport(projectId, {
    workflowStep,
    changeSummary: `Report snapshot: ${label}`,
    actor: 'user',
    hash: undefined,
  });
  const hash = computeDmrvReportJsonHashSync(report);
  const ver: DmrvReportVersion = {
    versionId: versionId(),
    label,
    versionNumber: nextVersionNumber(report.versions),
    createdAt: new Date().toISOString(),
    reportJsonHash: hash,
    changeSummary: label,
    workflowStep,
    anchored: false,
  };
  const next = withAnchorState({
    ...report,
    version: ver.versionNumber,
    versions: [...report.versions, ver].slice(-30),
    auditTrail: appendAudit(report, {
      workflowStep,
      changeSummary: `Version saved: ${label}`,
      actor: 'user',
      hash,
    }),
  });
  void import('./dmrvReportEvents').then(({ dispatchDmrvReportEvent }) => {
    void import('./dmrvReportEvidenceTypes').then(({ DMRV_REPORT_EVENT_TYPES }) => {
      dispatchDmrvReportEvent(projectId, DMRV_REPORT_EVENT_TYPES.REPORT_VERSION_SAVED, {
        versionId: ver.versionId,
        label,
      });
    });
  });
  return persistReport(projectId, next);
}

function nextVersionNumber(versions: DmrvReportVersion[]): string {
  if (versions.length === 0) return '0.1';
  const last = versions[versions.length - 1]?.versionNumber ?? '0.1';
  const n = Number.parseFloat(last);
  if (Number.isFinite(n)) return (Math.round((n + 0.1) * 10) / 10).toFixed(1);
  return `${versions.length + 1}.0`;
}

export async function anchorReportVersion(
  projectId: string,
  targetVersionId: string,
  opts?: {
    evidencePacketId?: string;
    evidenceBundleHash?: string;
    actor?: DmrvReportSyncMeta['actor'];
    transactionRef?: string;
  },
): Promise<DmrvReport> {
  const report = rebuildAndPersistDmrvReport(projectId);
  const version = report.versions.find((v) => v.versionId === targetVersionId);
  const hash = version?.reportJsonHash ?? report.anchorState.currentReportHash;
  const anchor: DmrvReportBlockchainAnchor = {
    anchorId: anchorId(),
    reportId: report.reportId,
    versionId: targetVersionId,
    evidencePacketId: opts?.evidencePacketId ?? report.evidenceContext.evidencePacketIds[0],
    reportJsonHash: hash,
    evidenceBundleHash: opts?.evidenceBundleHash,
    timestamp: new Date().toISOString(),
    actor: opts?.actor ?? 'user',
    transactionRef: opts?.transactionRef,
    status: 'anchored',
  };
  const versions = report.versions.map((v) =>
    v.versionId === targetVersionId ? { ...v, anchored: true } : v,
  );
  let next: DmrvReport = {
    ...report,
    versions,
    blockchainAnchors: [...report.blockchainAnchors, anchor].slice(-50),
    blockchainContext: {
      ...report.blockchainContext,
      projectHash: hash,
      ledgerRecordId: opts?.transactionRef ?? report.blockchainContext.ledgerRecordId,
      status: 'complete',
    },
    auditTrail: appendAudit(report, {
      workflowStep: 'blockchain-anchor',
      changeSummary: `Blockchain anchor recorded for ${version?.label ?? targetVersionId}`,
      actor: opts?.actor ?? 'user',
      hash,
    }),
  };
  next = withAnchorState(next);
  return persistReport(projectId, next);
}

export function exportDmrvReportJson(projectId: string): string {
  const report = rebuildAndPersistDmrvReport(projectId);
  return JSON.stringify(
    {
      report,
      versions: report.versions,
      blockchainAnchors: report.blockchainAnchors,
      interoperability: report.interoperabilityContext.metadata,
      auditTrail: report.auditTrail,
    },
    null,
    2,
  );
}

export function subscribeDmrvReport(
  projectId: string,
  listener: () => void,
): () => void {
  const onEvent = (e: Event) => {
    const detail = (e as CustomEvent<{ projectId?: string }>).detail;
    if (!detail?.projectId || detail.projectId === projectId) listener();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(DMRV_REPORT_UPDATED_EVENT, onEvent);
    window.addEventListener(DMRV_REPORT_DIRTY_EVENT, onEvent);
    window.addEventListener('storage', onStorage);
  }
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(DMRV_REPORT_UPDATED_EVENT, onEvent);
      window.removeEventListener(DMRV_REPORT_DIRTY_EVENT, onEvent);
      window.removeEventListener('storage', onStorage);
    }
  };
}
