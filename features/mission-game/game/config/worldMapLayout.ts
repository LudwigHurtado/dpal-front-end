export const WORLD_MAP_TEXTURE_KEY = 'dpal-city-map';
export const WORLD_MAP_ASSET_PATH = '/games/172e7fa5-6b48-43b2-ba01-6beaa662bc16.png';
export const WORLD_MAP_SOURCE_SIZE = {
  width: 1672,
  height: 941,
} as const;

export interface WorldMapMarkerPosition {
  id: string;
  /** Normalized x coordinate relative to the map image. */
  x: number;
  /** Normalized y coordinate relative to the map image. */
  y: number;
  district: 'Westside' | 'Central' | 'School District' | 'Industrial' | 'Riverside' | 'City Park';
  categoryId: string;
}

/**
 * Normalized coordinates are relative to the custom map image, not the full
 * game viewport. Keep this table small and visual so map swaps are easy.
 */
export const WORLD_MAP_MARKER_POSITIONS: WorldMapMarkerPosition[] = [
  { id: 'loc_01', x: 0.22, y: 0.25, district: 'Westside', categoryId: 'road_hazards' },
  { id: 'loc_05', x: 0.34, y: 0.50, district: 'Industrial', categoryId: 'road_hazards' },
  { id: 'loc_02', x: 0.49, y: 0.46, district: 'City Park', categoryId: 'lost_pets' },
  { id: 'loc_06', x: 0.56, y: 0.42, district: 'City Park', categoryId: 'lost_pets' },
  { id: 'loc_03', x: 0.19, y: 0.65, district: 'Industrial', categoryId: 'environmental' },
  { id: 'loc_08', x: 0.50, y: 0.71, district: 'Riverside', categoryId: 'environmental' },
  { id: 'loc_04', x: 0.79, y: 0.27, district: 'School District', categoryId: 'education' },
  { id: 'loc_07', x: 0.86, y: 0.49, district: 'School District', categoryId: 'education' },
];

export const WORLD_MAP_MARKER_BY_ID = Object.fromEntries(
  WORLD_MAP_MARKER_POSITIONS.map(marker => [marker.id, marker]),
) as Record<string, WorldMapMarkerPosition>;
