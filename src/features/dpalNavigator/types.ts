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
