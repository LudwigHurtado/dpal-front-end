/**
 * Locations are positioned on the world map using normalized coordinates (0–1).
 * WorldMapScene converts these to canvas pixels accounting for the UI bar height.
 */
export interface Location {
  id: string;
  name: string;
  /** Normalized 0–1 horizontal position across the map width */
  nx: number;
  /** Normalized 0–1 vertical position across the map height (below UI bar) */
  ny: number;
  categoryIds: string[];
  missionIds: string[];
  zoneName: string;
}

export const locations: Location[] = [
  {
    id: 'loc_01',
    name: 'Oak & 3rd Ave',
    nx: 0.14, ny: 0.22,
    categoryIds: ['road_hazards'],
    missionIds: ['m01', 'm02'],
    zoneName: 'North District',
  },
  {
    id: 'loc_02',
    name: 'Central Park West',
    nx: 0.38, ny: 0.42,
    categoryIds: ['lost_pets'],
    missionIds: ['m03', 'm04'],
    zoneName: 'Park Zone',
  },
  {
    id: 'loc_03',
    name: 'Riverside Industrial',
    nx: 0.12, ny: 0.70,
    categoryIds: ['environmental'],
    missionIds: ['m05', 'm06'],
    zoneName: 'Waterfront',
  },
  {
    id: 'loc_04',
    name: 'Lincoln Elementary',
    nx: 0.74, ny: 0.28,
    categoryIds: ['education'],
    missionIds: ['m07', 'm08'],
    zoneName: 'East Side',
  },
  {
    id: 'loc_05',
    name: 'Hwy 7 Overpass',
    nx: 0.56, ny: 0.54,
    categoryIds: ['road_hazards'],
    missionIds: ['m01'],
    zoneName: 'Midtown',
  },
  {
    id: 'loc_06',
    name: 'Sunset Community Garden',
    nx: 0.80, ny: 0.68,
    categoryIds: ['environmental', 'lost_pets'],
    missionIds: ['m05', 'm03'],
    zoneName: 'South Quarter',
  },
  {
    id: 'loc_07',
    name: 'Jefferson Middle School',
    nx: 0.62, ny: 0.78,
    categoryIds: ['education'],
    missionIds: ['m07'],
    zoneName: 'South Quarter',
  },
  {
    id: 'loc_08',
    name: 'River Drainage Channel',
    nx: 0.24, ny: 0.82,
    categoryIds: ['environmental'],
    missionIds: ['m06'],
    zoneName: 'Waterfront',
  },
];

export function getLocationById(id: string): Location | undefined {
  return locations.find(l => l.id === id);
}
