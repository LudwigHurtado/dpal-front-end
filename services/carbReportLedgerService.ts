import { addDataHashBlockToChain } from './dpalChainService';
import { getCarbReport, saveCarbReport } from './carbReportService';
import type { CarbSpecializedReport } from '../types/carbReport';
import { sha256Json } from '../utils/hashUtils';

function buildHashPayload(report: CarbSpecializedReport): Record<string, unknown> {
  return {
    reportId: report.reportId,
    auditId: report.auditId,
    module: report.module,
    createdAt: report.createdAt,
    facilityIdentity: report.facilityIdentity,
    location: report.location,
    reportingYears: report.reportingYears,
    emissionsComparison: report.emissionsComparison,
    gasBreakdown: report.gasBreakdown,
    companyClaim: report.companyClaim,
    claimVerificationResult: report.claimVerificationResult,
    claimGapPct: report.claimGapPct,
    integrityScore: report.integrityScore,
    riskLevel: report.riskLevel,
    sourceMode: report.sourceMode,
    datasetVersion: report.datasetVersion,
    retrievalDate: report.retrievalDate,
    dataSources: report.dataSources,
    legalContext: report.legalContext,
    limitations: report.limitations,
    verificationChecklist: report.verificationChecklist,
    recommendedNextSteps: report.recommendedNextSteps,
    aiNarrative: report.aiNarrative,
    disclaimer: report.disclaimer,
    qr: report.qr,
    situationRoom: report.situationRoom,
  };
}

export async function logCarbReportToLedger(report: CarbSpecializedReport): Promise<CarbSpecializedReport> {
  const reportPayloadHash = await sha256Json(buildHashPayload(report));
  const chainResult = await addDataHashBlockToChain({
    reportId: report.reportId,
    dataHash: reportPayloadHash,
    chainLabel: 'DPAL Evidence Ledger',
  });

  return saveCarbReport({
    ...report,
    hashes: {
      ...report.hashes,
      reportPayloadHash,
      previousBlockHash: chainResult.block.previousHash,
      blockHash: chainResult.block.hash,
    },
    ledger: {
      ...report.ledger,
      blockId: `BLOCK-${chainResult.block.index}`,
      chainName: 'DPAL Evidence Ledger',
      chainType: 'internal-hash-chain',
      verificationStatus: 'logged',
      blockTimestamp: chainResult.block.timestamp,
      previousHash: chainResult.block.previousHash,
      currentHash: chainResult.block.hash,
    },
  });
}

export function updateCarbReportPdfHash(reportId: string, pdfHash: string): CarbSpecializedReport | null {
  const current = getCarbReport(reportId);
  if (!current) return null;
  return saveCarbReport({
    ...current,
    hashes: {
      ...current.hashes,
      pdfHash,
    },
  });
}
