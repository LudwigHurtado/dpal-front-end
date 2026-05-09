/**
 * useNavigatorOutcomeTracking — module-side hook for Phase 3.
 * --------------------------------------------------------------------------
 * A target module mounts this hook to:
 *   - know whether the user arrived from an active Navigator session,
 *   - read the active context (scenario, coordinates, flowId, etc.),
 *   - and call `trackOutcome(...)` to record safe milestones.
 *
 * The hook is a thin wrapper around `dpalNavigatorOutcomeService` plus an
 * `expectedScenario` gate so a module never records events for the wrong
 * scenario, and a per-module dedup ref so `trackOutcomeOnce(...)` is safe to
 * call from `useEffect` deps without spamming storage.
 */
import React from "react";
import {
  getActiveNavigatorContext,
  getNavigatorOutcomes,
  trackNavigatorOutcome,
} from "./dpalNavigatorOutcomeService";
import type {
  DpalNavigatorOutcomeEvent,
  NavigatorHelperContext,
  OutcomeEventInput,
  ScenarioType,
} from "./types";

interface UseOutcomeTrackingResult {
  /** Live Navigator context, or null when no active session / scenario mismatch. */
  context: NavigatorHelperContext | null;
  /** True when there is an active Navigator session and scenario gate passes. */
  hasActiveNavigatorSession: boolean;
  /** Outcomes for this Navigator session (newest last). */
  outcomes: DpalNavigatorOutcomeEvent[];
  /** Track a new outcome. No-op when there is no active session. */
  trackOutcome(input: OutcomeEventInput): DpalNavigatorOutcomeEvent | null;
  /**
   * Track a milestone *exactly once* per mount keyed by `(moduleId, eventType)`.
   * Useful for `module_opened` / `location_prefilled` from a useEffect.
   */
  trackOutcomeOnce(input: OutcomeEventInput): DpalNavigatorOutcomeEvent | null;
}

export function useNavigatorOutcomeTracking(
  expectedScenario?: ScenarioType,
): UseOutcomeTrackingResult {
  const [context, setContext] = React.useState<NavigatorHelperContext | null>(() => {
    const ctx = getActiveNavigatorContext();
    if (!ctx) return null;
    if (expectedScenario && ctx.scenarioType !== expectedScenario) return null;
    return ctx;
  });

  /**
   * Re-read context on focus — the helper card lets the user dismiss the
   * Navigator helper, and we should stop recording outcomes after that.
   * Listening to `focus` avoids a polling timer.
   */
  React.useEffect(() => {
    function refresh() {
      const ctx = getActiveNavigatorContext();
      if (!ctx) {
        setContext(null);
        return;
      }
      if (expectedScenario && ctx.scenarioType !== expectedScenario) {
        setContext(null);
        return;
      }
      setContext(ctx);
    }
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [expectedScenario]);

  const onceTrackedRef = React.useRef<Set<string>>(new Set());

  const trackOutcome = React.useCallback(
    (input: OutcomeEventInput): DpalNavigatorOutcomeEvent | null => {
      if (!context) return null;
      return trackNavigatorOutcome(input);
    },
    [context],
  );

  const trackOutcomeOnce = React.useCallback(
    (input: OutcomeEventInput): DpalNavigatorOutcomeEvent | null => {
      if (!context) return null;
      const key = `${input.moduleId}::${input.eventType}`;
      if (onceTrackedRef.current.has(key)) return null;
      const event = trackNavigatorOutcome(input);
      if (event) onceTrackedRef.current.add(key);
      return event;
    },
    [context],
  );

  /**
   * Outcome list is recomputed lazily — modules typically don't need to
   * re-render on every outcome. Most callers only read `context` /
   * `hasActiveNavigatorSession`. The helper card uses the imperative reader.
   */
  const outcomes = React.useMemo<DpalNavigatorOutcomeEvent[]>(
    () => (context ? getNavigatorOutcomes(context.flowId) : []),
    /** Re-pull when the session changes. The helper card subscribes itself. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context?.flowId],
  );

  return {
    context,
    hasActiveNavigatorSession: !!context,
    outcomes,
    trackOutcome,
    trackOutcomeOnce,
  };
}
