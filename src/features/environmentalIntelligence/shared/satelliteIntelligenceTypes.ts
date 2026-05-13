/**
 * Shared satellite intelligence model for PACE bio-ocean context, GEDI forest structure /
 * biomass support, and cross-module evidence summaries. Types are descriptive only — they
 * do not imply live NASA product ingestion unless paired with provider status at runtime.
 */

export enum SatelliteProvider {
  PACE_OCI = 'PACE_OCI',
  GEDI_LIDAR = 'GEDI_LIDAR',
  VIIRS = 'VIIRS',
  MODIS = 'MODIS',
  SENTINEL_2 = 'SENTINEL_2',
  LANDSAT_8_9 = 'LANDSAT_8_9',
  NASA_GIBS = 'NASA_GIBS',
  NASA_HLS = 'NASA_HLS',
  COPERNICUS = 'COPERNICUS',
  NASA_CMR = 'NASA_CMR',
  LP_DAAC = 'LP_DAAC',
  FIELD_VALIDATION = 'FIELD_VALIDATION',
  USER_REPORT = 'USER_REPORT',
  UNKNOWN = 'UNKNOWN',
}

export enum SatelliteSignalCategory {
  ocean_color = 'ocean_color',
  phytoplankton = 'phytoplankton',
  harmful_algal_bloom_risk = 'harmful_algal_bloom_risk',
  coastal_water_quality = 'coastal_water_quality',
  aerosol_ocean_interaction = 'aerosol_ocean_interaction',
  plastic_confidence_filter = 'plastic_confidence_filter',
  forest_canopy_height = 'forest_canopy_height',
  forest_structure = 'forest_structure',
  biomass_estimation = 'biomass_estimation',
  carbon_mrv = 'carbon_mrv',
  habitat_biodiversity = 'habitat_biodiversity',
  pollution_risk = 'pollution_risk',
  evidence_packet = 'evidence_packet',
  metadata_only = 'metadata_only',
  unknown = 'unknown',
}

export enum SatelliteProviderStatus {
  live_provider_connected = 'live_provider_connected',
  provider_not_configured = 'provider_not_configured',
  metadata_only = 'metadata_only',
  preview_only = 'preview_only',
  unavailable = 'unavailable',
  rate_limited = 'rate_limited',
  no_scene_found = 'no_scene_found',
  error = 'error',
}

export enum SatelliteConfidenceLevel {
  live_provider_confirmed = 'live_provider_confirmed',
  satellite_indicated = 'satellite_indicated',
  multi_source_supported = 'multi_source_supported',
  metadata_only = 'metadata_only',
  low_confidence = 'low_confidence',
  preview_only = 'preview_only',
  unavailable = 'unavailable',
  requires_field_validation = 'requires_field_validation',
}

export enum SatelliteEvidenceReadiness {
  evidence_packet_ready = 'evidence_packet_ready',
  evidence_packet_shell = 'evidence_packet_shell',
  needs_cross_dataset_comparison = 'needs_cross_dataset_comparison',
  needs_field_validation = 'needs_field_validation',
  needs_validator_review = 'needs_validator_review',
  preview_only = 'preview_only',
  unavailable = 'unavailable',
}

export interface AOIInput {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  aoiGeoJson?: unknown;
  label?: string;
  crs?: string;
}

export interface TimeRangeInput {
  baselineDate?: string;
  currentDate?: string;
  startDate?: string;
  endDate?: string;
  quickPreset?: string;
}

export interface SatelliteLaneSummary {
  laneId: string;
  provider: SatelliteProvider;
  providerLabel: string;
  productShortName?: string;
  cmrConceptId?: string;
  category: SatelliteSignalCategory;
  providerStatus: SatelliteProviderStatus;
  confidenceLevel: SatelliteConfidenceLevel;
  evidenceReadiness: SatelliteEvidenceReadiness;
  requiresFieldValidation: boolean;
  previewOnly: boolean;
  sourceSummary: string;
  limitations: string[];
  warnings: string[];
  queriedAt?: string;
  datasetVersion?: string;
}

/** PACE OCI: hyperspectral ocean color and biogeochemical context — not animal detection. */
export interface PACEBioOceanSignal {
  provider: SatelliteProvider.PACE_OCI;
  signalCategory: SatelliteSignalCategory;
  phytoplanktonSignal?: string;
  harmfulAlgalBloomRisk?: string;
  coastalWaterQualitySignal?: string;
  aerosolOceanInteractionSignal?: string;
  plasticConfidenceContext?: string;
  blueCarbonMRVSupport?: string;
  confidenceLevel: SatelliteConfidenceLevel;
  evidenceReadiness: SatelliteEvidenceReadiness;
  requiresFieldValidation: boolean;
  previewOnly: boolean;
  limitations: string[];
}

/** GEDI: lidar forest structure / biomass / MRV support — not sole carbon-credit verification. */
export interface GEDIForestStructureSignal {
  provider: SatelliteProvider.GEDI_LIDAR;
  canopyHeightSignal?: string;
  forestStructureSignal?: string;
  biomassEstimationSupport?: string;
  carbonMRVSupport?: string;
  habitatBiodiversitySupport?: string;
  confidenceLevel: SatelliteConfidenceLevel;
  evidenceReadiness: SatelliteEvidenceReadiness;
  requiresFieldValidation: boolean;
  previewOnly: boolean;
  limitations: string[];
}

export interface SatelliteEvidencePacketSummary {
  title: string;
  aoi: AOIInput;
  timeRange: TimeRangeInput;
  lanes: SatelliteLaneSummary[];
  overallConfidence: SatelliteConfidenceLevel;
  evidenceReadiness: SatelliteEvidenceReadiness;
  recommendedActions: string[];
  blockchainReady?: boolean;
  qrReady?: boolean;
  disclaimer: string;
}

export interface SatelliteComparisonSignal {
  baseline?: SatelliteLaneSummary;
  current?: SatelliteLaneSummary;
  changeSummary?: string;
  confidenceLevel: SatelliteConfidenceLevel;
  limitations: string[];
  recommendedActions: string[];
}

export type SatellitePreviewOrValidationCarrier =
  | SatelliteLaneSummary
  | PACEBioOceanSignal
  | GEDIForestStructureSignal;

const CONFIDENCE_LABELS: Record<SatelliteConfidenceLevel, string> = {
  [SatelliteConfidenceLevel.live_provider_confirmed]: 'Live provider confirmed',
  [SatelliteConfidenceLevel.satellite_indicated]: 'Satellite-indicated',
  [SatelliteConfidenceLevel.multi_source_supported]: 'Multi-source supported',
  [SatelliteConfidenceLevel.metadata_only]: 'Metadata-only',
  [SatelliteConfidenceLevel.low_confidence]: 'Low confidence',
  [SatelliteConfidenceLevel.preview_only]: 'Preview-only',
  [SatelliteConfidenceLevel.unavailable]: 'Unavailable',
  [SatelliteConfidenceLevel.requires_field_validation]: 'Requires field validation',
};

/** Neutral Tailwind badge shells (background + text); pair with `rounded-md px-2 py-0.5 text-xs font-medium`. */
const CONFIDENCE_BADGE_CLASSES: Record<SatelliteConfidenceLevel, string> = {
  [SatelliteConfidenceLevel.live_provider_confirmed]: 'bg-slate-200 text-slate-900',
  [SatelliteConfidenceLevel.satellite_indicated]: 'bg-slate-200 text-slate-800',
  [SatelliteConfidenceLevel.multi_source_supported]: 'bg-slate-200 text-slate-800',
  [SatelliteConfidenceLevel.metadata_only]: 'bg-slate-100 text-slate-700',
  [SatelliteConfidenceLevel.low_confidence]: 'bg-slate-100 text-slate-600',
  [SatelliteConfidenceLevel.preview_only]: 'bg-slate-100 text-slate-600',
  [SatelliteConfidenceLevel.unavailable]: 'bg-slate-100 text-slate-500',
  [SatelliteConfidenceLevel.requires_field_validation]: 'bg-slate-200 text-slate-800',
};

const PROVIDER_LABELS: Record<SatelliteProvider, string> = {
  [SatelliteProvider.PACE_OCI]: 'NASA PACE (OCI)',
  [SatelliteProvider.GEDI_LIDAR]: 'NASA GEDI (lidar)',
  [SatelliteProvider.VIIRS]: 'VIIRS',
  [SatelliteProvider.MODIS]: 'MODIS',
  [SatelliteProvider.SENTINEL_2]: 'Sentinel-2',
  [SatelliteProvider.LANDSAT_8_9]: 'Landsat 8/9',
  [SatelliteProvider.NASA_GIBS]: 'NASA GIBS',
  [SatelliteProvider.NASA_HLS]: 'NASA HLS',
  [SatelliteProvider.COPERNICUS]: 'Copernicus',
  [SatelliteProvider.NASA_CMR]: 'NASA CMR',
  [SatelliteProvider.LP_DAAC]: 'LP DAAC',
  [SatelliteProvider.FIELD_VALIDATION]: 'Field validation',
  [SatelliteProvider.USER_REPORT]: 'User report',
  [SatelliteProvider.UNKNOWN]: 'Unknown provider',
};

const PROVIDER_STATUS_LABELS: Record<SatelliteProviderStatus, string> = {
  [SatelliteProviderStatus.live_provider_connected]: 'Live provider connected',
  [SatelliteProviderStatus.provider_not_configured]: 'Provider not configured',
  [SatelliteProviderStatus.metadata_only]: 'Metadata-only',
  [SatelliteProviderStatus.preview_only]: 'Preview-only',
  [SatelliteProviderStatus.unavailable]: 'Unavailable',
  [SatelliteProviderStatus.rate_limited]: 'Rate limited',
  [SatelliteProviderStatus.no_scene_found]: 'No scene found',
  [SatelliteProviderStatus.error]: 'Error',
};

const EVIDENCE_READINESS_LABELS: Record<SatelliteEvidenceReadiness, string> = {
  [SatelliteEvidenceReadiness.evidence_packet_ready]: 'Evidence packet ready',
  [SatelliteEvidenceReadiness.evidence_packet_shell]: 'Evidence packet shell',
  [SatelliteEvidenceReadiness.needs_cross_dataset_comparison]: 'Needs cross-dataset comparison',
  [SatelliteEvidenceReadiness.needs_field_validation]: 'Needs field validation',
  [SatelliteEvidenceReadiness.needs_validator_review]: 'Needs validator review',
  [SatelliteEvidenceReadiness.preview_only]: 'Preview-only',
  [SatelliteEvidenceReadiness.unavailable]: 'Unavailable',
};

export function getConfidenceLabel(confidence: SatelliteConfidenceLevel): string {
  return CONFIDENCE_LABELS[confidence] ?? confidence;
}

export function getConfidenceBadgeClass(confidence: SatelliteConfidenceLevel): string {
  return CONFIDENCE_BADGE_CLASSES[confidence] ?? 'bg-slate-100 text-slate-600';
}

export function getProviderLabel(provider: SatelliteProvider): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function getProviderStatusLabel(status: SatelliteProviderStatus): string {
  return PROVIDER_STATUS_LABELS[status] ?? status;
}

export function getEvidenceReadinessLabel(readiness: SatelliteEvidenceReadiness): string {
  return EVIDENCE_READINESS_LABELS[readiness] ?? readiness;
}

export function requiresFieldValidation(signalOrLane: SatellitePreviewOrValidationCarrier): boolean {
  return Boolean(signalOrLane.requiresFieldValidation);
}

export function isPreviewOnlySignal(signalOrLane: SatellitePreviewOrValidationCarrier): boolean {
  return Boolean(signalOrLane.previewOnly);
}

/**
 * Human-readable disclaimer from evidence packet readiness and confidence.
 * Emphasizes satellite-indicated vs metadata-only, MRV support (not credit issuance), and field validation.
 */
export function buildSatelliteDisclaimer(
  readiness: SatelliteEvidenceReadiness,
  confidence: SatelliteConfidenceLevel,
): string {
  const readinessLabel = getEvidenceReadinessLabel(readiness).toLowerCase();
  const confidenceLabel = getConfidenceLabel(confidence).toLowerCase();

  const paceNote =
    'Where NASA PACE (OCI) is referenced, signals describe hyperspectral ocean color, phytoplankton community context, harmful algal bloom risk context, aerosols/clouds/ocean-atmosphere context, coastal water quality, and biogeochemical indicators — not detection of individual animals.';
  const gediNote =
    'Where NASA GEDI is referenced, signals describe lidar-based forest structure, canopy height, biomass estimation support, vegetation structure, carbon-cycle and MRV support, and habitat/biodiversity context — GEDI alone does not verify carbon credits.';
  const core =
    `This summary is ${confidenceLabel} with evidence packet readiness described as ${readinessLabel}. Satellite-indicated findings are screening context; metadata-only lanes carry no derived physical inference. MRV support does not replace independent verification, laboratory or field sampling, or regulatory determinations.`;

  if (
    readiness === SatelliteEvidenceReadiness.preview_only ||
    confidence === SatelliteConfidenceLevel.preview_only
  ) {
    return `${core} Preview-only content is not operational live NASA product output. ${paceNote} ${gediNote}`;
  }
  if (
    confidence === SatelliteConfidenceLevel.metadata_only ||
    readiness === SatelliteEvidenceReadiness.evidence_packet_shell
  ) {
    return `${core} Metadata-only or shell packets require cross-dataset comparison and field validation before claims. ${paceNote} ${gediNote}`;
  }
  if (
    readiness === SatelliteEvidenceReadiness.needs_field_validation ||
    confidence === SatelliteConfidenceLevel.requires_field_validation
  ) {
    return `${core} Field validation is required before operational or legal use. ${paceNote} ${gediNote}`;
  }
  return `${core} ${paceNote} ${gediNote}`;
}
