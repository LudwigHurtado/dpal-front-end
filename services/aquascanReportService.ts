import type { AquaScanEvidenceReport, BuildAquaScanEvidenceReportInput } from '../types/aquascanReport';
import { buildAquaScanReportUrl, buildAquaScanSituationRoomUrl } from '../utils/qrUtils';

const STORAGE_KEY = 'dpal_aquascan_evidence_reports_v1';

function readReports(): AquaScanEvidenceReport[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as AquaScanEvidenceReport[] : [];
  } catch {
    return [];
  }
}

function writeReports(reports: AquaScanEvidenceReport[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function buildReportId(projectId?: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const scope = (projectId || 'AQUASCAN').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 32);
  return `AQREP-${scope}-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function buildRoomId(reportId: string, projectId?: string): string {
  const scope = (projectId || reportId).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 32);
  return `aq-room-${scope}-${reportId.slice(-8).toLowerCase()}`;
}

export function listAquaScanEvidenceReports(): AquaScanEvidenceReport[] {
  return readReports().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAquaScanEvidenceReport(reportId: string): AquaScanEvidenceReport | null {
  return readReports().find((report) => report.reportId === reportId) ?? null;
}

export function getAquaScanEvidenceReportByRoomId(roomId: string): AquaScanEvidenceReport | null {
  return readReports().find((report) => report.situationRoom.roomId === roomId) ?? null;
}

export function saveAquaScanEvidenceReport(report: AquaScanEvidenceReport): AquaScanEvidenceReport {
  const reports = readReports();
  const next = [report, ...reports.filter((entry) => entry.reportId !== report.reportId)];
  writeReports(next);
  return report;
}

export function updateAquaScanEvidenceReport(
  reportId: string,
  updater: (current: AquaScanEvidenceReport) => AquaScanEvidenceReport,
): AquaScanEvidenceReport | null {
  const reports = readReports();
  const index = reports.findIndex((report) => report.reportId === reportId);
  if (index < 0) return null;
  const nextReport = updater(reports[index]);
  reports[index] = nextReport;
  writeReports(reports);
  return nextReport;
}

export function buildAquaScanEvidenceReport(input: BuildAquaScanEvidenceReportInput): AquaScanEvidenceReport {
  const reportId = buildReportId(input.projectId);
  const roomId = buildRoomId(reportId, input.projectId);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const reportUrl = buildAquaScanReportUrl(reportId);
  const roomUrl = buildAquaScanSituationRoomUrl(roomId);

  return {
    reportId,
    projectId: input.projectId,
    projectName: input.projectName,
    createdAt,
    createdBy: input.createdBy,
    aquaScanResult: input.aquaScanResult,
    satelliteMetadata: input.satelliteMetadata,
    aiIntelligence: input.aiIntelligence,
    evidencePacket: input.evidencePacket,
    hashes: {
      reportPayloadHash: 'Pending generation',
    },
    ledger: {
      blockId: 'Pending connection',
      chainName: 'DPAL Evidence Ledger',
      chainType: 'internal-hash-chain',
      blockTimestamp: createdAt,
      currentHash: 'Pending connection',
      verificationStatus: 'pending',
    },
    qr: {
      reportUrl,
      verificationUrl: reportUrl,
    },
    situationRoom: {
      roomId,
      roomUrl,
      status: 'open',
    },
  };
}
