/**
 * DPAL central source registry — shared types for satellites, public records,
 * ground truth, and commercial partners (Phase 3).
 */

export type SourceStatus =
  | 'live'
  | 'public_record'
  | 'commercial'
  | 'partner_required'
  | 'future'
  | 'historical'
  | 'not_configured'
  | 'unavailable';

export type SourceCategory =
  | 'ocean_water'
  | 'forest_carbon'
  | 'atmosphere_emissions'
  | 'heat_land'
  | 'ground_truth_public_records'
  | 'commercial_partner'
  | 'future_mission';

/** How the source is delivered or licensed. */
export type DpalProviderType =
  | 'satellite_mission'
  | 'satellite_instrument'
  | 'public_agency_dataset'
  | 'commercial_imagery'
  | 'ground_observation'
  | 'crowdsourced_or_operational'
  | 'future_mission'
  | 'derived_product';

/** High-level signals this source can support (screening / context, not proof of liability). */
export type DpalSignalHint =
  | 'ocean_color'
  | 'chlorophyll'
  | 'habs'
  | 'plastic_debris_proxy'
  | 'water_surface_height'
  | 'wet_extent'
  | 'ndvi'
  | 'ndwi'
  | 'sar_flood'
  | 'sar_deformation'
  | 'thermal_stress'
  | 'biomass_height'
  | 'forest_loss'
  | 'active_fire'
  | 'methane_column'
  | 'co2_column'
  | 'co2_total_column'
  | 'no2_so2'
  | 'dust_mineral_proxy'
  | 'air_quality_geostationary'
  | 'gravity_water_storage'
  | 'biomass_map'
  | 'soil_moisture'
  | 'land_cover_change'
  | 'facility_emissions_reported'
  | 'regulatory_disclosure'
  | 'corporate_disclosure'
  | 'field_measurement'
  | 'vessel_tracking'
  | 'weather_context'
  | 'hydrology_gauge';

export type DpalClaimType =
  | 'human_verified'
  | 'blockchain_anchored'
  | 'carbon_credit_issuance'
  | 'viu_eligibility'
  | 'registry_approval'
  | 'legal_enforcement'
  | 'regulatory_guilt'
  /** Non-certification analytic support */
  | 'screening_support'
  | 'evidence_lead';

export interface DpalSource {
  readonly sourceId: string;
  readonly name: string;
  readonly category: SourceCategory;
  readonly status: SourceStatus;
  readonly providerType: DpalProviderType;
  /** Screening-relevant signal families (not certification). */
  readonly signals: readonly DpalSignalHint[];
  readonly resolutionNote: string;
  readonly temporalNote: string;
  readonly requiredInputs: readonly string[];
  readonly businessUseCases: readonly string[];
  readonly evidenceRole: string;
  readonly confidenceRole: string;
  readonly limitations: readonly string[];
  /** Keys into global safety rules (see sourceSafetyRules). */
  readonly safetyRules: readonly string[];
  readonly docsUrl?: string;
  /** Optional live API hint for UI (not a runtime probe). */
  readonly apiStatus?: string;
}

export type DpalBusinessUseCaseId = (typeof DPAL_BUSINESS_USE_CASE_IDS)[number];

/** Stable ids for business routing (must match businessUseCaseMap). */
export const DPAL_BUSINESS_USE_CASE_IDS = [
  'carbon_credit_integrity',
  'corporate_greenwashing_review',
  'methane_super_emitter_monitoring',
  'co2_facility_verification',
  'harmful_algal_bloom_watch',
  'plastic_pollution_watch',
  'blue_carbon_mrv',
  'forest_carbon_deforestation_audit',
  'illegal_mining_land_disturbance',
  'water_pollution_evidence',
  'flood_risk_damage_intelligence',
  'wildfire_illegal_burn_monitoring',
  'urban_heat_environmental_justice',
  'industrial_air_pollution_watch',
  'port_shipping_pollution',
  'agriculture_carbon_water_efficiency',
  'drought_groundwater_risk',
  'biodiversity_habitat_integrity',
  'infrastructure_subsidence_monitoring',
  'dam_reservoir_river_integrity',
  'insurance_environmental_risk',
  'real_estate_land_due_diligence',
  'hazardous_waste_integrity_audit',
  'supplier_environmental_watch',
  'government_transparency_dashboard',
  'community_environmental_reporting',
  'environmental_litigation_support',
  'investor_climate_risk_intelligence',
  'municipal_climate_resilience',
  'dpal_verified_impact_units',
] as const;

export interface DpalBusinessUseCase {
  readonly id: DpalBusinessUseCaseId;
  readonly name: string;
  readonly description: string;
  readonly primaryClients: readonly string[];
  readonly requiredSources: readonly string[];
  readonly optionalSources: readonly string[];
  readonly outputProducts: readonly string[];
  readonly safetyLanguage: string;
  readonly validationRequired: boolean;
}

export type SourceCapabilityKey =
  | 'ocean_color'
  | 'water_surface_topo'
  | 'optical_vegetation_water'
  | 'thermal_land_stress'
  | 'sar_surface'
  | 'lidar_biomass_height'
  | 'biomass_map'
  | 'active_fire'
  | 'trace_gases'
  | 'co2_total_column'
  | 'methane_plume_screening'
  | 'dust_mineral_hyperspectral'
  | 'gravity_hydrology'
  | 'soil_moisture'
  | 'land_cover_dynamic'
  | 'public_emissions_facility'
  | 'corporate_disclosure'
  | 'field_lab_ground_truth'
  | 'maritime_tracking'
  | 'weather_hydro_context';
