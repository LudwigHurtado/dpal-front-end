/**
 * Seeded cities + zones (Geo-IDs). Matches the frontend Santa Cruz / Denver demo dataset.
 */

import type { FloodCity, FloodZone } from './floodGuardTypes';

function rectPolygon(
  lat: number,
  lng: number,
  halfLatDeg: number,
  halfLngDeg: number,
): Array<[number, number]> {
  return [
    [lng - halfLngDeg, lat - halfLatDeg],
    [lng + halfLngDeg, lat - halfLatDeg],
    [lng + halfLngDeg, lat + halfLatDeg],
    [lng - halfLngDeg, lat + halfLatDeg],
    [lng - halfLngDeg, lat - halfLatDeg],
  ];
}

export const FLOOD_CITIES: FloodCity[] = [
  {
    cityId: 'SCZ',
    name: 'Santa Cruz de la Sierra',
    region: 'Santa Cruz',
    country: 'Bolivia',
    centerLat: -17.7833,
    centerLng: -63.1822,
    defaultZoom: 12,
    populationEstimate: 1_750_000,
    monitoringSince: '2026-04-01',
  },
  {
    cityId: 'DEN',
    name: 'Denver',
    region: 'Colorado',
    country: 'United States',
    centerLat: 39.7392,
    centerLng: -104.9903,
    defaultZoom: 11,
    populationEstimate: 715_000,
    monitoringSince: '2026-04-01',
  },
];

const SANTA_CRUZ_ZONES: FloodZone[] = [
  {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    cityId: 'SCZ',
    name: 'Plan 3000 — Av. Virgen de Cotoca corridor',
    description:
      'Densely populated district near drainage canals; recurrent flooding during heavy summer storms.',
    polygon: rectPolygon(-17.795, -63.13, 0.012, 0.018),
    center: { lat: -17.795, lng: -63.13 },
    geohash: '6kg7p7q',
    riskCategory: 'high',
    exposure: {
      schools: 9,
      hospitals: 1,
      shelters: 2,
      majorRoads: 3,
      bridges: 2,
      estimatedResidents: 220_000,
    },
    history: [
      { date: '2024-02-08', summary: 'Av. Virgen de Cotoca closed for 18 hours after canal overflow.', peakLevel: 4 },
      { date: '2025-01-14', summary: 'Two schools evacuated; road damage reported on three avenues.', peakLevel: 3 },
    ],
    notableLocations: ['Av. Virgen de Cotoca', 'Mercado Plan 3000', 'Unidad Educativa Tres Pasos al Frente'],
    activeAlertId: null,
  },
  {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-B-0001',
    cityId: 'SCZ',
    name: 'Piraí riverbank — 4to Anillo',
    description:
      'Riverbank zone along Río Piraí; satellite water-extent expansion is a leading indicator.',
    polygon: rectPolygon(-17.778, -63.205, 0.01, 0.02),
    center: { lat: -17.778, lng: -63.205 },
    geohash: '6kg7n3v',
    riskCategory: 'critical',
    exposure: {
      schools: 4,
      hospitals: 0,
      shelters: 1,
      majorRoads: 4,
      bridges: 3,
      estimatedResidents: 95_000,
    },
    history: [
      { date: '2023-03-02', summary: 'Río Piraí breached embankment; 1,200 households temporarily relocated.', peakLevel: 5 },
      { date: '2024-12-21', summary: 'Bridge inspection triggered after upstream rainfall.', peakLevel: 2 },
    ],
    notableLocations: ['Puente Mario Foianini', 'Río Piraí Norte', 'Parque Urbano'],
    activeAlertId: null,
  },
  {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-C-0001',
    cityId: 'SCZ',
    name: 'Equipetrol Norte drainage basin',
    description:
      'Lower-elevation commercial zone; drainage backups regularly detected by AquaScan and citizen reports.',
    polygon: rectPolygon(-17.769, -63.196, 0.008, 0.012),
    center: { lat: -17.769, lng: -63.196 },
    geohash: '6kg7n6f',
    riskCategory: 'moderate',
    exposure: {
      schools: 2,
      hospitals: 1,
      shelters: 0,
      majorRoads: 2,
      bridges: 1,
      estimatedResidents: 38_000,
    },
    history: [{ date: '2025-02-16', summary: 'Standing water on Av. San Martín after 40 mm rainfall.', peakLevel: 2 }],
    notableLocations: ['Av. San Martín', 'Hospital Equipetrol', 'Mall Ventura'],
    activeAlertId: null,
  },
  {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-D-0001',
    cityId: 'SCZ',
    name: 'Centro Histórico — Plaza 24 de Septiembre',
    description:
      'Historic core. Lower flood frequency but high visibility; small drainage failures trigger civic concern.',
    polygon: rectPolygon(-17.7843, -63.1822, 0.006, 0.008),
    center: { lat: -17.7843, lng: -63.1822 },
    geohash: '6kg7q3z',
    riskCategory: 'low',
    exposure: {
      schools: 3,
      hospitals: 1,
      shelters: 1,
      majorRoads: 4,
      bridges: 0,
      estimatedResidents: 24_000,
    },
    history: [{ date: '2024-11-08', summary: 'Brief street pooling near Catedral after intense afternoon storm.', peakLevel: 1 }],
    notableLocations: ['Plaza 24 de Septiembre', 'Catedral Metropolitana', 'Av. René Moreno'],
    activeAlertId: null,
  },
];

const DENVER_ZONES: FloodZone[] = [
  {
    zoneId: 'DPAL-FLOOD-DEN-ZONE-A-0001',
    cityId: 'DEN',
    name: 'South Platte River — Confluence',
    description:
      'Major confluence zone; rapid rainfall + snowmelt can drive river gauge spikes within hours.',
    polygon: rectPolygon(39.7536, -105.0078, 0.008, 0.012),
    center: { lat: 39.7536, lng: -105.0078 },
    geohash: '9xj64w0',
    riskCategory: 'high',
    exposure: {
      schools: 2,
      hospitals: 1,
      shelters: 1,
      majorRoads: 5,
      bridges: 4,
      estimatedResidents: 18_000,
    },
    history: [
      {
        date: '2023-05-11',
        summary: 'River gauge rose 1.4 m in six hours; trail closures across Confluence Park.',
        peakLevel: 3,
      },
    ],
    notableLocations: ['Confluence Park', 'Cherry Creek mouth', 'I-25 corridor'],
    activeAlertId: null,
  },
];

const ZONES_BY_CITY: Record<string, FloodZone[]> = {
  SCZ: SANTA_CRUZ_ZONES,
  DEN: DENVER_ZONES,
};

const ALL_ZONES: FloodZone[] = [...SANTA_CRUZ_ZONES, ...DENVER_ZONES];

/** All registered Geo-ID zones (SCZ + DEN pilot). */
export function listAllRegisteredZones(): FloodZone[] {
  return ALL_ZONES.map((z) => ({ ...z }));
}

/** Ray-cast point-in-polygon. Ring is [lng, lat]. */
export function pointInPolygon(lng: number, lat: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findZoneForPoint(lat: number, lng: number): FloodZone | null {
  for (const zone of ALL_ZONES) {
    if (pointInPolygon(lng, lat, zone.polygon)) return zone;
  }
  return null;
}

export function getCities(): FloodCity[] {
  return FLOOD_CITIES;
}

export function getZonesForCity(cityId: string): FloodZone[] {
  return ZONES_BY_CITY[cityId] ?? [];
}

export function getZoneById(zoneId: string): FloodZone | undefined {
  return ALL_ZONES.find((z) => z.zoneId === zoneId);
}

export function cloneZone(zone: FloodZone, activeAlertId: string | null): FloodZone {
  return { ...zone, activeAlertId };
}
