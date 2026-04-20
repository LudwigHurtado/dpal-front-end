export const WORLD_MAP_TEXTURE_KEY = 'dpal-city-map';
export const WORLD_MAP_ASSET_PATH = '/games/dpal-city-map.svg';
export const WORLD_MAP_SOURCE_SIZE = {
  width: 1674,
  height: 768,
} as const;

export interface MarkerLayoutPoint {
  nx: number;
  ny: number;
}

/**
 * Normalized coordinates are relative to the custom map image, not the full
 * game viewport. Keep this table small and visual so map swaps are easy.
 */
export const WORLD_MAP_MARKER_LAYOUT: Record<string, MarkerLayoutPoint> = {
  loc_01: { nx: 0.22, ny: 0.25 }, // Oak & 3rd Ave - Westside neighborhood
  loc_05: { nx: 0.34, ny: 0.50 }, // Hwy 7 Overpass - west industrial connector
  loc_02: { nx: 0.48, ny: 0.42 }, // Central Park West
  loc_06: { nx: 0.55, ny: 0.40 }, // Midtown Community Garden - City Park edge
  loc_03: { nx: 0.19, ny: 0.59 }, // Riverside Industrial
  loc_08: { nx: 0.50, ny: 0.66 }, // River Drainage Channel
  loc_04: { nx: 0.78, ny: 0.27 }, // Lincoln Elementary - School District
  loc_07: { nx: 0.84, ny: 0.49 }, // Jefferson Middle School
};
