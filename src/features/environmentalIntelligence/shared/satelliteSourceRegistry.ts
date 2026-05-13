/**
 * Typed registry of satellite / disclosure / ground-truth lanes for disclosure-integrity UX.
 * Status reflects what this repo can actually wire today — not aspirational live claims.
 */

export type SatelliteRegistryGroup =
  | 'ocean_water'
  | 'forests_carbon'
  | 'atmosphere_emissions'
  | 'heat_land_future'
  | 'ground_truth_public';

export type SatelliteRegistrySourceStatus =
  | 'live'
  | 'partial'
  | 'metadata_only'
  | 'planned'
  | 'future'
  | 'unavailable';

export type SatelliteRegistryConfidenceRole =
  | 'primary_signal'
  | 'supporting_context'
  | 'cross_check'
  | 'ground_truth'
  | 'disclosure_claim';

export type SatelliteRegistrySourceType =
  | 'satellite'
  | 'public_record'
  | 'company_disclosure'
  | 'field_validation'
  | 'community_evidence'
  | 'weather_context';

export interface SatelliteRegistryEntry {
  id: string;
  label: string;
  /** Primary section for hub / infographic grouping */
  group: SatelliteRegistryGroup;
  /** When a source legitimately spans multiple infographic columns */
  additionalGroups?: SatelliteRegistryGroup[];
  status: SatelliteRegistrySourceStatus;
  bestFor: string[];
  supportsAnomalyTypes: string[];
  confidenceRole: SatelliteRegistryConfidenceRole;
  legalCaution: string;
  sourceType: SatelliteRegistrySourceType;
}

const cautions = {
  screening:
    'Satellite-indicated signals are screening context only — not a final legal, regulatory, or credit determination without independent review.',
  metadata: 'Metadata-only lane — no derived physical inference until products are processed on a configured host.',
  disclosure: 'Company text is a claim record — compare to observations; do not infer intent or guilt.',
  field: 'Field validation is required before operational conclusions.',
  future: 'Planned or future capability — not available as live evidence in this build.',
} as const;

export const SATELLITE_SOURCE_REGISTRY: SatelliteRegistryEntry[] = [
  // Ocean & Water
  {
    id: 'PACE_OCI',
    label: 'NASA PACE (OCI)',
    group: 'ocean_water',
    status: 'partial',
    bestFor: ['Hyperspectral ocean color', 'Phytoplankton community context', 'Coastal water quality context'],
    supportsAnomalyTypes: ['harmful_algal_bloom_risk', 'water_quality_risk', 'plastic_pollution_confidence'],
    confidenceRole: 'primary_signal',
    legalCaution: cautions.screening,
    sourceType: 'satellite',
  },
  {
    id: 'SWOT',
    label: 'NASA / CNES SWOT',
    group: 'ocean_water',
    status: 'planned',
    bestFor: ['Surface water extent context', 'River discharge context when available'],
    supportsAnomalyTypes: ['water_quality_risk', 'flood_extent'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'SENTINEL_2',
    label: 'Sentinel-2 (Copernicus)',
    group: 'ocean_water',
    additionalGroups: ['forests_carbon'],
    status: 'live',
    bestFor: ['Water indices', 'Land cover change context', 'Cross-check for optical screening'],
    supportsAnomalyTypes: ['water_quality_risk', 'vegetation_decline', 'forest_loss'],
    confidenceRole: 'cross_check',
    legalCaution: cautions.screening,
    sourceType: 'satellite',
  },
  {
    id: 'LANDSAT_8_9',
    label: 'Landsat 8/9',
    group: 'ocean_water',
    additionalGroups: ['forests_carbon'],
    status: 'partial',
    bestFor: ['Long baseline optical context', 'EO screening when scenes resolve'],
    supportsAnomalyTypes: ['vegetation_decline', 'forest_loss', 'drought_stress', 'water_quality_risk'],
    confidenceRole: 'cross_check',
    legalCaution: cautions.screening,
    sourceType: 'satellite',
  },
  {
    id: 'NASA_HLS',
    label: 'NASA Harmonized Landsat Sentinel-2',
    group: 'ocean_water',
    additionalGroups: ['forests_carbon'],
    status: 'planned',
    bestFor: ['Consistent optical time series when deployed'],
    supportsAnomalyTypes: ['vegetation_decline', 'forest_loss'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'VIIRS',
    label: 'VIIRS',
    group: 'ocean_water',
    additionalGroups: ['atmosphere_emissions'],
    status: 'partial',
    bestFor: ['Active fire / hotspot context', 'Broad-area monitoring'],
    supportsAnomalyTypes: ['air_pollution_hotspot', 'flood_extent'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.screening,
    sourceType: 'satellite',
  },
  {
    id: 'MODIS',
    label: 'MODIS',
    group: 'ocean_water',
    additionalGroups: ['atmosphere_emissions'],
    status: 'partial',
    bestFor: ['Regional thermal / aerosol context when available'],
    supportsAnomalyTypes: ['heat_stress', 'drought_stress'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.screening,
    sourceType: 'satellite',
  },
  // Forests & Carbon
  {
    id: 'GEDI_LIDAR',
    label: 'NASA GEDI',
    group: 'forests_carbon',
    status: 'metadata_only',
    bestFor: ['Forest structure / canopy context', 'Biomass estimation support (when product lane is live)'],
    supportsAnomalyTypes: ['biomass_decline', 'forest_loss'],
    confidenceRole: 'primary_signal',
    legalCaution: `${cautions.metadata} ${cautions.screening}`,
    sourceType: 'satellite',
  },
  {
    id: 'ESA_BIOMASS',
    label: 'ESA Biomass (planned integration)',
    group: 'forests_carbon',
    status: 'planned',
    bestFor: ['Biomass mapping context when available'],
    supportsAnomalyTypes: ['biomass_decline'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'SENTINEL_1',
    label: 'Sentinel-1 SAR',
    group: 'forests_carbon',
    status: 'planned',
    bestFor: ['Forest change / structure context where SAR is configured'],
    supportsAnomalyTypes: ['forest_loss', 'land_movement'],
    confidenceRole: 'cross_check',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  // Atmosphere & Emissions
  {
    id: 'NASA_EMIT',
    label: 'NASA EMIT',
    group: 'atmosphere_emissions',
    status: 'metadata_only',
    bestFor: ['Hyperspectral surface mineral / dust context', 'Plastic-watch confounder context'],
    supportsAnomalyTypes: ['air_pollution_hotspot', 'plastic_pollution_confidence'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.metadata,
    sourceType: 'satellite',
  },
  {
    id: 'SENTINEL_5P_TROPOMI',
    label: 'Sentinel-5P TROPOMI',
    group: 'atmosphere_emissions',
    status: 'planned',
    bestFor: ['NO₂ / CH₄ column context when operator-configured'],
    supportsAnomalyTypes: ['methane_plume', 'co2_hotspot', 'air_pollution_hotspot'],
    confidenceRole: 'primary_signal',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'OCO_2',
    label: 'OCO-2',
    group: 'atmosphere_emissions',
    status: 'planned',
    bestFor: ['XCO₂ screening context when readable granules are wired'],
    supportsAnomalyTypes: ['co2_hotspot'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'OCO_3',
    label: 'OCO-3',
    group: 'atmosphere_emissions',
    status: 'planned',
    bestFor: ['Snapshot XCO₂ context when wired'],
    supportsAnomalyTypes: ['co2_hotspot'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'GOSAT',
    label: 'GOSAT',
    group: 'atmosphere_emissions',
    status: 'future',
    bestFor: ['Trace-gas context (research integrations)'],
    supportsAnomalyTypes: ['methane_plume', 'co2_hotspot'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'GOSAT_GW',
    label: 'GOSAT-GW',
    group: 'atmosphere_emissions',
    status: 'future',
    bestFor: ['Methane context (research integrations)'],
    supportsAnomalyTypes: ['methane_plume'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'CARBON_MAPPER_TANAGER',
    label: 'Carbon Mapper / Tanager class missions',
    group: 'atmosphere_emissions',
    status: 'future',
    bestFor: ['Facility-scale plume screening when licensed and configured'],
    supportsAnomalyTypes: ['methane_plume', 'co2_hotspot'],
    confidenceRole: 'primary_signal',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'GHGSAT',
    label: 'GHGSat',
    group: 'atmosphere_emissions',
    status: 'future',
    bestFor: ['Commercial methane plume context when contracted'],
    supportsAnomalyTypes: ['methane_plume'],
    confidenceRole: 'primary_signal',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  // Heat, land & future
  {
    id: 'NISAR',
    label: 'NISAR',
    group: 'heat_land_future',
    status: 'future',
    bestFor: ['L-band SAR deformation / change when operational'],
    supportsAnomalyTypes: ['land_movement', 'forest_loss'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'ECOSTRESS',
    label: 'ECOSTRESS',
    group: 'heat_land_future',
    status: 'planned',
    bestFor: ['Evapotranspiration / heat stress context when wired'],
    supportsAnomalyTypes: ['heat_stress', 'drought_stress'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'CHIME_FUTURE',
    label: 'CHIME (future)',
    group: 'heat_land_future',
    status: 'future',
    bestFor: ['Planned hyperspectral research context'],
    supportsAnomalyTypes: ['other'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  {
    id: 'LSTM_FUTURE',
    label: 'Land Surface Temperature Monitoring (future)',
    group: 'heat_land_future',
    status: 'future',
    bestFor: ['Planned thermal continuity context'],
    supportsAnomalyTypes: ['heat_stress'],
    confidenceRole: 'supporting_context',
    legalCaution: cautions.future,
    sourceType: 'satellite',
  },
  // Ground truth / public records
  {
    id: 'COMPANY_DISCLOSURE',
    label: 'Company disclosure',
    group: 'ground_truth_public',
    status: 'metadata_only',
    bestFor: ['Claim text capture', 'Comparison baseline for satellite signals'],
    supportsAnomalyTypes: ['other'],
    confidenceRole: 'disclosure_claim',
    legalCaution: cautions.disclosure,
    sourceType: 'company_disclosure',
  },
  {
    id: 'ESG_REPORT',
    label: 'ESG / sustainability report',
    group: 'ground_truth_public',
    status: 'metadata_only',
    bestFor: ['Voluntary narrative claims', 'Cross-check against facility observations'],
    supportsAnomalyTypes: ['other'],
    confidenceRole: 'disclosure_claim',
    legalCaution: cautions.disclosure,
    sourceType: 'company_disclosure',
  },
  {
    id: 'REGULATORY_FILING',
    label: 'Regulatory filing',
    group: 'ground_truth_public',
    status: 'partial',
    bestFor: ['Permit / compliance text', 'Official record cross-check'],
    supportsAnomalyTypes: ['air_pollution_hotspot', 'hazardous_waste_risk'],
    confidenceRole: 'ground_truth',
    legalCaution: cautions.disclosure,
    sourceType: 'public_record',
  },
  {
    id: 'CARB_DATASET',
    label: 'CARB datasets',
    group: 'ground_truth_public',
    status: 'partial',
    bestFor: ['California air facility context when CARB routes are live on API host'],
    supportsAnomalyTypes: ['air_pollution_hotspot', 'co2_hotspot', 'methane_plume'],
    confidenceRole: 'ground_truth',
    legalCaution: cautions.disclosure,
    sourceType: 'public_record',
  },
  {
    id: 'EPA_DATASET',
    label: 'EPA / Envirofacts family',
    group: 'ground_truth_public',
    status: 'partial',
    bestFor: ['Public environmental record baselines'],
    supportsAnomalyTypes: ['hazardous_waste_risk', 'air_pollution_hotspot', 'water_quality_risk'],
    confidenceRole: 'ground_truth',
    legalCaution: cautions.disclosure,
    sourceType: 'public_record',
  },
  {
    id: 'FIELD_SENSOR',
    label: 'Field sensor network',
    group: 'ground_truth_public',
    status: 'planned',
    bestFor: ['Ground-truth time series when connected'],
    supportsAnomalyTypes: ['water_quality_risk', 'air_pollution_hotspot'],
    confidenceRole: 'ground_truth',
    legalCaution: cautions.field,
    sourceType: 'field_validation',
  },
  {
    id: 'DRONE_SURVEY',
    label: 'Drone survey',
    group: 'ground_truth_public',
    status: 'planned',
    bestFor: ['High-resolution validation flights when integrated'],
    supportsAnomalyTypes: ['plastic_pollution_confidence', 'hazardous_waste_risk'],
    confidenceRole: 'ground_truth',
    legalCaution: cautions.field,
    sourceType: 'field_validation',
  },
  {
    id: 'LAB_SAMPLE',
    label: 'Laboratory sample',
    group: 'ground_truth_public',
    status: 'metadata_only',
    bestFor: ['Definitive chemistry / biology confirmation'],
    supportsAnomalyTypes: ['water_quality_risk', 'harmful_algal_bloom_risk'],
    confidenceRole: 'ground_truth',
    legalCaution: cautions.field,
    sourceType: 'field_validation',
  },
  {
    id: 'COMMUNITY_REPORT',
    label: 'Community report',
    group: 'ground_truth_public',
    status: 'live',
    bestFor: ['Hyperlocal observation leads', 'Validator triage queue'],
    supportsAnomalyTypes: ['flood_extent', 'water_quality_risk', 'other'],
    confidenceRole: 'ground_truth',
    legalCaution: 'Community reports are leads — corroborate with independent sources.',
    sourceType: 'community_evidence',
  },
  {
    id: 'QR_EVIDENCE',
    label: 'QR-linked evidence',
    group: 'ground_truth_public',
    status: 'partial',
    bestFor: ['Traceable field media attachments', 'Chain-of-custody hints'],
    supportsAnomalyTypes: ['other'],
    confidenceRole: 'ground_truth',
    legalCaution: cautions.field,
    sourceType: 'field_validation',
  },
  {
    id: 'WEATHER_DATA',
    label: 'Weather / meteorological context',
    group: 'ground_truth_public',
    status: 'partial',
    bestFor: ['Seasonality / confounder explanation for satellite signals'],
    supportsAnomalyTypes: ['drought_stress', 'heat_stress', 'flood_extent'],
    confidenceRole: 'cross_check',
    legalCaution: 'Weather explains variability — not a substitute for emissions or land claims.',
    sourceType: 'weather_context',
  },
  {
    id: 'RIVER_TIDE_DATA',
    label: 'River / tide gauges',
    group: 'ground_truth_public',
    status: 'planned',
    bestFor: ['Hydrology context for water extent claims'],
    supportsAnomalyTypes: ['flood_extent', 'water_quality_risk'],
    confidenceRole: 'cross_check',
    legalCaution: cautions.field,
    sourceType: 'weather_context',
  },
  {
    id: 'INCIDENT_REPORT',
    label: 'Incident report',
    group: 'ground_truth_public',
    status: 'metadata_only',
    bestFor: ['Formal incident narratives', 'Timeline cross-check'],
    supportsAnomalyTypes: ['hazardous_waste_risk', 'air_pollution_hotspot', 'flood_extent'],
    confidenceRole: 'ground_truth',
    legalCaution: cautions.disclosure,
    sourceType: 'public_record',
  },
];

const GROUP_LABELS: Record<SatelliteRegistryGroup, string> = {
  ocean_water: 'Ocean & Water',
  forests_carbon: 'Forests & Carbon',
  atmosphere_emissions: 'Atmosphere & Emissions',
  heat_land_future: 'Heat, Land & Future Layers',
  ground_truth_public: 'Ground Truth / Public Records',
};

export function getRegistryEntriesForGroup(group: SatelliteRegistryGroup): SatelliteRegistryEntry[] {
  return SATELLITE_SOURCE_REGISTRY.filter(
    (e) => e.group === group || (e.additionalGroups?.includes(group) ?? false),
  );
}

export function getSatelliteRegistryGroupLabel(group: SatelliteRegistryGroup): string {
  return GROUP_LABELS[group] ?? group;
}

export function getSatelliteRegistryEntry(id: string): SatelliteRegistryEntry | undefined {
  return SATELLITE_SOURCE_REGISTRY.find((e) => e.id === id);
}
