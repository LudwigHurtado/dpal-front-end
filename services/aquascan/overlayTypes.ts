import type { CopernicusAoiGeoJson, CopernicusCollection, CopernicusIndexType } from '../copernicus/types';

export type AquaScanOverlayType =
  | 'ndwi_water_presence'
  | 'water_extent'
  | 'flood_wet'
  | 'risk_zones'
  | 'flow_direction';

export type AquaScanOverlayStatus = 'idle' | 'loading' | 'available' | 'unavailable' | 'error';

export interface AquaScanOverlayDateRange {
  fromDate: string;
  toDate: string;
}

export interface AquaScanOverlayRequest {
  aoiGeoJson: CopernicusAoiGeoJson;
  dateRange: AquaScanOverlayDateRange;
  indexType: CopernicusIndexType;
  collection: CopernicusCollection;
  threshold: number;
}

export interface AquaScanOverlayStatistics {
  mean: number | null;
  min: number | null;
  max: number | null;
  standardDeviation: number | null;
  sampleCount: number;
  noDataCount: number;
  cloudCover: number | null;
  confidence: number | null;
  resolutionMeters: number | null;
}

export interface AquaScanOverlayFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties?: Record<string, unknown>;
    geometry: {
      type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString';
      coordinates: unknown;
    };
  }>;
}

export interface AquaScanOverlayResponse {
  ok: boolean;
  overlayType: AquaScanOverlayType;
  source: string;
  sourceName: string;
  status: Exclude<AquaScanOverlayStatus, 'idle' | 'loading'>;
  dateRange?: AquaScanOverlayDateRange;
  collection?: CopernicusCollection;
  indexType?: CopernicusIndexType;
  threshold?: number;
  geometry: AquaScanOverlayFeatureCollection | null;
  rasterTileUrl: string | null;
  statistics: AquaScanOverlayStatistics | null;
  confidence: number | null;
  warnings: string[];
  reason?: string;
  generatedAt?: string;
}

export interface AquaScanOverlayState extends Omit<AquaScanOverlayResponse, 'status'> {
  status: AquaScanOverlayStatus;
}
