/**
 * Mock-but-realistic FloodGuard data for the MVP city: Santa Cruz, Bolivia.
 *
 * This dataset stays inside the front-end so investors can see the full
 * concept without needing every live API connected on day one. Replace with
 * server-fed data once `/api/floodguard/cities/:cityId/zones` is implemented.
 */

import type {
  FloodAlert,
  FloodCameraDetection,
  FloodCity,
  FloodCitizenReport,
  FloodHistoricalInsight,
  FloodPublicMarker,
  FloodWeatherSignal,
  FloodZone,
} from '../floodGuardTypes';

export const SANTA_CRUZ_CITY: FloodCity = {
  cityId: 'SCZ',
  name: 'Santa Cruz de la Sierra',
  region: 'Santa Cruz',
  country: 'Bolivia',
  centerLat: -17.7833,
  centerLng: -63.1822,
  defaultZoom: 12,
  populationEstimate: 1_750_000,
  monitoringSince: '2026-04-01',
};

/** Pilot fallback city kept around so the dropdown is not lonely. */
export const DENVER_CITY: FloodCity = {
  cityId: 'DEN',
  name: 'Denver',
  region: 'Colorado',
  country: 'United States',
  centerLat: 39.7392,
  centerLng: -104.9903,
  defaultZoom: 11,
  populationEstimate: 715_000,
  monitoringSince: '2026-04-01',
};

export const FLOOD_CITIES: FloodCity[] = [SANTA_CRUZ_CITY, DENVER_CITY];

/**
 * Build a small rectangular polygon centered on (lat, lng) for mock zones.
 * Returns [lng, lat] pairs so the polygon can be passed straight into Leaflet.
 */
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

export const SANTA_CRUZ_ZONES: FloodZone[] = [
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
    activeAlertId: 'DPAL-FLOOD-ALERT-SCZ-A-0001-001',
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
    history: [
      { date: '2025-02-16', summary: 'Standing water on Av. San Martín after 40 mm rainfall.', peakLevel: 2 },
    ],
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
    history: [
      { date: '2024-11-08', summary: 'Brief street pooling near Catedral after intense afternoon storm.', peakLevel: 1 },
    ],
    notableLocations: ['Plaza 24 de Septiembre', 'Catedral Metropolitana', 'Av. René Moreno'],
    activeAlertId: null,
  },
];

export const DENVER_ZONES: FloodZone[] = [
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
      { date: '2023-05-11', summary: 'River gauge rose 1.4 m in six hours; trail closures across Confluence Park.', peakLevel: 3 },
    ],
    notableLocations: ['Confluence Park', 'Cherry Creek mouth', 'I-25 corridor'],
    activeAlertId: null,
  },
];

export const FLOOD_ZONES_BY_CITY: Record<string, FloodZone[]> = {
  SCZ: SANTA_CRUZ_ZONES,
  DEN: DENVER_ZONES,
};

// ── Mock signal snapshots ────────────────────────────────────────────────────

export const MOCK_CAMERA_DETECTIONS: FloodCameraDetection[] = [
  {
    detectionId: 'CAM-DET-SCZ-A-0001-1',
    cameraId: 'CAM-SCZ-001',
    cameraLabel: 'Plan 3000 — Av. Virgen de Cotoca cam 1',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    label: 'flash_flood',
    confidence: 0.92,
    timestamp: '2026-05-07T14:30:00Z',
    streamUrl: 'https://cams.example.org/streams/CAM-SCZ-001',
    notes: 'Camera detected moving water across full road width.',
  },
  {
    detectionId: 'CAM-DET-SCZ-A-0001-2',
    cameraId: 'CAM-SCZ-014',
    cameraLabel: 'Plan 3000 — Mercado intersection',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    label: 'standing_water',
    confidence: 0.74,
    timestamp: '2026-05-07T14:38:00Z',
    notes: 'Standing water reaching curb height.',
  },
  {
    detectionId: 'CAM-DET-SCZ-B-0001-1',
    cameraId: 'CAM-SCZ-203',
    cameraLabel: 'Puente Mario Foianini — riverbank',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-B-0001',
    label: 'river_level_rise',
    confidence: 0.81,
    timestamp: '2026-05-07T14:42:00Z',
    notes: 'River line moved up the embankment by ~30 cm in 20 minutes.',
  },
];

export const MOCK_CITIZEN_REPORTS: FloodCitizenReport[] = [
  {
    reportId: 'CIT-REP-SCZ-A-001',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    reporterHandle: 'vecino_anon_812',
    description: 'El agua ya entró a la tienda de Doña María, sube rápido.',
    observedDepthCm: 28,
    hasPhoto: true,
    timestamp: '2026-05-07T14:33:00Z',
    location: { lat: -17.7951, lng: -63.1304 },
  },
  {
    reportId: 'CIT-REP-SCZ-A-002',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    reporterHandle: 'comunidad_3000',
    description: 'Los buses no pueden cruzar la avenida.',
    observedDepthCm: 35,
    hasPhoto: false,
    timestamp: '2026-05-07T14:36:00Z',
    location: { lat: -17.7948, lng: -63.1289 },
  },
  {
    reportId: 'CIT-REP-SCZ-A-003',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    reporterHandle: 'maestra_unidad',
    description: 'Cerramos la unidad educativa y mandamos a los niños a casa.',
    hasPhoto: true,
    timestamp: '2026-05-07T14:40:00Z',
    location: { lat: -17.7955, lng: -63.1318 },
  },
];

export const MOCK_WEATHER_SIGNALS: Record<string, FloodWeatherSignal> = {
  'DPAL-FLOOD-SCZ-ZONE-A-0001': {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    rainfall30mMm: 22,
    rainfall24hMm: 78,
    riverGaugeMeters: 2.4,
    riverDeltaMeters: 0.6,
    satelliteWaterExpansionPct: 14,
    source: 'weather_feed',
    capturedAt: '2026-05-07T14:30:00Z',
  },
  'DPAL-FLOOD-SCZ-ZONE-B-0001': {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-B-0001',
    rainfall30mMm: 9,
    rainfall24hMm: 41,
    riverGaugeMeters: 3.8,
    riverDeltaMeters: 0.9,
    satelliteWaterExpansionPct: 22,
    source: 'satellite',
    capturedAt: '2026-05-07T14:30:00Z',
  },
  'DPAL-FLOOD-SCZ-ZONE-C-0001': {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-C-0001',
    rainfall30mMm: 5,
    rainfall24hMm: 24,
    satelliteWaterExpansionPct: 4,
    source: 'weather_feed',
    capturedAt: '2026-05-07T14:30:00Z',
  },
  'DPAL-FLOOD-SCZ-ZONE-D-0001': {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-D-0001',
    rainfall30mMm: 1,
    rainfall24hMm: 6,
    source: 'weather_feed',
    capturedAt: '2026-05-07T14:30:00Z',
  },
};

// ── Mock public map markers (Stage 9) ────────────────────────────────────────

export const MOCK_PUBLIC_MARKERS: FloodPublicMarker[] = [
  {
    markerId: 'PUB-SCZ-1',
    cityId: 'SCZ',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    kind: 'shelter',
    label: 'Albergue Plan 3000',
    description: 'Albergue municipal habilitado durante alertas críticas.',
    location: { lat: -17.7942, lng: -63.1295 },
    updatedAt: '2026-05-07T14:30:00Z',
  },
  {
    markerId: 'PUB-SCZ-2',
    cityId: 'SCZ',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    kind: 'blocked_road',
    label: 'Av. Virgen de Cotoca — bloqueada',
    description: 'Sin acceso para vehículos pequeños. Use ruta alternativa por 2do Anillo.',
    location: { lat: -17.7949, lng: -63.13 },
    updatedAt: '2026-05-07T14:38:00Z',
  },
  {
    markerId: 'PUB-SCZ-3',
    cityId: 'SCZ',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    kind: 'help_point',
    label: 'Punto de ayuda comunitario',
    description: 'Voluntarios entregando agua y mantas.',
    location: { lat: -17.7958, lng: -63.1311 },
    updatedAt: '2026-05-07T14:42:00Z',
  },
  {
    markerId: 'PUB-SCZ-4',
    cityId: 'SCZ',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-B-0001',
    kind: 'safe_route',
    label: 'Ruta segura: 4to Anillo Norte',
    description: 'Vía actualmente disponible para evacuación desde Piraí.',
    location: { lat: -17.7763, lng: -63.2062 },
    updatedAt: '2026-05-07T14:30:00Z',
  },
];

// ── Mock historical analytics (Stage 10) ─────────────────────────────────────

export const MOCK_HISTORICAL_INSIGHTS: FloodHistoricalInsight[] = [
  {
    insightId: 'INS-SCZ-1',
    cityId: 'SCZ',
    category: 'most_flooded_road',
    title: 'Av. Virgen de Cotoca — 7 incidentes en 24 meses',
    summary:
      'Ranking #1 de avenidas con cierres recurrentes por inundación dentro del periodo monitoreado por DPAL.',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    severity: 'critical',
    occurrences: 7,
  },
  {
    insightId: 'INS-SCZ-2',
    cityId: 'SCZ',
    category: 'drainage_failure',
    title: 'Falla repetida en cuenca Equipetrol Norte',
    summary:
      'Tres incidentes consecutivos muestran respaldo de drenaje cuando la lluvia supera 40 mm en 6 horas.',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-C-0001',
    severity: 'warning',
    occurrences: 3,
  },
  {
    insightId: 'INS-SCZ-3',
    cityId: 'SCZ',
    category: 'slowest_response',
    title: 'Tiempo promedio de respuesta más alto: Plan 3000',
    summary:
      'Promedio de 47 minutos entre detección IA y movilización oficial. DPAL recomienda revisar el flujo de despacho.',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    severity: 'warning',
    occurrences: 4,
  },
  {
    insightId: 'INS-SCZ-4',
    cityId: 'SCZ',
    category: 'repeated_zone',
    title: 'Riberas del Piraí — patrón anual recurrente',
    summary:
      'Eventos críticos cada temporada de lluvia desde 2023; la franja del 4to Anillo concentra el mayor riesgo.',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-B-0001',
    severity: 'critical',
    occurrences: 5,
  },
];

// ── Mock initial alert (drives the live feed before live data lands) ─────────

export const MOCK_INITIAL_ALERT: FloodAlert = {
  alertId: 'DPAL-FLOOD-ALERT-SCZ-A-0001-001',
  cityId: 'SCZ',
  zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
  level: 4,
  label: 'Critical Flood',
  riskScore: 87,
  confidence: 'high',
  primarySource: 'camera',
  contributingSources: ['camera', 'citizen', 'weather_feed', 'satellite'],
  reasons: [
    'Heavy rainfall detected in last 30 minutes',
    'Camera detected moving water across road',
    'Three citizen reports within 500 meters',
    'Zone has prior flood history',
  ],
  audiences: ['city_officials', 'emergency_services', 'public_users', 'schools_hospitals', 'validators'],
  channels: ['dashboard', 'push', 'email', 'webhook'],
  lifecycle: 'human_review_pending',
  createdAt: '2026-05-07T14:31:00Z',
  updatedAt: '2026-05-07T14:42:00Z',
  signalSnapshot: {
    cameras: MOCK_CAMERA_DETECTIONS.filter((c) => c.zoneId === 'DPAL-FLOOD-SCZ-ZONE-A-0001'),
    citizenReports: MOCK_CITIZEN_REPORTS.filter((c) => c.zoneId === 'DPAL-FLOOD-SCZ-ZONE-A-0001'),
    weather: MOCK_WEATHER_SIGNALS['DPAL-FLOOD-SCZ-ZONE-A-0001'] ?? null,
  },
  evidencePacketId: undefined,
  ledgerAnchorHash: undefined,
  publicSafeMessage:
    'DPAL FloodGuard observa una alerta de inundación en Plan 3000. Esto es una señal verificada de detección temprana y no reemplaza alertas oficiales del gobierno.',
};
