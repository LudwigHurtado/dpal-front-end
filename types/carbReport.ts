export type CarbReportSourceMode = 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK' | 'NEEDS_SOURCE';

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
  historicalCoverage?: {
    yearsLoaded: number[];
    yearRecordCounts: Record<string, number>;
    multiYearFacilitiesCount: number;
    singleYearFacilitiesCount: number;
    historicalReady: boolean;
    warnings: string[];
  };
  historicalTrend?: {
    trendFinding: string;
    dataContinuity: string;
    largestYearChange: string;
    historicalCoverageNote: string;
    claimBoundaryCheck: string;
  };
  historicalRecords?: Array<{
    reportingYear: number;
    totalCO2e: number | null;
    methaneCH4: number | null;
    nitrousOxideN2O: number | null;
    carbonDioxideCO2: number | null;
    datasetVersion: string;
    sourceUrl?: string;
    retrievalDate: string;
    rawRow?: Record<string, unknown>;
  }>;
  baselineRawRow?: Record<string, unknown> | null;
  currentRawRow?: Record<string, unknown> | null;
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
  mapEvidence?: {
    center: [number, number];
    selectedFacilityCoordinates?: [number, number] | null;
    manualCoordinates?: [number, number] | null;
    investigationPolygon?: [number, number][];
    markers: Array<{
      id: string;
      kind: 'inspection_point' | 'anomaly_marker';
      label: string;
      lat: number;
      lng: number;
      createdAt: string;
    }>;
    followUpTasks: Array<{
      id: string;
      title: string;
      status: 'open' | 'done';
      linkedMarkerId?: string;
    }>;
    activeLayers: string[];
  };
  environmentalReadings?: Array<{
    index: 'NDWI' | 'NDVI' | 'NDMI' | 'NBR';
    before: number | null;
    current: number | null;
    change: number | null;
    interpretation: string;
    source: string;
    confidence: 'Low' | 'Medium' | 'High' | 'Unavailable';
  }>;
  companyClaim: string;
  claimVerificationResult: string;
  claimGapPct: number | null;
  integrityScore: number | null;
  riskLevel: string;
  sourceMode: CarbReportSourceMode;
  reportQualityRating?: 'Draft' | 'Limited' | 'Review Ready' | 'Regulator Ready';
  dataReadiness?: {
    carbDatasetReady: boolean;
    searchReadiness: 'Ready' | 'Limited' | 'Not Ready';
    datasetVersion?: string;
    retrievalDate?: string;
    /** Total records in the live/indexed CARB dataset (global status). */
    recordsIndexed?: number;
    /** Rows returned for the current search result set (may differ when filters yield zero). */
    currentSearchRowCount?: number;
  };
  investigationFindings?: Array<{
    title: string;
    finding: string;
    whyItMatters: string;
    nextAction: string;
  }>;
  sourceIntegrityWarnings?: string[];
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
  historicalCoverage?: CarbSpecializedReport['historicalCoverage'];
  historicalTrend?: CarbSpecializedReport['historicalTrend'];
  historicalRecords?: CarbSpecializedReport['historicalRecords'];
  baselineRawRow?: CarbSpecializedReport['baselineRawRow'];
  currentRawRow?: CarbSpecializedReport['currentRawRow'];
  emissionsComparison: CarbSpecializedReport['emissionsComparison'];
  gasBreakdown: CarbSpecializedReport['gasBreakdown'];
  mapEvidence?: CarbSpecializedReport['mapEvidence'];
  environmentalReadings?: CarbSpecializedReport['environmentalReadings'];
  companyClaim: string;
  claimVerificationResult: string;
  claimGapPct: number | null;
  integrityScore: number | null;
  riskLevel: string;
  sourceMode: CarbReportSourceMode;
  reportQualityRating?: 'Draft' | 'Limited' | 'Review Ready' | 'Regulator Ready';
  dataReadiness?: CarbSpecializedReport['dataReadiness'];
  investigationFindings?: CarbSpecializedReport['investigationFindings'];
  sourceIntegrityWarnings?: string[];
  datasetVersion?: string;
  retrievalDate?: string;
  dataSources: CarbSpecializedReport['dataSources'];
  legalContext: string[];
  limitations: string[];
  verificationChecklist: CarbSpecializedReport['verificationChecklist'];
  recommendedNextSteps: string[];
  aiNarrative: string;
}
