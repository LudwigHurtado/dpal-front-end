export type EmissionsIndustry =
  | 'Oil & Gas'
  | 'Power Plant'
  | 'Cement'
  | 'Mining'
  | 'Manufacturing'
  | 'Agriculture / AFOLU'
  | 'Transportation / Logistics'
  | 'Other';

export type Jurisdiction = 'California' | 'Arizona' | 'New Mexico' | 'Federal';

export type LegalFramework =
  | 'California CARB / MRR / Cap-and-Invest'
  | 'EPA GHGRP'
  | 'New Mexico methane / oil and gas rules'
  | 'Arizona federal permit / Title V / PSD review'
  | 'Other / Unknown';

export type LocationSelectionMethod =
  | 'GPS coordinate input'
  | 'map click'
  | 'drawn polygon'
  | 'facility search/manual entry';

export type RiskLevel = 'Low / Consistent' | 'Medium / Needs Review' | 'High / Material Discrepancy' | 'Needs More Data';

export type QaFlag = 'verified' | 'review_needed' | 'demo' | 'estimated';

export interface AuditPeriod {
  label: string;
  startDate: string;
  endDate: string;
  preset:
    | 'previous_calendar_year'
    | 'trailing_12_months'
    | 'custom'
    | 'current_calendar_year_to_date'
    | 'current_trailing_12_months';
}

export interface CoordinatePoint {
  lat: number;
  lng: number;
}

export interface LocationBoundary {
  selectionMethod: LocationSelectionMethod;
  point: CoordinatePoint | null;
  polygon: CoordinatePoint[];
  areaEstimateKm2: number;
  stateLabel: string;
}

export interface FacilityInfo {
  companyName: string;
  facilityName: string;
  industry: EmissionsIndustry;
  jurisdiction: Jurisdiction;
  legalFramework: LegalFramework;
}

export interface DataSourceMetadata {
  sourceName: string;
  sourceUrl?: string;
  retrievalDate: string;
  datasetVersion: string;
  qaFlag: QaFlag;
  notes: string;
}

export interface ReportedEmissionsData {
  baselineReportedEmissions: number;
  currentReportedEmissions: number;
  metadata: DataSourceMetadata;
}

export interface SatelliteObservationData {
  baselineMethaneScore: number;
  currentMethaneScore: number;
  baselineNO2Score: number;
  currentNO2Score: number;
  baselineActivityProxyScore: number;
  currentActivityProxyScore: number;
  co2ContextScore: number;
  enabledLayers: string[];
  metadata: DataSourceMetadata;
}

export interface ProductionData {
  baselineProductionOutput: number;
  currentProductionOutput: number;
  metadata: DataSourceMetadata;
}

export interface AuditConfidenceInputs {
  dataConfidence: number;
  satelliteDataConfidence: number;
  regulatoryDataConfidence: number;
  weatherQaConfidence: number;
}

export interface CalculationResults {
  reportedReductionPct: number;
  methaneChangePct: number;
  no2ChangePct: number;
  activityProxyChangePct: number;
  baselineIntensity: number;
  currentIntensity: number;
  intensityReductionPct: number;
  observedReductionPct: number;
  discrepancyGap: number;
  interpretation: string;
}

export interface AuditDiscrepancyIndex {
  score: number;
  riskLevel: RiskLevel;
  weights: Record<string, number>;
  confidenceScore: number;
}

export interface EmissionsAudit {
  auditId: string;
  facilityInfo: FacilityInfo;
  locationBoundary: LocationBoundary;
  baselinePeriod: AuditPeriod;
  currentPeriod: AuditPeriod;
  reportedData: ReportedEmissionsData;
  satelliteObservations: SatelliteObservationData;
  productionData: ProductionData;
  confidenceInputs: AuditConfidenceInputs;
  calculationResults: CalculationResults;
  adi: AuditDiscrepancyIndex;
  legalContext: string[];
  limitations: string[];
  recommendedNextSteps: string[];
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface EvidencePacket {
  title?: string;
  auditId: string;
  companyName: string;
  facilityName: string;
  jurisdiction: Jurisdiction;
  industry: EmissionsIndustry;
  location: CoordinatePoint | null;
  polygon: CoordinatePoint[];
  baselinePeriod: AuditPeriod;
  currentPeriod: AuditPeriod;
  reportedData: ReportedEmissionsData;
  satelliteObservations: SatelliteObservationData;
  productionData: ProductionData;
  calculationResults: CalculationResults;
  adiScore: number;
  riskLevel: RiskLevel;
  legalContext: string[];
  confidenceScore: number;
  limitations: string[];
  recommendedNextSteps: string[];
  timestamps: {
    exportedAt: string;
    createdAt: string;
    updatedAt: string;
  };
  dpalLedgerPlaceholder: {
    status: 'not_connected';
    note: string;
  };
  integrationHooks: string[];
}
