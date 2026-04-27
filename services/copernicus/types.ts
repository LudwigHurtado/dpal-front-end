export type CopernicusIndexType = 'NDVI' | 'NDWI' | 'NDMI' | 'NBR';

export type CopernicusCollection =
  | 'sentinel-2-l2a'
  | 'sentinel-1-grd'
  | 'sentinel-3-olci'
  | 'sentinel-5p-l2'
  | 'copernicus-dem'
  | 'worldcover';

export type CopernicusValidatorStatus = 'pending' | 'pending_review' | 'approved' | 'rejected' | 'needs_more_evidence';

export interface CopernicusLatLng {
  lat: number;
  lng: number;
}

export interface CopernicusDateRange {
  from: string;
  to: string;
}

export interface CopernicusCloudFilter {
  maxCloudCoverPercent: number;
}

export interface CopernicusAoiGeoJson {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface CopernicusSceneMetadata {
  id: string;
  collection: CopernicusCollection;
  acquisitionDate: string;
  cloudCoverPercent?: number | null;
  footprintGeoJson?: Record<string, unknown> | null;
}

export interface CopernicusCatalogSearchParams {
  center: CopernicusLatLng;
  dateRange: CopernicusDateRange;
  cloudFilter?: CopernicusCloudFilter;
  collections: CopernicusCollection[];
  aoiGeoJson?: CopernicusAoiGeoJson | null;
}

export interface CopernicusIndexResult {
  indexType: CopernicusIndexType;
  value: number | null;
  quality: 'live_api' | 'estimated' | 'unavailable';
  source: string;
}

export interface SatelliteEvidencePacket {
  projectId: string;
  projectName: string;
  aoiGeoJson: CopernicusAoiGeoJson | null;
  centerLatLng: CopernicusLatLng;
  satelliteCollection: CopernicusCollection;
  productId: string;
  acquisitionDate: string;
  cloudCover: string;
  indexType: CopernicusIndexType;
  beforeValue: number | null;
  afterValue: number | null;
  deltaPercent: number | null;
  confidenceScore: number;
  dataSourceCitation: string;
  assumptions: string[];
  limitations: string[];
  generatedAt: string;
  validatorStatus: CopernicusValidatorStatus;
  photos?: string[];
  measurements?: Array<Record<string, unknown>>;
  overlays?: Array<Record<string, unknown>>;
  notes: string;
}

export interface CopernicusSetupState {
  configured: boolean;
  missing: string[];
  source: 'backend_proxy';
  enabled: boolean;
  message: string;
}

export interface CopernicusNormalizedStatistics {
  indexType: CopernicusIndexType;
  mean: number | null;
  min: number | null;
  max: number | null;
  stDev: number | null;
  sampleCount: number;
  noDataCount: number;
  cloudCoverage: number | null;
  fromDate: string;
  toDate: string;
  collection: CopernicusCollection;
  sourceCitation: string;
  confidenceScore: number;
}

export interface CopernicusComparisonBand {
  mean: number | null;
  min: number | null;
  max: number | null;
  stDev: number | null;
  sampleCount: number;
  noDataCount: number;
  cloudCoverage: number | null;
  fromDate: string;
  toDate: string;
  confidenceScore: number;
}

export interface CopernicusStatisticsComparisonResponse {
  indexType: CopernicusIndexType;
  collection: CopernicusCollection;
  aoiGeoJson: CopernicusAoiGeoJson;
  before: CopernicusComparisonBand;
  after: CopernicusComparisonBand;
  delta: {
    absoluteChange: number | null;
    percentChange: number | null;
    direction: 'increase' | 'decrease' | 'no_change' | 'unknown';
    interpretation: string;
  };
  confidenceScore: number;
  measurementStatus?: 'ok' | 'no_valid_samples';
  reason?: string | null;
  warnings: string[];
  sourceCitation: string;
  generatedAt: string;
}
