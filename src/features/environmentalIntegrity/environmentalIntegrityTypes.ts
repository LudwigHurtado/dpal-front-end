/**
 * Shared domain types for environmental integrity / partner workspace orchestration.
 * These describe structured records for UI and future API wiring — not live provider payloads.
 */

export type PartnerTenantId = 'carbonpura' | string;

export interface PartnerTenant {
  id: PartnerTenantId;
  displayName: string;
  brandingNote?: string;
}

export type EnvironmentalProjectStatus =
  | 'draft'
  | 'active'
  | 'monitoring'
  | 'review'
  | 'archived';

export interface EnvironmentalProject {
  id: string;
  tenantId: PartnerTenantId;
  name: string;
  status: EnvironmentalProjectStatus;
  summary?: string;
  createdAtIso: string;
  updatedAtIso?: string;
}

/** Reference to a shipped DPAL surface (maps to `VIEW_PATHS` keys in App). */
export type ExistingDpalModuleViewKey =
  | 'waterOperationsEngine'
  | 'aquaScanWater'
  | 'hyperspectralPlasticWatch'
  | 'carbonDMRV'
  | 'forestIntegrity'
  | 'airQualityMonitor'
  | 'hazardousWasteAudit'
  | 'environmentalIntelligenceHub'
  | 'impactHub'
  | 'satelliteAccountability'
  | string;

export interface ExistingDpalModule {
  id: string;
  viewKey: ExistingDpalModuleViewKey;
  label: string;
  routePath: string;
  purpose: string;
  statusLabel: string;
}

export type ModuleCapabilityStatus = 'available' | 'linked' | 'pending_route' | 'preview_only';

export interface ProjectBoundary {
  id: string;
  label: string;
  aoiDescription?: string;
  geohashSample?: string;
  wktOrGeoJsonNote?: string;
}

export interface GeoLedgerAnchor {
  id: string;
  boundaryId: string;
  anchorKind: 'hash_placeholder' | 'fingerprint' | 'record_id';
  valuePreview: string;
  notedAtIso: string;
}

export type MonitoringSourceKind =
  | 'satellite'
  | 'in_situ'
  | 'model'
  | 'registry'
  | 'public_sensor_network'
  | 'other';

export interface MonitoringSource {
  id: string;
  kind: MonitoringSourceKind;
  label: string;
  providerNote?: string;
}

export interface MonitoringEvent {
  id: string;
  projectId: string;
  sourceId: string;
  title: string;
  recordedAtIso: string;
  moduleLinkNote?: string;
}

export interface MeasurementReading {
  id: string;
  parameter: string;
  value: number;
  unit: string;
  observedAtIso: string;
  qualityFlag?: string;
}

export interface SatelliteObservation {
  id: string;
  platformLabel: string;
  productNote?: string;
  acquiredAtIso?: string;
  confidenceNote?: string;
}

export interface CarbonAnalysisRecord {
  id: string;
  projectId: string;
  summaryLine: string;
  statusNote: string;
}

export interface WaterAnalysisRecord {
  id: string;
  projectId: string;
  summaryLine: string;
  statusNote: string;
}

export interface AirAnalysisRecord {
  id: string;
  projectId: string;
  summaryLine: string;
  statusNote: string;
}

export interface PlasticDetectionRecord {
  id: string;
  projectId: string;
  summaryLine: string;
  confidenceLayerNote: string;
}

export interface ForestBiomassRecord {
  id: string;
  projectId: string;
  summaryLine: string;
  indicesNote?: string;
}

export interface MineralGeologyRecord {
  id: string;
  projectId: string;
  summaryLine: string;
  contextNote?: string;
}

export interface HazardousWasteRecord {
  id: string;
  projectId: string;
  summaryLine: string;
  facilityContextNote?: string;
}

export type DoubleCountingSeverity = 'info' | 'watch' | 'elevated';

export interface DoubleCountingAlert {
  id: string;
  projectId: string;
  title: string;
  detail: string;
  severity: DoubleCountingSeverity;
}

export type PolicyLabel = 'voluntary_market' | 'compliance_corsia' | 'article6_host' | 'internal_esg' | string;

export interface Article6ReadinessRecord {
  id: string;
  projectId: string;
  headline: string;
  detail: string;
  readinessBand: 'preparation' | 'documentation' | 'external_gate';
}

export interface RegistryExportRecord {
  id: string;
  projectId: string;
  format: 'json' | 'api' | 'csv' | 'pdf_placeholder';
  statusNote: string;
}

/**
 * Workspace-level evidence packet descriptor (orchestration model — not a live vault record).
 * Named for partner workspace contracts; avoid importing alongside other `EvidencePacket` types in one file.
 */
export interface EvidencePacket {
  id: string;
  projectId: string;
  title: string;
  constituentModuleNotes: string[];
  hashPreview?: string;
}

export interface ValidatorReview {
  id: string;
  projectId: string;
  statusLabel: string;
  summaryLine: string;
  updatedAtIso: string;
}

/** Row in the partner command center “live vs pending” provider matrix. */
export type LiveProviderStatus =
  | 'live_ok'
  | 'live_degraded'
  | 'provider_unavailable'
  | 'connection_pending'
  | 'preview_only';

export interface LiveRouteCheck {
  id: string;
  label: string;
  path: string;
  /** When true, the route is registered in `VIEW_PATHS` for this SPA build. */
  mappedInAppRoutes: boolean;
}

/** Cross-module attachment / handoff state for CarbonPura orchestration. */
export type CarbonPuraAttachmentStatus =
  | 'live_route'
  | 'context_query_ready'
  | 'target_module_pending'
  | 'aggregation_pending'
  | 'provider_unavailable'
  | 'preview_only';

/**
 * Lifecycle status for a monitoring/data source in the CarbonPura provider matrix.
 * Always pair with `reason` — do not show status alone.
 */
export type ProviderSourceLifecycleStatus =
  | 'live'
  | 'partial'
  | 'metadata_only'
  | 'planned'
  | 'future'
  | 'unavailable';

/** One row in the CarbonPura provider / source status matrix. */
export interface ProviderSourceStatusEntry {
  id: string;
  sourceName: string;
  category: string;
  status: ProviderSourceLifecycleStatus;
  reason: string;
  currentCapability: string;
  missingForFullLive: string;
  relatedModule: string;
  route?: string;
  providerNotes?: string;
  confidenceUse: string;
  checkedAtIso?: string;
  /** NASA PACE / official product suite code when applicable (e.g. OC_AOP, OC_IOP). */
  productSuiteCode?: string;
  /** PACE OCI, HARP2, SPEXone, etc. */
  instrument?: string;
  /** Known operational maturity for this suite in DPAL (not a NASA maturity claim). */
  maturityLevel?: string;
  /** QC flags operators should apply before strong claims. */
  qualityFlagsRequired?: string;
  /** How this suite may appear in evidence / workflow copy. */
  evidenceUse?: string;
  /** Matrix grouping key for UI sections. */
  matrixGroup?: 'pace' | 'infrastructure' | 'other';
  /** Recommended SPA path for live engine launch (context routing). */
  recommendedRoute?: string;
  /** App view key when launching via in-app navigation. */
  recommendedView?: string;
  recommendedModuleLabel?: string;
  launchPurpose?: string;
  evidenceRole?: PaceSuiteEvidenceRole;
  sourceSuiteCode?: string;
  /** One-line product-aware availability (e.g. “available for reflectance screening”). */
  availabilitySummary?: string;
  processingLevel?: string;
  domain?: string;
  carbonPuraUse?: string;
  uncertaintyAvailable?: boolean;
  /** NASA PACE collection/processing generation tracked for evidence (e.g. V3.1). */
  paceDataVersion?: string;
  lastRetrievalDate?: string;
}

export type PaceSuiteEvidenceRole =
  | 'confidence layer'
  | 'quality control layer'
  | 'carbon/ecosystem context'
  | 'confounder reduction'
  | 'validator support';

/**
 * Canonical PACE product-suite record for CarbonPura / DPAL evidence-ready tracking.
 * Feeds the provider matrix via `toProviderSourceStatusEntry`.
 */
export interface PaceProductSuiteStatus {
  suiteCode: string;
  suiteName: string;
  instrument: string;
  processingLevel: string;
  maturityLevel: string;
  domain: string;
  status: ProviderSourceLifecycleStatus;
  reason: string;
  currentCapability: string;
  carbonPuraUse: string;
  qualityFlagsRequired: string;
  uncertaintyAvailable: boolean;
  missingForFullLive: string;
  relatedModule: string;
  route?: string;
  recommendedRoute: string;
  recommendedView: string;
  recommendedModuleLabel: string;
  launchPurpose: string;
  evidenceRole: PaceSuiteEvidenceRole;
  evidenceUse: string;
  confidenceUse: string;
  availabilitySummary: string;
  providerNotes?: string;
  lastRetrievalDate?: string;
  paceDataVersion?: string;
}
