/**
 * Locations are positioned on the world map using normalized coordinates (0–1).
 * WorldMapScene converts these to canvas pixels accounting for the UI bar height.
 *
 * Zone layout on the 1280×660 map area:
 *   WESTSIDE       — left strip  x[0.00 – 0.38]           full height
 *   CENTRAL        — center top  x[0.38 – 0.65], y[0 – 0.60]
 *   RIVERSIDE      — bottom half x[0.00 – 0.65], y[0.60 – 1.00]
 *   SCHOOL DISTRICT— right strip x[0.65 – 1.00]           full height
 */
export interface Location {
  id: string;
  name: string;
  /** Normalized 0–1 across map width */
  nx: number;
  /** Normalized 0–1 across map height (below UI bar) */
  ny: number;
  categoryIds: string[];
  missionIds: string[];
  zoneName: 'Westside' | 'Central' | 'Riverside' | 'School District';
}

export const locations: Location[] = [
  // ── Westside — Road Hazards ──────────────────────────────────────────────
  {
    id: 'loc_01',
    name: 'Oak & 3rd Ave',
    nx: 0.14, ny: 0.22,
    categoryIds: ['road_hazards'],
    missionIds: ['m01', 'm02'],
    zoneName: 'Westside',
  },
  {
    id: 'loc_05',
    name: 'Hwy 7 Overpass',
    nx: 0.26, ny: 0.58,
    categoryIds: ['road_hazards'],
    missionIds: ['m01'],
    zoneName: 'Westside',
  },
  // ── Central — Lost Pets / Park ────────────────────────────────────────────
  {
    id: 'loc_02',
    name: 'Central Park West',
    nx: 0.48, ny: 0.32,
    categoryIds: ['lost_pets'],
    missionIds: ['m03', 'm04'],
    zoneName: 'Central',
  },
  {
    id: 'loc_06',
    name: 'Midtown Community Garden',
    nx: 0.55, ny: 0.50,
    categoryIds: ['lost_pets', 'environmental'],
    missionIds: ['m03', 'm05'],
    zoneName: 'Central',
  },
  // ── Riverside — Environmental ─────────────────────────────────────────────
  {
    id: 'loc_03',
    name: 'Riverside Industrial',
    nx: 0.14, ny: 0.72,
    categoryIds: ['environmental'],
    missionIds: ['m05', 'm06'],
    zoneName: 'Riverside',
  },
  {
    id: 'loc_08',
    name: 'River Drainage Channel',
    nx: 0.46, ny: 0.84,
    categoryIds: ['environmental'],
    missionIds: ['m06'],
    zoneName: 'Riverside',
  },
  // ── School District — Education ───────────────────────────────────────────
  {
    id: 'loc_04',
    name: 'Lincoln Elementary',
    nx: 0.76, ny: 0.26,
    categoryIds: ['education'],
    missionIds: ['m07', 'm08'],
    zoneName: 'School District',
  },
  {
    id: 'loc_07',
    name: 'Jefferson Middle School',
    nx: 0.84, ny: 0.64,
    categoryIds: ['education'],
    missionIds: ['m07'],
    zoneName: 'School District',
  },
];

export function getLocationById(id: string): Location | undefined {
  return locations.find(l => l.id === id);
}
