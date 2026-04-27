import { addDataHashBlockToChain } from './dpalChainService';
import { getAquaScanEvidenceReport, saveAquaScanEvidenceReport } from './aquascanReportService';
import type { AquaScanEvidenceReport } from '../types/aquascanReport';
import { sha256Json } from '../utils/hashUtils';

export const AQUASCAN_LEDGER_NOTE =
  'DPAL Evidence Ledger - internal hash-chain record pending public-chain anchoring.';

function buildHashablePayload(report: AquaScanEvidenceReport): Record<string, unknown> {
  return {
    reportId: report.reportId,
    projectId: report.projectId,
    projectName: report.projectName,
    createdAt: report.createdAt,
    createdBy: report.createdBy,
    aquaScanResult: report.aquaScanResult,
    satelliteMetadata: report.satelliteMetadata,
    aiIntelligence: report.aiIntelligence,
    evidencePacket: report.evidencePacket,
    qr: {
      reportUrl: report.qr.reportUrl,
      verificationUrl: report.qr.verificationUrl,
    },
    situationRoom: {
      roomId: report.situationRoom.roomId,
      roomUrl: report.situationRoom.roomUrl,
      status: report.situationRoom.status,
    },
  };
}

function buildEvidenceHashablePayload(report: AquaScanEvidenceReport): Record<string, unknown> {
  return {
    includedFiles: report.evidencePacket.includedFiles ?? [],
    screenshots: report.evidencePacket.screenshots ?? [],
    notes: report.evidencePacket.notes ?? [],
  };
}

export async function logAquaScanReportToLedger(report: AquaScanEvidenceReport): Promise<AquaScanEvidenceReport> {
  const reportPayloadHash = await sha256Json(buildHashablePayload(report));
  const evidenceHash = await sha256Json(buildEvidenceHashablePayload(report));
  const chainResult = await addDataHashBlockToChain({
    reportId: report.reportId,
    dataHash: reportPayloadHash,
    chainLabel: 'DPAL Evidence Ledger',
  });

  const nextReport: AquaScanEvidenceReport = {
    ...report,
    hashes: {
      ...report.hashes,
      reportPayloadHash,
      evidenceHash,
      previousBlockHash: chainResult.block.previousHash,
      blockHash: chainResult.block.hash,
    },
    ledger: {
      ...report.ledger,
      blockId: `BLOCK-${chainResult.block.index}`,
      chainName: 'DPAL Evidence Ledger',
      chainType: 'internal-hash-chain',
      blockTimestamp: chainResult.block.timestamp,
      previousHash: chainResult.block.previousHash,
      currentHash: chainResult.block.hash,
      verificationStatus: 'logged',
    },
    evidencePacket: {
      ...report.evidencePacket,
      notes: [
        ...(report.evidencePacket.notes ?? []),
        AQUASCAN_LEDGER_NOTE,
      ].filter((value, index, array) => array.indexOf(value) === index),
    },
  };

  return saveAquaScanEvidenceReport(nextReport);
}

export function updateAquaScanReportPdfHash(reportId: string, pdfHash: string): AquaScanEvidenceReport | null {
  const current = getAquaScanEvidenceReport(reportId);
  if (!current) return null;
  return saveAquaScanEvidenceReport({
    ...current,
    hashes: {
      ...current.hashes,
      pdfHash,
    },
  });
}
