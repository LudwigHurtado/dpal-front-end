/** Curated Earth-observation missions for DMRV satellite configuration. */

export type DmrvSatelliteMission = {
  id: string;
  name: string;
  agency: string;
  tagline: string;
  description: string;
  mrvUses: string[];
  technologies: string[];
  /** Public-domain or agency-hosted artwork for UI cards. */
  imageUrl: string;
  revisit: string;
  resolution: string;
};

export const DMRV_SATELLITE_MISSIONS: DmrvSatelliteMission[] = [
  {
    id: 'landsat-9',
    name: 'Landsat 9',
    agency: 'NASA / USGS',
    tagline: 'Long-archive land screening',
    description:
      'Workhorse optical land mission with decades of continuity. Best for forest cover change, burn scars, NDVI/NBR trends, and baseline vs monitoring comparisons inside your AOI.',
    mrvUses: ['Forest & land cover', 'Burn severity', 'NDVI / NBR time series', 'Baseline imagery'],
    technologies: ['OLI-2 multispectral', 'TIRS-2 thermal', 'Collection 2 Surface Reflectance', '30 m pixels'],
    imageUrl: '/dmrv/satellites/landsat-9.png',
    revisit: '~16 days (combined with Landsat 8)',
    resolution: '30 m (15 m pan)',
  },
  {
    id: 'sentinel-2',
    name: 'Sentinel-2',
    agency: 'ESA Copernicus',
    tagline: 'High-frequency optical detail',
    description:
      'Ten-meter multispectral imagery for vegetation health, agriculture, wetlands, and shoreline change. Common choice when you need fresher optical scenes than Landsat alone.',
    mrvUses: ['Vegetation vigor', 'Land use & restoration', 'Water edges & wetlands', 'Before / after optical pairs'],
    technologies: ['MSI multispectral', 'Level-2A surface reflectance', '10–20 m bands', 'Sentinel Hub / PC STAC'],
    imageUrl: '/dmrv/satellites/sentinel-2.png',
    revisit: '~5 days (twin satellites)',
    resolution: '10 m (visible/NIR)',
  },
  {
    id: 'sentinel-1',
    name: 'Sentinel-1',
    agency: 'ESA Copernicus',
    tagline: 'All-weather SAR',
    description:
      'C-band radar sees through clouds and night. Used for flood extent, surface water under cloud, disturbance, and structural change when optical scenes are blocked.',
    mrvUses: ['Flood & surface water', 'Wetland inundation', 'Disturbance screening', 'Cloud-free monitoring'],
    technologies: ['C-band SAR (IW)', 'VV / VH backscatter', 'Radiometric terrain correction', 'Copernicus Data Space API'],
    imageUrl: '/dmrv/satellites/sentinel-1.png',
    revisit: '~6–12 days (constellation)',
    resolution: '5–20 m (mode dependent)',
  },
  {
    id: 'modis',
    name: 'MODIS (Terra / Aqua)',
    agency: 'NASA',
    tagline: 'Daily global context',
    description:
      'Coarse but frequent global coverage for fire hotspots, regional vegetation anomalies, snow, and drought-style screening when you need a wide-area pulse check.',
    mrvUses: ['Active fire & hotspots', 'Regional NDVI anomalies', 'Drought / snow context', 'Rapid event screening'],
    technologies: ['MODIS radiometry', 'NASA FIRMS fire detections', 'MOD13 vegetation indices', '250 m–1 km products'],
    imageUrl: '/dmrv/satellites/modis.png',
    revisit: 'Daily (polar orbiters)',
    resolution: '250 m–1 km',
  },
  {
    id: 'pace',
    name: 'PACE',
    agency: 'NASA',
    tagline: 'Ocean & atmosphere hyperspectral',
    description:
      'Plankton Aerosol Cloud ocean Ecosystem mission — hyperspectral ocean color and aerosol data for coastal water quality, chlorophyll, and atmospheric context near your project.',
    mrvUses: ['Coastal water quality', 'Ocean color & biology', 'Atmospheric aerosols', 'Hyperspectral screening'],
    technologies: ['OCI ocean color', 'HARP2 polarimetry', 'SPEXone aerosols', 'NASA CMR / OB.DAAC'],
    imageUrl: '/dmrv/satellites/pace.png',
    revisit: '1–2 days (global)',
    resolution: '1 km (OCI); finer for some products',
  },
  {
    id: 'sentinel-5p',
    name: 'Sentinel-5P',
    agency: 'ESA Copernicus',
    tagline: 'Trace gases & air quality',
    description:
      'TROPOMI instrument maps NO₂, SO₂, ozone, and methane-related columns for facility plumes, urban air quality, and atmospheric DMRV next to ground sensors.',
    mrvUses: ['NO₂ columns & air quality', 'Methane plume screening', 'Facility proximity checks', 'Regional pollution context'],
    technologies: ['TROPOMI spectrometer', 'UV–VIS–NIR–SWIR', 'Level-2 trace gas columns', 'Sentinel-5P NRT / offline'],
    imageUrl: '/dmrv/satellites/sentinel-5p.png',
    revisit: 'Daily (global)',
    resolution: '3.5 × 7 km (nadir; varies)',
  },
];

const MISSION_BY_ID = new Map(DMRV_SATELLITE_MISSIONS.map((m) => [m.id, m]));

export const DMRV_SATELLITE_SETTINGS_KEY = 'selectedSatellites';

export function parseSelectedSatelliteIds(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => MISSION_BY_ID.has(id));
}

export function serializeSelectedSatelliteIds(ids: string[]): string {
  const valid = ids.filter((id) => MISSION_BY_ID.has(id));
  return [...new Set(valid)].join(',');
}

export function toggleSatelliteSelection(current: string[], missionId: string, checked: boolean): string[] {
  if (!MISSION_BY_ID.has(missionId)) return current;
  const set = new Set(current);
  if (checked) set.add(missionId);
  else set.delete(missionId);
  return DMRV_SATELLITE_MISSIONS.map((m) => m.id).filter((id) => set.has(id));
}

export function getMissionsForIds(ids: string[]): DmrvSatelliteMission[] {
  return ids.map((id) => MISSION_BY_ID.get(id)).filter((m): m is DmrvSatelliteMission => Boolean(m));
}

export function collectTechnologiesForIds(ids: string[]): string[] {
  const tech = new Set<string>();
  for (const mission of getMissionsForIds(ids)) {
    for (const t of mission.technologies) tech.add(t);
  }
  return [...tech];
}

/** Maps mission picker IDs to sensor-catalog IDs used by reports and methodology context. */
export const DMRV_MISSION_TO_SENSOR_ID: Record<string, string> = {
  'landsat-9': 'landsat-8-9',
  'sentinel-2': 'sentinel-2-msi',
  'sentinel-1': 'sentinel-1-sar',
  modis: 'modis',
  pace: 'pace-oci',
  'sentinel-5p': 'viirs',
};

export function missionIdsToSensorSourceIds(missionIds: string[]): string[] {
  const out: string[] = [];
  for (const id of missionIds) {
    const mapped = DMRV_MISSION_TO_SENSOR_ID[id] ?? id;
    if (!out.includes(mapped)) out.push(mapped);
  }
  return out;
}
