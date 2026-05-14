import type { BackendSourceRecord, SourceCategory, SourceStatus } from './sourceTypes';

/** Compact table: sourceId,category,status — mirrors front-end `dpalSourceRegistry.ts`. */
const SOURCE_TABLE = `
PACE_OCI,ocean_water,live
SWOT,ocean_water,live
SENTINEL_2,ocean_water,live
SENTINEL_3,ocean_water,live
LANDSAT_8_9,forest_carbon,live
NASA_HLS,forest_carbon,live
VIIRS,ocean_water,live
MODIS,forest_carbon,historical
GEDI_LIDAR,forest_carbon,live
ESA_BIOMASS,forest_carbon,future
SENTINEL_1,forest_carbon,live
ICESAT_2,forest_carbon,live
NASA_FIRMS,forest_carbon,live
NASA_EMIT,atmosphere_emissions,live
SENTINEL_5P_TROPOMI,atmosphere_emissions,live
TEMPO,atmosphere_emissions,live
SENTINEL_4,atmosphere_emissions,future
OCO_2,atmosphere_emissions,historical
OCO_3,atmosphere_emissions,live
GOSAT,atmosphere_emissions,historical
GOSAT_GW,atmosphere_emissions,future
CO2M_FUTURE,atmosphere_emissions,future
CARBON_MAPPER_TANAGER,atmosphere_emissions,partner_required
GHGSAT,atmosphere_emissions,commercial
NISAR,heat_land,future
ECOSTRESS,heat_land,live
CHIME_FUTURE,heat_land,future
LSTM_FUTURE,heat_land,future
LANDSAT_NEXT_FUTURE,heat_land,future
NASA_SBG_FUTURE,heat_land,future
SMAP,heat_land,live
GRACE_FO,heat_land,live
DYNAMIC_WORLD,heat_land,live
COMPANY_DISCLOSURE,ground_truth_public_records,public_record
ESG_REPORT,ground_truth_public_records,public_record
REGULATORY_FILING,ground_truth_public_records,public_record
CARB_DATASET,ground_truth_public_records,public_record
EPA_DATASET,ground_truth_public_records,public_record
FIELD_SENSOR,ground_truth_public_records,live
DRONE_SURVEY,ground_truth_public_records,not_configured
LAB_SAMPLE,ground_truth_public_records,not_configured
COMMUNITY_REPORT,ground_truth_public_records,public_record
QR_EVIDENCE,ground_truth_public_records,live
WEATHER_DATA,ground_truth_public_records,public_record
RIVER_TIDE_DATA,ground_truth_public_records,public_record
INCIDENT_REPORT,ground_truth_public_records,public_record
AIS_VESSEL_DATA,ground_truth_public_records,commercial
PLANET_SCOPE,commercial_partner,commercial
MAXAR_WORLDVIEW,commercial_partner,commercial
ICEYE_SAR,commercial_partner,commercial
CAPELLA_SAR,commercial_partner,commercial
`
  .trim()
  .split(/\n/)
  .map((l) => l.trim())
  .filter(Boolean)
  .map((line) => {
    const [sourceId, category, status] = line.split(',') as [string, SourceCategory, SourceStatus];
    return { sourceId, category, status };
  });

const DISPLAY_NAMES: Readonly<Record<string, string>> = {
  PACE_OCI: 'PACE / OCI ocean color',
  SWOT: 'SWOT surface water topography',
  SENTINEL_2: 'Sentinel-2 MSI',
  SENTINEL_3: 'Sentinel-3 OLCI / SLSTR',
  LANDSAT_8_9: 'Landsat 8/9',
  NASA_HLS: 'NASA Harmonized Landsat Sentinel-2',
  VIIRS: 'VIIRS',
  MODIS: 'MODIS Terra/Aqua',
  GEDI_LIDAR: 'GEDI lidar',
  ESA_BIOMASS: 'ESA Biomass mission',
  SENTINEL_1: 'Sentinel-1 C-SAR',
  ICESAT_2: 'ICESat-2 ATLAS',
  NASA_FIRMS: 'NASA FIRMS',
  NASA_EMIT: 'NASA EMIT',
  SENTINEL_5P_TROPOMI: 'Sentinel-5P TROPOMI',
  TEMPO: 'TEMPO',
  SENTINEL_4: 'Sentinel-4 (future ops in DPAL)',
  OCO_2: 'OCO-2',
  OCO_3: 'OCO-3',
  GOSAT: 'GOSAT',
  GOSAT_GW: 'GOSAT-GW',
  CO2M_FUTURE: 'CO2M (future)',
  CARBON_MAPPER_TANAGER: 'Carbon Mapper / Tanager path',
  GHGSAT: 'GHGSat',
  NISAR: 'NISAR',
  ECOSTRESS: 'ECOSTRESS',
  CHIME_FUTURE: 'CHIME (future)',
  LSTM_FUTURE: 'LSTM (future)',
  LANDSAT_NEXT_FUTURE: 'Landsat Next (future)',
  NASA_SBG_FUTURE: 'NASA SBG (future)',
  SMAP: 'SMAP',
  GRACE_FO: 'GRACE / GRACE-FO',
  DYNAMIC_WORLD: 'Dynamic World',
  COMPANY_DISCLOSURE: 'Company disclosure filings',
  ESG_REPORT: 'ESG / sustainability reports',
  REGULATORY_FILING: 'Regulatory filings',
  CARB_DATASET: 'CARB datasets',
  EPA_DATASET: 'EPA datasets',
  FIELD_SENSOR: 'Field sensors',
  DRONE_SURVEY: 'Drone / UAS surveys',
  LAB_SAMPLE: 'Laboratory samples',
  COMMUNITY_REPORT: 'Community reports',
  QR_EVIDENCE: 'QR-linked evidence',
  WEATHER_DATA: 'Weather / meteorological context',
  RIVER_TIDE_DATA: 'River / tide gauges',
  INCIDENT_REPORT: 'Incident / situation reports',
  AIS_VESSEL_DATA: 'AIS vessel tracking',
  PLANET_SCOPE: 'PlanetScope',
  MAXAR_WORLDVIEW: 'Maxar WorldView',
  ICEYE_SAR: 'ICEYE SAR',
  CAPELLA_SAR: 'Capella SAR',
};

const DEFAULT_LIMITATIONS: Readonly<Record<SourceStatus, string[]>> = {
  live: ['Screening result — pending verification unless reviewer workflow confirms.'],
  public_record: ['Public record accuracy and completeness vary; corroborate primary sources.'],
  commercial: ['Commercial license and tasking required — not assumed available in the public stack.'],
  partner_required: ['Partner agreement and technical onboarding required before execution.'],
  future: ['Future mission — must not run as a live DPAL provider until status is live.'],
  historical: ['Historical archive — check product lineage and operational gaps when interpreting trends.'],
  not_configured: ['Adapter or upload workflow not configured on this deployment.'],
  unavailable: ['Unavailable — treat as absent for confidence scoring.'],
};

function signalsFor(id: string): string[] {
  if (id.includes('SENTINEL_5') || id === 'TEMPO' || id === 'OCO_2' || id === 'OCO_3' || id === 'GOSAT' || id === 'GHGSAT')
    return ['trace_gases', 'co2', 'methane', 'air_quality'];
  if (id.includes('LANDSAT') || id === 'NASA_HLS' || id === 'SENTINEL_2' || id === 'DYNAMIC_WORLD') return ['ndvi', 'land_cover'];
  if (id === 'SENTINEL_1' || id.includes('SAR')) return ['sar', 'flood', 'deformation'];
  if (id === 'PACE_OCI' || id === 'SENTINEL_3' || id === 'VIIRS' || id === 'MODIS') return ['ocean_color', 'ndvi', 'fire'];
  if (id === 'SWOT' || id === 'GRACE_FO' || id === 'SMAP') return ['hydrology', 'storage', 'soil_moisture'];
  if (id === 'GEDI_LIDAR' || id === 'ICESAT_2') return ['structure', 'height'];
  if (id === 'NASA_FIRMS') return ['active_fire'];
  if (id === 'NASA_EMIT') return ['spectroscopy', 'minerals'];
  if (id === 'ECOSTRESS') return ['thermal', 'et'];
  if (id === 'EPA_DATASET' || id === 'CARB_DATASET') return ['facility_registry', 'reported_emissions'];
  if (id === 'COMPANY_DISCLOSURE' || id === 'ESG_REPORT' || id === 'REGULATORY_FILING') return ['disclosure'];
  if (id === 'FIELD_SENSOR' || id === 'LAB_SAMPLE' || id === 'DRONE_SURVEY') return ['ground_truth'];
  if (id === 'COMMUNITY_REPORT' || id === 'INCIDENT_REPORT') return ['human_observation'];
  if (id === 'QR_EVIDENCE') return ['artifact_linkage'];
  if (id === 'WEATHER_DATA' || id === 'RIVER_TIDE_DATA') return ['meteorology', 'hydrology'];
  if (id === 'AIS_VESSEL_DATA') return ['maritime'];
  return ['context'];
}

export function getBackendSourceRegistry(): BackendSourceRecord[] {
  return SOURCE_TABLE.map((row) => ({
    sourceId: row.sourceId,
    name: DISPLAY_NAMES[row.sourceId] ?? row.sourceId,
    category: row.category,
    status: row.status,
    signals: signalsFor(row.sourceId),
    limitations: DEFAULT_LIMITATIONS[row.status] ?? DEFAULT_LIMITATIONS.unavailable,
  }));
}

export function inferCanRunFromStatus(status: SourceStatus): boolean {
  return status === 'live' || status === 'public_record' || status === 'historical';
}
