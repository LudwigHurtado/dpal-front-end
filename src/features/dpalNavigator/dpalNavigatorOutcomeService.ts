/**
 * DPAL Navigator — outcome tracking service (Phase 3)
 * ----------------------------------------------------------------------------
 * Lightweight, local-only continuity layer that records *workflow milestones*
 * observed inside a DPAL module after the user arrived from the Navigator.
 *
 * Hard guarantees (never relax these):
 *   - Outcomes are observations, never claims.
 *   - Nothing here publishes, anchors, verifies, files, or pays.
 *   - Storage is sessionStorage on the same key family as the helper context
 *     (`dpal_navigator_helper_context_v1`) so events live exactly as long as
 *     the active Navigator session in this tab.
 *   - When sessionStorage is unavailable (private mode, embed iframe, SSR,
 *     test runner) every API silently no-ops.
 *   - A `safetyFlags` shape is attached to every event making the
 *     non-publication / non-anchoring contract explicit downstream.
 */
import type {
  DpalNavigatorOutcomeEvent,
  NavigatorHelperContext,
  OutcomeEventInput,
  OutcomeSafetyFlags,
} from "./types";
import { readNavigatorHelperContext } from "./DpalNavigatorPanel";

/** Versioned storage keys. Bump the suffix if the shape ever changes. */
export const OUTCOME_EVENTS_STORAGE_KEY = "dpal_navigator_outcomes_v1";
export const OUTCOME_LATEST_STORAGE_KEY = "dpal_navigator_latest_outcome_v1";

/**
 * Soft cap on how many events we keep in sessionStorage. Outcome tracking is
 * a continuity hint, not analytics — we trim the oldest beyond this.
 */
const MAX_STORED_EVENTS = 100;

/**
 * Dedupe window in milliseconds. Repeats of the same
 * (sessionId, moduleId, eventType, route) within this window are dropped so
 * a re-render does not spam storage. 5s is enough to cover React strict-mode
 * double-effect runs and quick remounts without losing real subsequent steps.
 */
const DEDUPE_WINDOW_MS = 5_000;

/* ----------------------------- safe storage ----------------------------- */

function safeSession(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    /** Touch the storage to confirm it is actually accessible. */
    window.sessionStorage.getItem("__dpal_nav_probe");
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readEvents(): DpalNavigatorOutcomeEvent[] {
  const s = safeSession();
  if (!s) return [];
  try {
    const raw = s.getItem(OUTCOME_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    /** Mild shape sanity check — drop entries that don't look like events. */
    return parsed.filter(
      (e): e is DpalNavigatorOutcomeEvent =>
        e &&
        typeof e === "object" &&
        typeof e.id === "string" &&
        typeof e.sessionId === "string" &&
        typeof e.moduleId === "string" &&
        typeof e.eventType === "string",
    );
  } catch {
    return [];
  }
}

function writeEvents(events: DpalNavigatorOutcomeEvent[]): void {
  const s = safeSession();
  if (!s) return;
  try {
    const trimmed = events.length > MAX_STORED_EVENTS ? events.slice(-MAX_STORED_EVENTS) : events;
    s.setItem(OUTCOME_EVENTS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /** Quota or serialization failure — safe to ignore. */
  }
}

function writeLatest(event: DpalNavigatorOutcomeEvent | null): void {
  const s = safeSession();
  if (!s) return;
  try {
    if (event) s.setItem(OUTCOME_LATEST_STORAGE_KEY, JSON.stringify(event));
    else s.removeItem(OUTCOME_LATEST_STORAGE_KEY);
  } catch {
    /** noop */
  }
}

/* ----------------------------- public API ----------------------------- */

/** Returns the active Navigator helper context (or null when inactive). */
export function getActiveNavigatorContext(): NavigatorHelperContext | null {
  return readNavigatorHelperContext();
}

/** Returns true when there is an active Navigator session in this tab. */
export function hasActiveNavigatorSession(): boolean {
  return readNavigatorHelperContext() !== null;
}

/**
 * Record a workflow milestone. Returns the persisted event or `null` when:
 *   - There is no active Navigator session.
 *   - sessionStorage is not available.
 *   - The event was deduplicated against a recent identical entry.
 *
 * The caller never has to construct a full `DpalNavigatorOutcomeEvent` —
 * this function fills in `id`, `sessionId`, `scenario`, `createdAt`, and
 * the standard `safetyFlags` defaults.
 */
export function trackNavigatorOutcome(
  input: OutcomeEventInput,
): DpalNavigatorOutcomeEvent | null {
  const ctx = readNavigatorHelperContext();
  if (!ctx) return null;
  const s = safeSession();
  if (!s) return null;

  const now = new Date();
  const route =
    input.route ??
    (typeof window !== "undefined" && window.location ? window.location.pathname : undefined);

  const events = readEvents();
  const cutoff = now.getTime() - DEDUPE_WINDOW_MS;
  const isDuplicate = events.some(
    (e) =>
      e.sessionId === ctx.flowId &&
      e.moduleId === input.moduleId &&
      e.eventType === input.eventType &&
      (e.route ?? "") === (route ?? "") &&
      new Date(e.createdAt).getTime() >= cutoff,
  );
  if (isDuplicate) return null;

  const safetyFlags: OutcomeSafetyFlags = {
    autoPublished: false,
    autoVerified: false,
    autoAnchored: false,
    requiresHumanReview: input.requiresHumanReview,
  };

  const event: DpalNavigatorOutcomeEvent = {
    id: makeOutcomeId(now),
    sessionId: ctx.flowId,
    scenario: ctx.scenarioType,
    moduleId: input.moduleId,
    eventType: input.eventType,
    label: input.label,
    status: input.status ?? "observed",
    createdAt: now.toISOString(),
    route,
    coordinates: input.coordinates,
    metadata: input.metadata,
    safetyFlags,
  };

  writeEvents([...events, event]);
  writeLatest(event);
  return event;
}

/**
 * Get all outcome events, optionally filtered to a specific Navigator
 * sessionId / flowId. Returns a defensive copy.
 */
export function getNavigatorOutcomes(sessionId?: string): DpalNavigatorOutcomeEvent[] {
  const events = readEvents();
  return sessionId ? events.filter((e) => e.sessionId === sessionId) : events.slice();
}

/** Read the most-recently-tracked event (or null). */
export function getLatestNavigatorOutcome(): DpalNavigatorOutcomeEvent | null {
  const s = safeSession();
  if (!s) return null;
  try {
    const raw = s.getItem(OUTCOME_LATEST_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DpalNavigatorOutcomeEvent;
  } catch {
    return null;
  }
}

/** Wipe outcome storage. Call from the Navigator panel "Reset" if desired. */
export function clearNavigatorOutcomes(): void {
  const s = safeSession();
  if (!s) return;
  try {
    s.removeItem(OUTCOME_EVENTS_STORAGE_KEY);
    s.removeItem(OUTCOME_LATEST_STORAGE_KEY);
  } catch {
    /** noop */
  }
}

/* ----------------------------- helpers ----------------------------- */

function makeOutcomeId(now: Date): string {
  const t = now.getTime().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `nav-out-${t}-${r}`;
}
