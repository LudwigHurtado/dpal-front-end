import type {
  CauseLocationMode,
  CauseOrganization,
  CauseRouteMode,
  CauseSearchRadiusKm,
} from './types';

export type CauseDiscoveryQuery = {
  country: string;
  city: string;
  areaQuery: string;
  locationMode: CauseLocationMode;
  routeMode: CauseRouteMode;
  radiusKm: CauseSearchRadiusKm;
  pickupLabel?: string;
  dropoffLabel?: string;
};

export const CHARITY_DISCOVERY_LIVE_SEARCH_CONNECTED = false;

const SAMPLE_CAUSES: CauseOrganization[] = [
  {
    id: 'scz-animals-001',
    name: 'Fundacion Huellas Santa Cruz',
    category: 'Animales',
    city: 'Santa Cruz',
    country: 'Bolivia',
    address: 'Av. Roca y Coronado, Santa Cruz',
    coordinates: { lat: -17.7863, lng: -63.1812 },
    mission: 'Rescate y transporte de animales en riesgo.',
    shortDescription: 'Brinda rescate, albergue temporal y traslados veterinarios.',
    verified: true,
    verificationStatus: 'verified',
    distanceKm: 6.2,
    etaMinutes: 12,
    tags: ['Impacto local', 'Necesita transporte', 'Organizacion verificada'],
    aiReason: 'Cerca de tu zona y alta necesidad de transporte solidario.',
    impactStats: { animalsRescued: 380, volunteersActive: 46, reportsVerified: 92 },
    media: { previewImageUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=70' },
    actions: ['Ver causa', 'Adjuntar al viaje', 'Usar esta ubicacion'],
    canAttachToRide: true,
    canUseAsDestination: true,
    canDonate: true,
    canSave: true,
  },
  {
    id: 'cdmx-food-001',
    name: 'Banco de Alimentos CDMX',
    category: 'Alimentacion',
    city: 'Ciudad de Mexico',
    country: 'Mexico',
    address: 'Iztapalapa, Ciudad de Mexico',
    coordinates: { lat: 19.3575, lng: -99.1013 },
    mission: 'Distribuir alimentos a comunidades con inseguridad alimentaria.',
    shortDescription: 'Coordina rutas de entrega con voluntariado local.',
    verified: true,
    verificationStatus: 'community_verified',
    distanceKm: 9.8,
    etaMinutes: 20,
    tags: ['Alta necesidad', 'En tu ruta', 'Organizacion verificada'],
    aiReason: 'Coincide con tu area elegida y reporta alta demanda esta semana.',
    impactStats: { mealsServed: 12400, volunteersActive: 120, reportsVerified: 154 },
    media: { previewImageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=70' },
    actions: ['Ver causa', 'Apoyar esta causa', 'Guardar'],
    canAttachToRide: true,
    canUseAsDestination: true,
    canDonate: true,
    canSave: true,
  },
  {
    id: 'cdmx-salud-002',
    name: 'Salud Comunitaria CDMX',
    category: 'Salud',
    city: 'Ciudad de Mexico',
    country: 'Mexico',
    address: 'Coyoacan, Ciudad de Mexico',
    coordinates: { lat: 19.3467, lng: -99.1617 },
    mission: 'Apoyo de transporte para consultas, medicinas y seguimiento medico.',
    shortDescription: 'Coordina traslados para pacientes y personas cuidadoras.',
    verified: true,
    verificationStatus: 'verified',
    distanceKm: 7.1,
    etaMinutes: 16,
    tags: ['Necesita transporte', 'Organizacion verificada', 'Impacto local'],
    aiReason: 'Coincide con necesidades de traslado en la zona seleccionada.',
    impactStats: { seniorsServed: 410, volunteersActive: 64, reportsVerified: 133 },
    media: { previewImageUrl: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=1200&q=70' },
    actions: ['Ver causa', 'Adjuntar al viaje', 'Usar esta ubicacion'],
    canAttachToRide: true,
    canUseAsDestination: true,
    canDonate: true,
    canSave: true,
  },
  {
    id: 'generic-community-001',
    name: 'Red Comunitaria de Apoyo',
    category: 'Comunidad',
    city: 'Tu ciudad',
    country: 'Tu pais',
    address: 'Centro comunitario local',
    coordinates: { lat: 40.7128, lng: -74.006 },
    mission: 'Conectar transporte solidario con necesidades urgentes.',
    shortDescription: 'Atiende casos de salud, adultos mayores y niñez.',
    verified: true,
    verificationStatus: 'verified',
    distanceKm: 4.5,
    etaMinutes: 9,
    tags: ['Impacto local', 'Recomendado para este viaje', 'Necesita transporte'],
    aiReason: 'Recomendada por cercania de recogida y disponibilidad de impacto inmediato.',
    impactStats: { childrenSupported: 230, seniorsServed: 180, reportsVerified: 88 },
    media: { previewImageUrl: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1200&q=70' },
    actions: ['Ver causa', 'Seleccionar esta zona', 'Adjuntar al viaje'],
    canAttachToRide: true,
    canUseAsDestination: true,
    canDonate: true,
    canSave: true,
  },
];

const normalize = (value: string) => value.trim().toLowerCase();

export async function discoverCauseOrganizations(query: CauseDiscoveryQuery): Promise<CauseOrganization[]> {
  const city = normalize(query.city);
  const country = normalize(query.country);
  const area = normalize(query.areaQuery);

  const filtered = SAMPLE_CAUSES.filter((cause) => {
    const causeCity = normalize(cause.city);
    const causeCountry = normalize(cause.country);
    if (query.locationMode === 'other_country') {
      return country ? causeCountry.includes(country) : true;
    }
    if (query.locationMode === 'other_city') {
      const cityMatch = city ? causeCity.includes(city) : true;
      const countryMatch = country ? causeCountry.includes(country) : true;
      return cityMatch && countryMatch;
    }
    return true;
  }).filter((cause) => {
    if (!area) return true;
    return `${cause.city} ${cause.country} ${cause.address} ${cause.category}`.toLowerCase().includes(area);
  });

  const routeReasonByMode: Record<CauseRouteMode, string> = {
    near_pickup: 'near_pickup',
    near_dropoff: 'near_dropoff',
    along_route: 'along_route',
    manual_area: 'manual_area',
  };

  return filtered.slice(0, 8).map((cause, index) => ({
    ...cause,
    distanceKm: Math.max(1, (cause.distanceKm ?? 3) + index * 0.8),
    aiReason: `${cause.aiReason} ${routeReasonByMode[query.routeMode]}.`,
    tags: Array.from(new Set([routeReasonByMode[query.routeMode], ...cause.tags])),
  }));
}
