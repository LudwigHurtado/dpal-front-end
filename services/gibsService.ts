/**
 * NASA GIBS (Global Imagery Browse Services) layer catalog + URL builder
 *
 * WMTS REST pattern (epsg3857 / Web Mercator — Leaflet-compatible):
 *   https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/
 *   {LayerId}/default/{Date}/GoogleMapsCompatible_Level{N}/{z}/{y}/{x}.{ext}
 *
 * Free, no API key. Updated daily (3–5 hr lag).
 * https://nasa-gibs.github.io/gibs-api-docs/
 *
 * Attribution required:
 *   "We acknowledge the use of imagery provided by services from NASA's
 *    Global Imagery Browse Services (GIBS), part of NASA's ESDIS."
 */

export type GibsCategory =
  | 'true_color'
  | 'vegetation'
  | 'soil_moisture'
  | 'temperature'
  | 'water'
  | 'atmosphere'
  | 'reference';

export interface GibsLayerDef {
  id: string;
  label: string;
  description: string;
  format: 'jpg' | 'png';
  tileMatrixLevel: number;  // GoogleMapsCompatible_Level{N}
  maxNativeZoom: number;
  category: GibsCategory;
  opacity: number;
  temporal: 'daily' | '8day' | 'monthly' | 'annual' | 'static';
  startYear: number;
  badgeColor: string;
}

export const GIBS_LAYERS: GibsLayerDef[] = [
  // ── True Color ──────────────────────────────────────────────────
  {
    id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    label: 'True Color — Terra MODIS',
    description: 'Daily true color at 250 m. Terra overpass ~10:30 AM local.',
    format: 'jpg', tileMatrixLevel: 9, maxNativeZoom: 9,
    category: 'true_color', opacity: 1.0,
    temporal: 'daily', startYear: 2000,
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    label: 'True Color — VIIRS/SNPP',
    description: 'Daily true color at 375 m from Suomi NPP (2012–present).',
    format: 'jpg', tileMatrixLevel: 9, maxNativeZoom: 9,
    category: 'true_color', opacity: 1.0,
    temporal: 'daily', startYear: 2012,
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  {
    id: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
    label: 'True Color — VIIRS/NOAA-20',
    description: 'Daily true color from NOAA-20 VIIRS (2018–present).',
    format: 'jpg', tileMatrixLevel: 9, maxNativeZoom: 9,
    category: 'true_color', opacity: 1.0,
    temporal: 'daily', startYear: 2018,
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  {
    id: 'MODIS_Aqua_CorrectedReflectance_TrueColor',
    label: 'True Color — Aqua MODIS',
    description: 'Daily true color at 250 m. Aqua overpass ~1:30 PM local.',
    format: 'jpg', tileMatrixLevel: 9, maxNativeZoom: 9,
    category: 'true_color', opacity: 1.0,
    temporal: 'daily', startYear: 2002,
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },

  // ── Vegetation / NDVI ───────────────────────────────────────────
  {
    id: 'MODIS_Terra_NDVI_8Day',
    label: 'NDVI 8-Day — Terra MODIS',
    description: 'Vegetation index (8-day composite, 250 m). Green = healthy, red = stressed.',
    format: 'png', tileMatrixLevel: 9, maxNativeZoom: 9,
    category: 'vegetation', opacity: 0.85,
    temporal: '8day', startYear: 2000,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'MODIS_Aqua_NDVI_8Day',
    label: 'NDVI 8-Day — Aqua MODIS',
    description: 'NDVI 8-day composite from Aqua satellite (250 m).',
    format: 'png', tileMatrixLevel: 9, maxNativeZoom: 9,
    category: 'vegetation', opacity: 0.85,
    temporal: '8day', startYear: 2002,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'MODIS_Terra_EVI_8Day',
    label: 'EVI 8-Day — Terra MODIS',
    description: 'Enhanced Vegetation Index — less saturation in dense canopies.',
    format: 'png', tileMatrixLevel: 9, maxNativeZoom: 9,
    category: 'vegetation', opacity: 0.85,
    temporal: '8day', startYear: 2000,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  // ── Soil Moisture (SMAP) ────────────────────────────────────────
  {
    id: 'SMAP_L3_Passive_Day_SoilMoisture_Option1',
    label: 'Soil Moisture AM — SMAP',
    description: 'SMAP L3 passive microwave soil moisture (am overpass, ~36 km). Blue = wet.',
    format: 'png', tileMatrixLevel: 6, maxNativeZoom: 6,
    category: 'soil_moisture', opacity: 0.85,
    temporal: 'daily', startYear: 2015,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'SMAP_L3_Passive_Night_SoilMoisture_Option1',
    label: 'Soil Moisture PM — SMAP',
    description: 'SMAP L3 passive soil moisture (pm overpass, ~36 km).',
    format: 'png', tileMatrixLevel: 6, maxNativeZoom: 6,
    category: 'soil_moisture', opacity: 0.85,
    temporal: 'daily', startYear: 2015,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  // ── Land Surface Temperature ────────────────────────────────────
  {
    id: 'MODIS_Terra_Land_Surface_Temp_Day',
    label: 'Land Surface Temp Day — Terra',
    description: 'Daytime land surface temperature at 1 km. Yellow/red = hot, purple = cold.',
    format: 'png', tileMatrixLevel: 7, maxNativeZoom: 7,
    category: 'temperature', opacity: 0.85,
    temporal: 'daily', startYear: 2000,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  {
    id: 'MODIS_Terra_Land_Surface_Temp_Night',
    label: 'Land Surface Temp Night — Terra',
    description: 'Nighttime land surface temperature at 1 km.',
    format: 'png', tileMatrixLevel: 7, maxNativeZoom: 7,
    category: 'temperature', opacity: 0.85,
    temporal: 'daily', startYear: 2000,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  {
    id: 'MODIS_Aqua_Land_Surface_Temp_Day',
    label: 'Land Surface Temp Day — Aqua',
    description: 'Aqua daytime land surface temperature at 1 km.',
    format: 'png', tileMatrixLevel: 7, maxNativeZoom: 7,
    category: 'temperature', opacity: 0.85,
    temporal: 'daily', startYear: 2002,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  // ── Water / Hydrology ───────────────────────────────────────────
  {
    id: 'MODIS_Terra_Water_Vapor_5km_Day',
    label: 'Water Vapor Day — Terra',
    description: 'Total column water vapor at 5 km. Dark = dry, light = humid.',
    format: 'png', tileMatrixLevel: 7, maxNativeZoom: 7,
    category: 'water', opacity: 0.8,
    temporal: 'daily', startYear: 2000,
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  {
    id: 'MODIS_Terra_Snow_Cover_Daily',
    label: 'Snow Cover — Terra',
    description: 'Daily snow cover extent at 500 m. White = snow-covered.',
    format: 'png', tileMatrixLevel: 8, maxNativeZoom: 8,
    category: 'water', opacity: 0.85,
    temporal: 'daily', startYear: 2000,
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },

  // ── Atmosphere ──────────────────────────────────────────────────
  {
    id: 'MODIS_Terra_Aerosol',
    label: 'Aerosol Optical Depth — Terra',
    description: 'Aerosol optical depth at 10 km. High = smoke, dust, or pollution.',
    format: 'png', tileMatrixLevel: 6, maxNativeZoom: 6,
    category: 'atmosphere', opacity: 0.8,
    temporal: 'daily', startYear: 2000,
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  },
  {
    id: 'MODIS_Terra_CorrectedReflectance_Bands367',
    label: 'False Color (Fire) — Terra',
    description: 'Band 3-6-7 false color highlights active fire and burn scars in red.',
    format: 'jpg', tileMatrixLevel: 9, maxNativeZoom: 9,
    category: 'atmosphere', opacity: 1.0,
    temporal: 'daily', startYear: 2000,
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  },

  // ── Reference / Base ────────────────────────────────────────────
  {
    id: 'BlueMarble_NextGeneration',
    label: 'Blue Marble (Monthly)',
    description: 'NASA Blue Marble monthly true color composites.',
    format: 'jpg', tileMatrixLevel: 8, maxNativeZoom: 8,
    category: 'reference', opacity: 1.0,
    temporal: 'monthly', startYear: 2004,
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  },
  {
    id: 'VIIRS_Black_Marble',
    label: 'Black Marble (Night Lights)',
    description: 'VIIRS nighttime lights composite — urban areas appear brightest.',
    format: 'jpg', tileMatrixLevel: 8, maxNativeZoom: 8,
    category: 'reference', opacity: 1.0,
    temporal: 'monthly', startYear: 2012,
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  },
];

/** Build a Leaflet-compatible WMTS tile URL for a GIBS layer (epsg3857). */
export function gibsTileUrl(
  layerId: string,
  date: string,
  tileMatrixLevel: number,
  format: 'jpg' | 'png'
): string {
  return (
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` +
    `${layerId}/default/${date}/` +
    `GoogleMapsCompatible_Level${tileMatrixLevel}/{z}/{y}/{x}.${format}`
  );
}

/** Yesterday's date as YYYY-MM-DD (GIBS has 3–5 hr lag, yesterday is always safe). */
export function gibsDefaultDate(): string {
  const d = new Date(Date.now() - 24 * 3600_000);
  return d.toISOString().slice(0, 10);
}

/** Category display labels. */
export const GIBS_CATEGORY_LABEL: Record<GibsCategory, string> = {
  true_color:    'True Color',
  vegetation:    'Vegetation',
  soil_moisture: 'Soil Moisture',
  temperature:   'Temperature',
  water:         'Water',
  atmosphere:    'Atmosphere',
  reference:     'Reference',
};

export const GIBS_ATTRIBUTION =
  'Imagery: <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA GIBS / ESDIS</a> | ' +
  'Tiles: <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>';
