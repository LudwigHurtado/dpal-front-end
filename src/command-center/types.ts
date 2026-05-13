/**
 * DPAL Command Center — shared types for multi-mode orchestration.
 * Modes share this contract; individual DPAL module UIs stay unchanged.
 */

export type CommandCenterModuleKey =
  | 'water'
  | 'earthObservation'
  | 'plasticWatch'
  | 'forestIntegrity'
  | 'pollutionAudit'
  | 'carbonViu'
  | 'situationRoom';

/** Per-module lifecycle / readiness (union per product spec). */
export type CommandCenterModuleStatus =
  | 'not_selected'
  | 'queued'
  | 'preview_ready'
  | 'live_ready'
  | 'running'
  | 'success'
  | 'partial'
  | 'pending_adapter'
  | 'rate_limited'
  | 'unavailable'
  | 'error';

export type CommandCenterRunMode = 'dry_run' | 'live';

export type CommandCenterWorkflowMode =
  | 'manual'
  | 'guided'
  | 'watch'
  | 'superAgent'
  | 'evidenceBuilder'
  | 'savedScenarios';

export type GuidedInvestigationType =
  | 'water'
  | 'pollution'
  | 'forest'
  | 'plastic'
  | 'carbon'
  | 'full_environmental';

export type ClaimSafetyLabels = {
  pendingVerification: true;
  humanVerified: false;
  blockchainAnchored: false;
};

export type CommandCenterRunContext = {
  goal: string;
  locationDescription: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  baselineDateIso: string;
  currentDateIso: string;
  /** When true, optional saved-scenario framing (preset titles/notes); backend field name unchanged for compatibility. */
  investorDemoFraming?: boolean;
};

export type ProviderLaneState =
  | 'unknown'
  | 'ok'
  | 'partial'
  | 'preview'
  | 'unavailable'
  | 'rate_limited'
  | 'error'
  | 'pending';

export type ProviderLaneStatus = {
  id: string;
  label: string;
  state: ProviderLaneState;
  detail?: string;
};

export type CommandCenterModuleRunResult = {
  moduleKey: CommandCenterModuleKey;
  status: CommandCenterModuleStatus;
  runMode: CommandCenterRunMode;
  headline: string;
  limitations: string[];
  providerLanes: ProviderLaneStatus[];
  /** Structured refs only — no fabricated live metrics. */
  evidenceRefs: { id: string; label: string; href?: string }[];
  /** Optional workspace deep-link view id (App `View`). */
  openWorkspaceView?: string;
  errorMessage?: string;
};

export type CommandCenterOrchestrationResult = {
  context: CommandCenterRunContext;
  runMode: CommandCenterRunMode;
  modules: CommandCenterModuleKey[];
  settledAtIso: string;
  results: CommandCenterModuleRunResult[];
  /** From Promise.allSettled — failures become partial/unavailable entries. */
  orchestrationWarnings: string[];
};

export type EvidencePacketDraftSectionId =
  | 'location'
  | 'moduleResults'
  | 'evidenceRefs'
  | 'limitations'
  | 'claimSafety'
  | 'humanReview'
  | 'blockchain'
  | 'dronePhoto'
  | 'waterEvidence'
  | 'satelliteEvidence'
  | 'pollutionEvidence';

export type EvidencePacketDraft = {
  id: string;
  title: string;
  createdAtIso: string;
  includedSectionIds: EvidencePacketDraftSectionId[];
  orchestration?: CommandCenterOrchestrationResult;
  claimSafety: ClaimSafetyLabels;
  humanReviewStatus: 'not_requested' | 'pending' | 'unknown';
  blockchainStatus: 'none' | 'unknown';
  exportNote: string;
};

export type SavedScenarioPresetId =
  | 'santa_cruz_floodguard'
  | 'colorado_river_water'
  | 'california_carb'
  | 'forest_afolu'
  | 'coastal_plastic_watch';

export type SavedScenarioPreset = {
  id: SavedScenarioPresetId;
  title: string;
  subtitle: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  defaultModules: CommandCenterModuleKey[];
  limitationNote: string;
};

export type WatchWorkflowStepId =
  | 'location'
  | 'water'
  | 'satellite'
  | 'pollution'
  | 'forest_plastic'
  | 'evidence';
