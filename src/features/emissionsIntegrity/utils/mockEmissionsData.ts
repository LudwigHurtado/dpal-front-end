import type {
  AuditConfidenceInputs,
  AuditPeriod,
  CoordinatePoint,
  DataSourceMetadata,
  EmissionsIndustry,
  FacilityInfo,
  ProductionData,
  ReportedEmissionsData,
  SatelliteObservationData,
} from '../types/emissionsIntegrity.types';

export const INDUSTRY_OPTIONS: EmissionsIndustry[] = [
  'Oil & Gas',
  'Power Plant',
  'Cement',
  'Mining',
  'Manufacturing',
  'Agriculture / AFOLU',
  'Transportation / Logistics',
  'Other',
];

export const SATELLITE_LAYER_OPTIONS = [
  'Methane / CH4 plume layer',
  'CO2 context layer',
  'NO2 activity proxy layer',
  'Land use / facility footprint',
  'Production/activity proxy',
  'Weather / wind overlay',
] as const;

export const LOCATION_METHOD_OPTIONS = [
  'GPS coordinate input',
  'map click',
  'drawn polygon',
  'facility search/manual entry',
] as const;

export const JURISDICTION_OPTIONS = ['California', 'Arizona', 'New Mexico', 'Federal'] as const;

export const LEGAL_FRAMEWORK_OPTIONS = [
  'California CARB / MRR / Cap-and-Invest',
  'EPA GHGRP',
  'New Mexico methane / oil and gas rules',
  'Arizona federal permit / Title V / PSD review',
  'Other / Unknown',
] as const;

export const BASELINE_PERIOD_PRESETS = [
  { label: 'Previous calendar year', preset: 'previous_calendar_year' },
  { label: 'Trailing 12 months', preset: 'trailing_12_months' },
  { label: 'Custom date range', preset: 'custom' },
] as const;

export const CURRENT_PERIOD_PRESETS = [
  { label: 'Current calendar year to date', preset: 'current_calendar_year_to_date' },
  { label: 'Current trailing 12 months', preset: 'current_trailing_12_months' },
  { label: 'Custom date range', preset: 'custom' },
] as const;

export const demoFacilityResults: Array<{
  id: string;
  label: string;
  point: CoordinatePoint;
  jurisdiction: string;
  industry: EmissionsIndustry;
}> = [
  {
    id: 'kern-oil-01',
    label: 'Kern Basin Processing Hub',
    point: { lat: 35.3733, lng: -119.0187 },
    jurisdiction: 'California',
    industry: 'Oil & Gas',
  },
  {
    id: 'four-corners-01',
    label: 'Four Corners Power Block',
    point: { lat: 36.6851, lng: -108.4808 },
    jurisdiction: 'New Mexico',
    industry: 'Power Plant',
  },
  {
    id: 'phoenix-cement-01',
    label: 'Sonoran Cement Works',
    point: { lat: 33.4484, lng: -112.074 },
    jurisdiction: 'Arizona',
    industry: 'Cement',
  },
];

export const createDefaultMetadata = (sourceName: string): DataSourceMetadata => ({
  sourceName,
  sourceUrl: '',
  retrievalDate: new Date().toISOString().slice(0, 10),
  datasetVersion: 'Demo data — replace with verified source',
  qaFlag: 'demo',
  notes: 'Demo data — replace with verified satellite source.',
});

export const defaultFacilityInfo: FacilityInfo = {
  companyName: 'Desert Peak Energy Holdings',
  facilityName: 'South Basin Compression Station',
  industry: 'Oil & Gas',
  jurisdiction: 'New Mexico',
  legalFramework: 'New Mexico methane / oil and gas rules',
};

export const defaultBaselinePeriod: AuditPeriod = {
  label: 'Previous calendar year',
  preset: 'previous_calendar_year',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
};

export const defaultCurrentPeriod: AuditPeriod = {
  label: 'Current calendar year to date',
  preset: 'current_calendar_year_to_date',
  startDate: '2026-01-01',
  endDate: '2026-04-23',
};

export const defaultReportedData: ReportedEmissionsData = {
  baselineReportedEmissions: 120000,
  currentReportedEmissions: 91200,
  metadata: createDefaultMetadata('EPA GHGRP placeholder'),
};

export const defaultSatelliteData: SatelliteObservationData = {
  baselineMethaneScore: 82,
  currentMethaneScore: 71,
  baselineNO2Score: 66,
  currentNO2Score: 63,
  baselineActivityProxyScore: 79,
  currentActivityProxyScore: 74,
  co2ContextScore: 58,
  enabledLayers: [...SATELLITE_LAYER_OPTIONS],
  metadata: createDefaultMetadata('NASA EMIT / Sentinel-5P placeholder'),
};

export const defaultProductionData: ProductionData = {
  baselineProductionOutput: 510000,
  currentProductionOutput: 475000,
  metadata: createDefaultMetadata('Company disclosures / permit filings placeholder'),
};

export const defaultConfidenceInputs: AuditConfidenceInputs = {
  dataConfidence: 72,
  satelliteDataConfidence: 68,
  regulatoryDataConfidence: 77,
  weatherQaConfidence: 74,
};
