import type { SourceCapabilityKey } from './sourceTypes';

/**
 * Maps abstract capability lanes to concrete `sourceId`s from `dpalSourceRegistry`.
 * Used for routing and documentation — runtime wiring still goes through adapters.
 */
export const sourceCapabilityMap: Readonly<Record<SourceCapabilityKey, readonly string[]>> = {
  ocean_color: ['PACE_OCI', 'SENTINEL_2', 'SENTINEL_3', 'VIIRS', 'MODIS'],
  water_surface_topo: ['SWOT'],
  optical_vegetation_water: ['SENTINEL_2', 'SENTINEL_3', 'LANDSAT_8_9', 'NASA_HLS', 'VIIRS', 'MODIS', 'PLANET_SCOPE', 'MAXAR_WORLDVIEW'],
  thermal_land_stress: ['LANDSAT_8_9', 'ECOSTRESS', 'MODIS', 'SENTINEL_3'],
  sar_surface: ['SENTINEL_1', 'ICEYE_SAR', 'CAPELLA_SAR', 'NISAR'],
  lidar_biomass_height: ['GEDI_LIDAR', 'ICESAT_2'],
  biomass_map: ['ESA_BIOMASS', 'GEDI_LIDAR'],
  active_fire: ['NASA_FIRMS', 'VIIRS', 'MODIS', 'SENTINEL_2'],
  trace_gases: ['SENTINEL_5P_TROPOMI', 'TEMPO', 'SENTINEL_4', 'OCO_2', 'OCO_3', 'GOSAT', 'GOSAT_GW', 'CO2M_FUTURE', 'GHGSAT', 'CARBON_MAPPER_TANAGER'],
  co2_total_column: ['OCO_2', 'OCO_3', 'GOSAT', 'SENTINEL_5P_TROPOMI', 'CO2M_FUTURE'],
  methane_plume_screening: ['SENTINEL_5P_TROPOMI', 'GHGSAT', 'GOSAT', 'GOSAT_GW', 'CO2M_FUTURE', 'CARBON_MAPPER_TANAGER'],
  dust_mineral_hyperspectral: ['NASA_EMIT', 'CARBON_MAPPER_TANAGER', 'CHIME_FUTURE', 'NASA_SBG_FUTURE'],
  gravity_hydrology: ['GRACE_FO'],
  soil_moisture: ['SMAP'],
  land_cover_dynamic: ['DYNAMIC_WORLD', 'SENTINEL_2', 'NASA_HLS', 'LANDSAT_8_9', 'PLANET_SCOPE'],
  public_emissions_facility: ['EPA_DATASET', 'CARB_DATASET'],
  corporate_disclosure: ['COMPANY_DISCLOSURE', 'ESG_REPORT', 'REGULATORY_FILING'],
  field_lab_ground_truth: ['FIELD_SENSOR', 'DRONE_SURVEY', 'LAB_SAMPLE', 'COMMUNITY_REPORT', 'QR_EVIDENCE', 'INCIDENT_REPORT'],
  maritime_tracking: ['AIS_VESSEL_DATA'],
  weather_hydro_context: ['WEATHER_DATA', 'RIVER_TIDE_DATA', 'FIELD_SENSOR'],
};
