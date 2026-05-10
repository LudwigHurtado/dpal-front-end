/**
 * Internal autopilot diagnostics timeline (dev-focused).
 * No secrets or raw provider errors — only safe metadata for QA.
 */

export type AutopilotDiagnosticEventName =
  | "navigator_planned"
  | "autopilot_route_started"
  | "autopilot_dashboard_loaded"
  | "target_found"
  | "target_missing"
  | "cursor_moved"
  | "step_started"
  | "step_completed"
  | "scan_triggered"
  | "scan_request_started"
  | "scan_request_completed"
  | "scan_request_failed"
  | "packet_received"
  | "module_health_rendered"
  | "human_approval_gate_reached"
  | "autopilot_completed"
  | "autopilot_stopped"
  | "autopilot_take_control";

export interface AutopilotDiagnosticEvent {
  timestamp: string;
  eventName: AutopilotDiagnosticEventName;
  stepId?: string;
  stepIndex?: number;
  route?: string;
  details?: Record<string, unknown>;
}

declare global {
  interface Window {
    __DPAL_AUTOPILOT_TIMELINE__?: AutopilotDiagnosticEvent[];
  }
}

const MAX = 200;
const timeline: AutopilotDiagnosticEvent[] = [];
const listeners = new Set<() => void>();

function attachDevGlobal(): void {
  if (typeof window === "undefined" || !import.meta.env.DEV) return;
  (window as unknown as { __DPAL_AUTOPILOT_TIMELINE__?: AutopilotDiagnosticEvent[] }).__DPAL_AUTOPILOT_TIMELINE__ =
    timeline;
}

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /** ignore subscriber errors */
    }
  });
}

export function logAutopilotEvent(event: Omit<AutopilotDiagnosticEvent, "timestamp"> & { timestamp?: string }): void {
  if (!import.meta.env.DEV) return;
  const row: AutopilotDiagnosticEvent = {
    timestamp: event.timestamp ?? new Date().toISOString(),
    eventName: event.eventName,
    stepId: event.stepId,
    stepIndex: event.stepIndex,
    route: event.route ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : ""),
    details: event.details,
  };
  timeline.push(row);
  if (timeline.length > MAX) timeline.splice(0, timeline.length - MAX);
  attachDevGlobal();
  notify();
}

export function getAutopilotTimeline(): readonly AutopilotDiagnosticEvent[] {
  return timeline;
}

export function clearAutopilotTimeline(): void {
  timeline.length = 0;
  attachDevGlobal();
  notify();
}

export function subscribeAutopilotTimeline(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
