/**
 * Command Center run engine — types shared by routes and execution.
 * Mirrors the SPA `CommandCenterModuleRunResult` contract for `results[]`.
 */

export type CommandCenterModuleKey =
  | 'water'
  | 'earthObservation'
  | 'plasticWatch'
  | 'forestIntegrity'
  | 'pollutionAudit'
  | 'carbonViu'
  | 'situationRoom';

export type CommandCenterRunMode = 'dry_run' | 'live';

/** Overall run lifecycle (engine + API). */
export type CommandCenterRunStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'partial'
  | 'rate_limited'
  | 'unavailable'
  | 'error'
  | 'pending_adapter'
  | 'canceled';

export type CommandCenterModuleStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'partial'
  | 'rate_limited'
  | 'unavailable'
  | 'error'
  | 'pending_adapter'
  | 'preview_ready';

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
  evidenceRefs: { id: string; label: string; href?: string }[];
  openWorkspaceView?: string;
  errorMessage?: string;
};

export type CommandCenterRunContext = {
  goal: string;
  locationDescription: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  baselineDateIso: string;
  currentDateIso: string;
  investorDemoFraming?: boolean;
};

export type CommandCenterSafetyLabels = {
  pending_verification: true;
  human_verified: false;
  blockchain_anchored: false;
};

export type CommandCenterRunDocument = {
  runId: string;
  status: CommandCenterRunStatus;
  runMode: CommandCenterRunMode;
  modules: CommandCenterModuleKey[];
  context: CommandCenterRunContext;
  /** Human-readable step id, e.g. module key or `validate` | `finalize`. */
  currentStep: string;
  results: CommandCenterModuleRunResult[];
  warnings: string[];
  safetyLabels: CommandCenterSafetyLabels;
  createdAtIso: string;
  updatedAtIso: string;
  cancelRequested: boolean;
};

export const COMMAND_CENTER_SAFETY_LABELS: CommandCenterSafetyLabels = {
  pending_verification: true,
  human_verified: false,
  blockchain_anchored: false,
};
