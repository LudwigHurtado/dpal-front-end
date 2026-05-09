/**
 * DPAL Navigator — public entry points.
 * Import from `src/features/dpalNavigator` rather than reaching into the
 * individual files so the surface stays stable.
 */
export { default as DpalNavigatorProvider } from "./DpalNavigatorProvider";
export { default as DpalNavigatorButton } from "./DpalNavigatorButton";
export { default as DpalNavigatorPanel } from "./DpalNavigatorPanel";
export { default as NavigatorHelperCard } from "./NavigatorHelperCard";
export { default as GuidedStepCard } from "./GuidedStepCard";
export { default as ActionGateWarning } from "./ActionGateWarning";
export { default as SmartTooltip } from "./SmartTooltip";
export { useDpalNavigatorStore } from "./useDpalNavigatorStore";
export { interpretInput, buildGuidedFlow, planFlow, scenarioLabel } from "./guidedFlowEngine";
export { parseCoordinates, extractAddressHint } from "./coordinateParser";
export {
  readNavigatorHelperContext,
  clearNavigatorHelperContext,
} from "./DpalNavigatorPanel";
/** Phase 3 — outcome tracking */
export {
  getActiveNavigatorContext,
  hasActiveNavigatorSession,
  trackNavigatorOutcome,
  getNavigatorOutcomes,
  getLatestNavigatorOutcome,
  clearNavigatorOutcomes,
  OUTCOME_EVENTS_STORAGE_KEY,
  OUTCOME_LATEST_STORAGE_KEY,
} from "./dpalNavigatorOutcomeService";
export { useNavigatorOutcomeTracking } from "./useNavigatorOutcomeTracking";
export type {
  ScenarioType,
  ScenarioDetection,
  CoordinateParseResult,
  NavigatorInterpretation,
  GuidedFlow,
  GuidedStep,
  RecommendedModule,
  SafetyWarning,
  NavigatorHelperContext,
  DpalNavigatorOutcomeEvent,
  OutcomeEventInput,
  OutcomeEventStatus,
  OutcomeSafetyFlags,
} from "./types";
