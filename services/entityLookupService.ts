export interface NearbyEntity {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  source: 'OpenStreetMap' | 'Overpass' | 'Local dataset' | 'Unknown';
  tags?: Record<string, string>;
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const MAX_RESULTS = 20;

function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  return `[out:json][timeout:25];
(
  node["landuse"~"industrial|quarry|landfill|mine|farmyard"](around:${radiusMeters},${lat},${lng});
  node["man_made"~"water_works|wastewater_plant|petroleum_well|water_tower|storage_tank"](around:${radiusMeters},${lat},${lng});
  node["industrial"](around:${radiusMeters},${lat},${lng});
  node["amenity"~"fuel|recycling"](around:${radiusMeters},${lat},${lng});
  node["power"~"plant|substation"](around:${radiusMeters},${lat},${lng});
  node["craft"~"sawmill|brewery|distillery|winery"](around:${radiusMeters},${lat},${lng});
  way["landuse"~"industrial|quarry|landfill|mine|farmyard"](around:${radiusMeters},${lat},${lng});
  way["man_made"~"water_works|wastewater_plant"](around:${radiusMeters},${lat},${lng});
  way["industrial"](around:${radiusMeters},${lat},${lng});
  way["power"="plant"](around:${radiusMeters},${lat},${lng});
);
out center ${MAX_RESULTS * 2};`;
}

function categoryFromTags(tags: Record<string, string>): string {
  if (tags.man_made === 'water_works') return 'Water treatment';
  if (tags.man_made === 'wastewater_plant') return 'Wastewater / sewage';
  if (tags.man_made === 'petroleum_well') return 'Petroleum well';
  if (tags.man_made === 'storage_tank') return 'Storage tank';
  if (tags.man_made === 'water_tower') return 'Water tower';
  if (tags.landuse === 'industrial' || tags.industrial) return 'Industrial site';
  if (tags.landuse === 'quarry') return 'Quarry / mine';
  if (tags.landuse === 'landfill') return 'Landfill / waste site';
  if (tags.landuse === 'mine') return 'Mine';
  if (tags.landuse === 'farmyard') return 'Agricultural facility';
  if (tags.power === 'plant') return 'Power plant';
  if (tags.power === 'substation') return 'Utility substation';
  if (tags.amenity === 'fuel') return 'Fuel / gas station';
  if (tags.amenity === 'recycling') return 'Recycling facility';
  if (tags.craft) return `Manufacturing / craft (${tags.craft})`;
  if (tags.man_made) return `Facility (${tags.man_made})`;
  return 'Mapped facility';
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export async function lookupNearbyEntities(
  latitude: number,
  longitude: number,
  radiusKm = 5,
  signal?: AbortSignal,
): Promise<NearbyEntity[]> {
  const radiusMeters = Math.round(radiusKm * 1000);
  const query = buildOverpassQuery(latitude, longitude, radiusMeters);

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Overpass API returned ${response.status}`);
  }

  const data = (await response.json()) as OverpassResponse;
  const results: NearbyEntity[] = [];

  for (const el of data.elements) {
    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (elLat == null || elLng == null) continue;

    const tags = el.tags ?? {};
    const name =
      tags.name ??
      tags.operator ??
      tags['name:en'] ??
      `Unnamed ${categoryFromTags(tags)}`;

    results.push({
      id: `osm-${el.type}-${el.id}`,
      name,
      category: categoryFromTags(tags),
      latitude: elLat,
      longitude: elLng,
      distanceKm: Math.round(haversineKm(latitude, longitude, elLat, elLng) * 100) / 100,
      source: 'OpenStreetMap',
      tags,
    });
  }

  // Sort by distance; deduplicate by name+category within ~500m
  results.sort((a, b) => a.distanceKm - b.distanceKm);
  const seen = new Set<string>();
  return results
    .filter((e) => {
      const key = `${e.name}:${e.category}:${Math.round(e.distanceKm * 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_RESULTS);
}
