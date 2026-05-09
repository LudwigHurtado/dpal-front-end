/**
 * useVisibleAutopilot — Phase 4 visible-autopilot state machine.
 * --------------------------------------------------------------------------
 * Drives a scripted, on-screen "watch DPAL do it" walkthrough for a target
 * module (currently the Water Alert Evidence Dashboard). The hook is *only*
 * a state machine — it never:
 *   - publishes anything,
 *   - anchors anything,
 *   - certifies anything,
 *   - calls authenticated mutating endpoints,
 *   - moves the real OS-level mouse,
 *   - fakes user identity.
 *
 * The dashboard owns the actual side effects via callbacks (`onPrefill`,
 * `onTriggerScan`). This hook only sequences the visible UI: virtual cursor,
 * spotlight, bubble, provider progress.
 *
 * The dashboard reports the scan result back through `markScanComplete(...)`
 * so the autopilot can advance from `wait_for_scan` to `show_packet_status`.
 *
 * Pause/Resume/Stop/Take Control are implemented by clearing the pending
 * timer and toggling status — no network, no DOM cleanup of completed work.
 */
import React from "react";
import type {
  AutopilotPacketStatus,
  AutopilotStatus,
  AutopilotStep,
  ProviderProgressStatus,
} from "./types";

interface UseVisibleAutopilotOptions {
  /** When false the hook is dormant — no timers, no targets. */
  enabled: boolean;
  /** Scripted steps. Pass a stable reference (e.g. exported constant). */
  steps: AutopilotStep[];
  /** Called when an `intent: "fill_coordinates"` step fires. */
  onPrefillCoordinates?: (() => void) | null;
  /** Called when an `intent: "trigger_scan"` step fires. */
  onTriggerScan?: (() => void) | null;
}

export interface VisibleAutopilotApi {
  /** Current state-machine status. */
  status: AutopilotStatus;
  /** True when this autopilot is currently driving the UI. */
  isActive: boolean;
  /** Index of the active step, or -1 when not running. */
  stepIndex: number;
  /** The step object for `stepIndex`, or null. */
  currentStep: AutopilotStep | null;
  /** Total steps in the sequence (for the progress label). */
  totalSteps: number;
  /** Per-provider progress (used by `show_progress` / `show_packet_status`). */
  providerProgress: Record<string, ProviderProgressStatus>;
  /** Final packet status (`ok` | `degraded` | `error` | null). */
  packetStatus: AutopilotPacketStatus;
  /** Bounding rect of the currently spotlighted element, or null. */
  targetRect: DOMRect | null;
  /** True when motion should be reduced for accessibility. */
  reduceMotion: boolean;

  /** Begin the sequence from step 0. Idempotent — safe to call repeatedly. */
  start(): void;
  /** Pause the timer. Cursor + spotlight remain visible. */
  pause(): void;
  /** Resume from the paused step. */
  resume(): void;
  /**
   * Stop the autopilot. Hides cursor + spotlight + bar. Use this when the
   * user wants to cancel and clear the on-screen overlays.
   */
  stop(): void;
  /**
   * Take control: stop the autopilot but keep any completed UI state visible
   * (e.g. the packet that was just generated). Same UX outcome as a graceful
   * "I'll drive from here".
   */
  takeControl(): void;
  /**
   * The dashboard calls this when the real backend scan returns. Provider
   * status comes from `packet.moduleHealth` (or "unavailable" when missing)
   * and `packetStatus` flows from `packet.status`.
   */
  markScanComplete(input: {
    packetStatus: AutopilotPacketStatus;
    providerProgress?: Record<string, ProviderProgressStatus>;
  }): void;
}

const ZERO_PROGRESS: Record<string, ProviderProgressStatus> = {};

/** Default dwell when a step does not specify one. */
const DEFAULT_DWELL_MS = 1500;
/** How long to wait after a target rect is set before firing the intent's
 * side effect — gives the cursor time to animate visibly to the target. */
const CURSOR_TRAVEL_DELAY_MS = 600;

export function useVisibleAutopilot(opts: UseVisibleAutopilotOptions): VisibleAutopilotApi {
  const { enabled, steps, onPrefillCoordinates, onTriggerScan } = opts;

  const [status, setStatus] = React.useState<AutopilotStatus>("idle");
  const [stepIndex, setStepIndex] = React.useState<number>(-1);
  const [providerProgress, setProviderProgress] =
    React.useState<Record<string, ProviderProgressStatus>>(ZERO_PROGRESS);
  const [packetStatus, setPacketStatus] = React.useState<AutopilotPacketStatus>(null);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  const advanceTimerRef = React.useRef<number | null>(null);
  const cursorTimerRef = React.useRef<number | null>(null);
  const progressTimerRef = React.useRef<number | null>(null);
  const sideEffectFiredRef = React.useRef<Set<string>>(new Set());
  /** Snapshot of the "auto" providers we mark unavailable if no scan return. */
  const providersForSequenceRef = React.useRef<string[]>([]);

  /* --------------------------- accessibility --------------------------- */

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, []);

  /* --------------------------- cleanup helpers --------------------------- */

  const clearTimers = React.useCallback(() => {
    if (advanceTimerRef.current != null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (cursorTimerRef.current != null) {
      window.clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = null;
    }
    if (progressTimerRef.current != null) {
      window.clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  /* --------------------------- target tracking --------------------------- */

  /**
   * Update the spotlight + cursor target rect. Recompute on resize / scroll
   * while the autopilot is active so the overlay tracks the element.
   */
  React.useEffect(() => {
    if (status !== "running" && status !== "paused") return;
    const step = steps[stepIndex];
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    function locate() {
      if (!step?.targetSelector) {
        setTargetRect(null);
        return;
      }
      const el = document.querySelector<HTMLElement>(step.targetSelector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      setTargetRect(el.getBoundingClientRect());
    }

    locate();

    const onMove = () => locate();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    /** Recompute periodically while running to track late-rendering nodes. */
    const tick = window.setInterval(locate, 600);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      window.clearInterval(tick);
    };
  }, [status, stepIndex, steps]);

  /* --------------------------- step processor --------------------------- */

  /**
   * Whenever the active step changes (and we're running), scroll the target
   * into view, fire the step's intent after the cursor-travel delay, then
   * schedule the dwell-based advance.
   */
  React.useEffect(() => {
    if (status !== "running") return;
    if (stepIndex < 0 || stepIndex >= steps.length) return;

    const step = steps[stepIndex];

    /** 1) Scroll target into view (smoothly, unless reduced motion). */
    if (step.targetSelector) {
      const el = document.querySelector<HTMLElement>(step.targetSelector);
      el?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    }

    /** 2) After cursor-travel delay, fire the side effect for this step. */
    const sideEffectKey = `${stepIndex}::${step.id}`;
    cursorTimerRef.current = window.setTimeout(() => {
      if (sideEffectFiredRef.current.has(sideEffectKey)) return;
      sideEffectFiredRef.current.add(sideEffectKey);

      switch (step.intent) {
        case "fill_coordinates":
          if (onPrefillCoordinates) onPrefillCoordinates();
          break;
        case "trigger_scan":
          /** Mark all providers as "checking" right before triggering scan. */
          if (step.progressItems) {
            const init: Record<string, ProviderProgressStatus> = {};
            step.progressItems.forEach((p) => (init[p] = "checking"));
            setProviderProgress(init);
          } else if (providersForSequenceRef.current.length) {
            const init: Record<string, ProviderProgressStatus> = {};
            providersForSequenceRef.current.forEach((p) => (init[p] = "checking"));
            setProviderProgress(init);
          }
          if (onTriggerScan) onTriggerScan();
          break;
        case "show_progress":
          /** Animate providers from "pending" → "checking" while we wait. */
          if (step.progressItems) {
            providersForSequenceRef.current = step.progressItems.slice();
            const next: Record<string, ProviderProgressStatus> = {};
            step.progressItems.forEach((p) => (next[p] = "checking"));
            setProviderProgress(next);
          }
          break;
        case "highlight":
        case "wait_for_scan":
        case "show_packet_status":
        case "human_approval_gate":
          /** No side effect — these are visible-only steps. */
          break;
      }
    }, CURSOR_TRAVEL_DELAY_MS);

    /**
     * 3) Schedule advancing to the next step.
     * `wait_for_scan` and `show_progress` (when scan hasn't returned yet) and
     * `human_approval_gate` (final) do not auto-advance.
     */
    const isWaitingForScan = step.intent === "wait_for_scan" || step.intent === "show_progress";
    const isFinal = step.intent === "human_approval_gate";

    if (!isWaitingForScan && !isFinal) {
      const dwell = step.dwellMs ?? DEFAULT_DWELL_MS;
      advanceTimerRef.current = window.setTimeout(() => {
        setStepIndex((idx) => idx + 1);
      }, dwell + CURSOR_TRAVEL_DELAY_MS);
    } else if (isFinal) {
      /** Final step — flag the run as completed (cursor stays for a beat). */
      advanceTimerRef.current = window.setTimeout(() => {
        setStatus("completed");
      }, (step.dwellMs ?? 1200) + CURSOR_TRAVEL_DELAY_MS);
    }

    return () => clearTimers();
  }, [
    status,
    stepIndex,
    steps,
    reduceMotion,
    onPrefillCoordinates,
    onTriggerScan,
    clearTimers,
  ]);

  /** Pause clears timers; resume rebuilds them by toggling status. */
  React.useEffect(() => {
    if (status === "paused" || status === "aborted" || status === "completed" || status === "idle") {
      clearTimers();
    }
  }, [status, clearTimers]);

  /* --------------------------- lifecycle gate --------------------------- */

  /** When `enabled` flips off, abort cleanly. */
  React.useEffect(() => {
    if (!enabled && status !== "idle") {
      clearTimers();
      setStatus("aborted");
      setStepIndex(-1);
      setTargetRect(null);
    }
  }, [enabled, status, clearTimers]);

  React.useEffect(() => {
    /** Cleanup any timers on unmount. */
    return () => clearTimers();
  }, [clearTimers]);

  /* ------------------------------ controls ------------------------------ */

  const start = React.useCallback(() => {
    if (!enabled) return;
    if (steps.length === 0) return;
    sideEffectFiredRef.current = new Set();
    setProviderProgress(ZERO_PROGRESS);
    setPacketStatus(null);
    setStepIndex(0);
    setStatus("running");
  }, [enabled, steps]);

  const pause = React.useCallback(() => {
    setStatus((s) => (s === "running" ? "paused" : s));
  }, []);

  const resume = React.useCallback(() => {
    setStatus((s) => (s === "paused" ? "running" : s));
  }, []);

  const stop = React.useCallback(() => {
    clearTimers();
    setStatus("aborted");
    setStepIndex(-1);
    setTargetRect(null);
    setProviderProgress(ZERO_PROGRESS);
    setPacketStatus(null);
    sideEffectFiredRef.current = new Set();
  }, [clearTimers]);

  const takeControl = React.useCallback(() => {
    /**
     * Stop driving but keep on-screen results visible. Differs from `stop()`
     * only in intent labelling — the autopilot status becomes "completed"
     * (rather than "aborted") so the helper card / status panel can read
     * the run as "ended by user, results preserved".
     */
    clearTimers();
    setStatus("completed");
    setTargetRect(null);
  }, [clearTimers]);

  const markScanComplete = React.useCallback<VisibleAutopilotApi["markScanComplete"]>(
    ({ packetStatus: ps, providerProgress: pp }) => {
      if (pp) {
        setProviderProgress(pp);
      } else if (providersForSequenceRef.current.length) {
        /** No detail provided — mark all as observed (best-effort default). */
        const next: Record<string, ProviderProgressStatus> = {};
        providersForSequenceRef.current.forEach((p) => (next[p] = "observed"));
        setProviderProgress(next);
      }
      setPacketStatus(ps);
      setStepIndex((idx) => {
        const step = steps[idx];
        if (!step) return idx;
        /** Only auto-advance from a waiting step. */
        if (step.intent === "wait_for_scan" || step.intent === "show_progress") return idx + 1;
        return idx;
      });
    },
    [steps],
  );

  /* ------------------------------ derived ------------------------------ */

  const isActive = status === "running" || status === "paused";
  const currentStep = stepIndex >= 0 && stepIndex < steps.length ? steps[stepIndex] : null;

  return {
    status,
    isActive,
    stepIndex,
    currentStep,
    totalSteps: steps.length,
    providerProgress,
    packetStatus,
    targetRect,
    reduceMotion,
    start,
    pause,
    resume,
    stop,
    takeControl,
    markScanComplete,
  };
}
