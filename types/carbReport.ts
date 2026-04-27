export type CarbReportSourceMode = 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK';

export interface CarbSpecializedReport {
  reportId: string;
  auditId: string;
  module: 'DPAL CARB Specialized Emissions Report';
  createdAt: string;
  createdBy?: string;
  facilityIdentity: {
    facilityId: string;
    facilityName: string;
    operatorName: string;
    sector?: string;
  };
  location: {
    city?: string;
    county?: string;
    state?: string;
    latitude?: number | null;
    longitude?: number | null;
    coordinatesLabel?: string;
  };
  reportingYears: {
    baselineYear: number;
    currentYear: number;
  };
  emissionsComparison: {
    baselineCO2e: number;
    currentCO2e: number;
    calculatedReductionPct: number | null;
  };
  gasBreakdown: {
    methane: { baseline: number | null; current: number | null; reductionPct: number | null };
    n2o: { baseline: number | null; current: number | null; reductionPct: number | null };
    co2: { baseline: number | null; current: number | null; reductionPct: number | null };
  };
  companyClaim: string;
  claimVerificationResult: string;
  claimGapPct: number | null;
  integrityScore: number | null;
  riskLevel: string;
  sourceMode: CarbReportSourceMode;
  datasetVersion?: string;
  retrievalDate?: string;
  dataSources: Array<{
    sourceName: string;
    sourceType?: string;
    sourceUrl?: string;
    retrievalDate?: string;
    datasetVersion?: string;
    sourceStatus?: string;
    notes?: string;
  }>;
  legalContext: string[];
  limitations: string[];
  verificationChecklist: Array<{ item: string; status: string }>;
  recommendedNextSteps: string[];
  aiNarrative: string;
  hashes: {
    reportPayloadHash: string;
    pdfHash?: string;
    previousBlockHash?: string;
    blockHash?: string;
  };
  ledger: {
    blockId: string;
    chainName: 'DPAL Evidence Ledger';
    chainType: 'internal-hash-chain' | 'public-chain' | 'hybrid';
    verificationStatus: 'logged' | 'pending' | 'failed';
    blockTimestamp: string;
    currentHash: string;
    previousHash?: string;
    transactionId?: string;
  };
  qr: {
    reportUrl: string;
    verificationUrl: string;
    qrCodeDataUrl?: string;
  };
  situationRoom: {
    roomId: string;
    roomUrl: string;
    status: 'open' | 'pending' | 'closed';
  };
  disclaimer: string;
}

export interface BuildCarbReportInput {
  auditId?: string;
  createdBy?: string;
  facilityIdentity: CarbSpecializedReport['facilityIdentity'];
  location: CarbSpecializedReport['location'];
  reportingYears: CarbSpecializedReport['reportingYears'];
  emissionsComparison: CarbSpecializedReport['emissionsComparison'];
  gasBreakdown: CarbSpecializedReport['gasBreakdown'];
  companyClaim: string;
  claimVerificationResult: string;
  claimGapPct: number | null;
  integrityScore: number | null;
  riskLevel: string;
  sourceMode: CarbReportSourceMode;
  datasetVersion?: string;
  retrievalDate?: string;
  dataSources: CarbSpecializedReport['dataSources'];
  legalContext: string[];
  limitations: string[];
  verificationChecklist: CarbSpecializedReport['verificationChecklist'];
  recommendedNextSteps: string[];
  aiNarrative: string;
}
