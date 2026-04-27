import type { BuildCarbReportInput, CarbSpecializedReport } from '../types/carbReport';
import { buildCarbReportUrl, buildCarbSituationRoomUrl } from '../utils/qrUtils';

const STORAGE_KEY = 'dpal_carb_specialized_reports_v1';
const REPORT_MODULE = 'DPAL CARB Specialized Emissions Report';

function readReports(): CarbSpecializedReport[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CarbSpecializedReport[]) : [];
  } catch {
    return [];
  }
}

function writeReports(reports: CarbSpecializedReport[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function buildReportId(facilityId?: string): string {
  const scope = (facilityId || 'CARB').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 28);
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `CRB-${scope}-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function buildRoomId(reportId: string, facilityId?: string): string {
  const scope = (facilityId || reportId).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 24);
  return `carb-room-${scope}-${reportId.slice(-8).toLowerCase()}`;
}

export function listCarbReports(): CarbSpecializedReport[] {
  return readReports().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getCarbReport(reportId: string): CarbSpecializedReport | null {
  return readReports().find((report) => report.reportId === reportId) ?? null;
}

export function getCarbReportByRoomId(roomId: string): CarbSpecializedReport | null {
  return readReports().find((report) => report.situationRoom.roomId === roomId) ?? null;
}

export function saveCarbReport(report: CarbSpecializedReport): CarbSpecializedReport {
  const reports = readReports();
  const next = [report, ...reports.filter((entry) => entry.reportId !== report.reportId)];
  writeReports(next);
  return report;
}

export function updateCarbReport(
  reportId: string,
  updater: (current: CarbSpecializedReport) => CarbSpecializedReport,
): CarbSpecializedReport | null {
  const reports = readReports();
  const index = reports.findIndex((report) => report.reportId === reportId);
  if (index < 0) return null;
  reports[index] = updater(reports[index]);
  writeReports(reports);
  return reports[index];
}

export function buildCarbReport(input: BuildCarbReportInput): CarbSpecializedReport {
  const reportId = buildReportId(input.facilityIdentity.facilityId);
  const roomId = buildRoomId(reportId, input.facilityIdentity.facilityId);
  const createdAt = new Date().toISOString();
  const reportUrl = buildCarbReportUrl(reportId);

  return {
    reportId,
    auditId: input.auditId || `CARB-${Date.now()}`,
    module: REPORT_MODULE,
    createdAt,
    createdBy: input.createdBy,
    facilityIdentity: input.facilityIdentity,
    location: input.location,
    reportingYears: input.reportingYears,
    emissionsComparison: input.emissionsComparison,
    gasBreakdown: input.gasBreakdown,
    companyClaim: input.companyClaim,
    claimVerificationResult: input.claimVerificationResult,
    claimGapPct: input.claimGapPct,
    integrityScore: input.integrityScore,
    riskLevel: input.riskLevel,
    sourceMode: input.sourceMode,
    datasetVersion: input.datasetVersion,
    retrievalDate: input.retrievalDate,
    dataSources: input.dataSources,
    legalContext: input.legalContext,
    limitations: input.limitations,
    verificationChecklist: input.verificationChecklist,
    recommendedNextSteps: input.recommendedNextSteps,
    aiNarrative: input.aiNarrative,
    hashes: {
      reportPayloadHash: 'Pending generation',
    },
    ledger: {
      blockId: 'Pending connection',
      chainName: 'DPAL Evidence Ledger',
      chainType: 'internal-hash-chain',
      verificationStatus: 'pending',
      blockTimestamp: createdAt,
      currentHash: 'Pending connection',
    },
    qr: {
      reportUrl,
      verificationUrl: reportUrl,
    },
    situationRoom: {
      roomId,
      roomUrl: buildCarbSituationRoomUrl(roomId),
      status: 'open',
    },
    disclaimer:
      'DPAL does not replace CARB, EPA, legal counsel, or official regulatory findings. This report is a preliminary review tool.',
  };
}
