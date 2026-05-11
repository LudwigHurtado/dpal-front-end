/**
 * DPAL Navigator — types
 * ----------------------------------------------------------------------------
 * Shared type contracts for the floating guided-intelligence layer that helps
 * a real user move from a free-form description ("flooding here") into the
 * correct DPAL workflow (scan, evidence packet, module health review, human
 * approval gate).
 *
 * The Navigator never auto-publishes, auto-anchors, or auto-verifies anything.
 * Every recommendation is *advisory* and surfaces a clear human-approval gate.
 */

/** Categories DPAL knows how to route a real-world user concern to. */
export type ScenarioType =
  | "water_flood"
  | "pollution_waste"
  | "carbon_land"
  | "public_report"
  | "locator"
  | "transport_help"
  | "unknown";

/** Result of parsing free-form text for latitude / longitude. */
export interface CoordinateParseResult {
  hasCoordinates: boolean;
  lat: number | null;
  lng: number | null;
  /** Raw substring that triggered the match, if any (useful for debugging). */
  matchedText?: string;
  /** Reason the parse failed (out of range, malformed, etc.). Optional. */
  error?: string;
}

/** Output of the rule-based scenario classifier. */
export interface ScenarioDetection {
  scenarioType: ScenarioType;
  /** 0..1 — rule-based confidence based on keyword density / coord presence. */
  confidence: number;
  /** Keywords that triggered the match (for transparency in the UI). */
  matchedKeywords: string[];
}

/** Combined parse + classify result the panel displays before action. */
export interface NavigatorInterpretation {
  rawInput: string;
  coordinates: CoordinateParseResult;
  scenario: ScenarioDetection;
  /** Address-like substring detected in the input (best-effort, no geocoding). */
  addressHint?: string;
}

/** The DPAL module a guided flow recommends. */
export interface RecommendedModule {
  id: string;
  label: string;
  description: string;
  /** Stable in-app route. May be `null` when the module has no canonical URL. */
  routeTarget: string | null;
}

/** Single step in the guided checklist shown in the panel + helper card. */
export interface GuidedStep {
  id: string;
  title: string;
  helperText?: string;
  /**
   * Visual emphasis. `recommended` triggers the subtle blinking outline so the
   * user can see what to do next without being overwhelmed.
   */
  emphasis?: "recommended" | "info" | "warning";
}

/** Safety-gate copy displayed before any action that could have public impact. */
export interface SafetyWarning {
  id: string;
  message: string;
  /** Use `block` when the action must not happen automatically. */
  level: "block" | "advise";
}

/** Final guided-flow contract returned by the engine. */
export interface GuidedFlow {
  scenarioType: ScenarioType;
  /** 0..1 confidence carried over from the interpreter. */
  confidence: number;
  title: string;
  explanation: string;
  recommendedModule: RecommendedModule;
  /** Convenience copy of `recommendedModule.routeTarget` for callers. */
  routeTarget: string | null;
  nextBestAction: string;
  steps: GuidedStep[];
  safetyWarnings: SafetyWarning[];
  /** Query params the Navigator will append when routing into the module. */
  queryParams: Record<string, string>;
  /**
   * Alternate modules a user can also try (shown as quiet links, never as the
   * primary CTA). Keeps the UX honest when classification confidence is low.
   */
  alternateModules?: RecommendedModule[];
}

/** Optional helper-card payload surfaced once the user lands inside a module. */
export interface NavigatorHelperContext {
  scenarioType: ScenarioType;
  flowId: string;
  startedAt: string;
  recommendedModule: RecommendedModule;
  steps: GuidedStep[];
  safetyWarnings: SafetyWarning[];
  coordinates?: { lat: number; lng: number };
  rawInput: string;
}

/* -------------------------------------------------------------------------- */
/* Outcome tracking — Phase 3                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Status of a single workflow milestone observed inside a target module.
 *
 * These are intentionally weak / honest words. They never imply the user's
 * action was published, anchored, verified, certified, paid, or filed.
 */
export type OutcomeEventStatus =
  | "observed"
  | "started"
  | "draft_created"
  | "completed"
  | "blocked"
  | "review_required";

/**
 * Safety flags attached to every outcome event. The defaults are explicit and
 * inverted — `autoPublished: false` etc. — so a downstream consumer cannot
 * accidentally treat an outcome event as a public claim.
 */
export interface OutcomeSafetyFlags {
  autoPublished: false;
  autoVerified: false;
  autoAnchored: false;
  /** Set true when the milestone *requires* validator/human review next. */
  requiresHumanReview?: boolean;
}

/**
 * A single workflow milestone observed inside a DPAL module after the user
 * arrived from the Navigator. Stored locally only (sessionStorage) — never
 * uploaded, anchored, or treated as official record by Phase 3.
 */
export interface DpalNavigatorOutcomeEvent {
  id: string;
  /** Active Navigator flow id (mirrors `NavigatorHelperContext.flowId`). */
  sessionId: string;
  scenario: ScenarioType;
  moduleId: string;
  eventType: string;
  label: string;
  status: OutcomeEventStatus;
  createdAt: string;
  route?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
  /** Free-form, non-PII module metadata (e.g. tab id, draft id). */
  metadata?: Record<string, unknown>;
  safetyFlags: OutcomeSafetyFlags;
}

/**
 * Input shape callers pass to `trackNavigatorOutcome`. The service fills in
 * `id`, `sessionId`, `scenario`, `createdAt`, and the safety-flag defaults.
 */
export interface OutcomeEventInput {
  moduleId: string;
  eventType: string;
  label: string;
  status?: OutcomeEventStatus;
  route?: string;
  coordinates?: { lat?: number; lng?: number };
  metadata?: Record<string, unknown>;
  /** Override only when the milestone *requires* human review next. */
  requiresHumanReview?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Visible Autopilot — Phase 4                                                */
/* -------------------------------------------------------------------------- */

/**
 * Autopilot intents are the *only* actions a step can ask the dashboard to
 * perform. Anything not in this list is intentionally not allowed —
 * publication, anchoring, certification, payments, or alerts must never be
 * possible from the autopilot.
 */
export type AutopilotIntent =
  | "highlight"
  | "fill_coordinates"
  | "trigger_scan"
  | "wait_for_scan"
  | "show_progress"
  | "show_packet_status"
  | "human_approval_gate";

/**
 * One visible step in an autopilot sequence. Steps are scripted ahead of time
 * (`autopilotSteps.ts`) so the user can see exactly what DPAL will and will
 * not do before pressing "Watch DPAL Run Safe Checks".
 */
export interface AutopilotStep {
  id: string;
  intent: AutopilotIntent;
  /** Plain-language explanation shown above the cursor and in the control bar. */
  bubble: string;
  /**
   * CSS selector for the element to spotlight + move the virtual cursor to.
   * Prefer `[data-dpal-target="..."]` selectors for stability.
   */
  targetSelector?: string;
  /**
   * How long to dwell on this step before advancing. `wait_for_scan` ignores
   * this and waits for `markScanComplete(...)` instead.
   */
  dwellMs?: number;
  /** Optional list of provider names for `show_progress` steps. */
  progressItems?: string[];
}

/** Top-level autopilot state machine status. */
export type AutopilotStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "aborted";

/**
 * Per-provider progress used by `show_progress` and `show_packet_status` steps.
 *
 * Mirrors the backend `moduleHealth.*` value set produced by Global Provider Routing.
 * Importantly, "not_applicable", "not_configured", and "needs_key" are **honest skip**
 * outcomes — they MUST NOT be rendered as a check that happened (would imply observation
 * the user didn't actually get), and they MUST NOT be rendered as a failure (would imply
 * something went wrong when nothing did).
 */
export type ProviderProgressStatus =
  /** UI states the autopilot owns while a sequence is in flight. */
  | "pending"
  | "checking"
  /** Provider ran and returned a usable live result. */
  | "observed"
  /** Provider returned a cached result (e.g. FloodGuard cache hit). */
  | "cached"
  /** Provider returned a stale cached result while live fetch is in cooldown. */
  | "stale_fallback"
  /** Provider was reachable but produced no usable data for this coordinate. */
  | "unavailable"
  /** Provider call failed (network, 5xx, parse, etc.). */
  | "error"
  /** Provider intentionally skipped because it does not apply to this region. */
  | "not_applicable"
  /** Provider intentionally skipped because it is not configured on this server. */
  | "not_configured"
  /** Provider intentionally skipped because it requires an API key that is not set. */
  | "needs_key";

/** Final packet status the dashboard reports back to the autopilot. */
export type AutopilotPacketStatus = "ok" | "degraded" | "error" | null;
