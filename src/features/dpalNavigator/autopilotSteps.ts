/**
 * Visible Autopilot — scripted step sequences.
 * --------------------------------------------------------------------------
 * Each step in a sequence describes one *visible* thing DPAL will do on
 * screen. Sequences are read-only and scripted up-front so what the user
 * sees in the panel preview is exactly what the autopilot will execute —
 * no hidden steps, no opaque automation.
 *
 * Hard rule: every step must be safely reversible by the user via the
 * Stop / Take Control buttons. Nothing here may publish, anchor, certify,
 * pay, or escalate.
 */
import type { AutopilotStep } from "./types";

/** Stable target attributes the dashboard exposes via `data-dpal-target`. */
export const AUTOPILOT_TARGETS = {
  waterCoordinates: "water-coordinates",
  runWaterEvidenceScan: "run-water-evidence-scan",
  moduleHealthPanel: "module-health-panel",
  humanApprovalGate: "human-approval-gate",
} as const;

/** The canonical 6-step Water Alert visible-safe-checks sequence. */
export const WATER_ALERT_AUTOPILOT_STEPS: AutopilotStep[] = [
  {
    id: "fill_coords",
    intent: "fill_coordinates",
    bubble: "DPAL found coordinates. First, I will place them into the scan form.",
    targetSelector: `[data-dpal-target="${AUTOPILOT_TARGETS.waterCoordinates}"]`,
    dwellMs: 2200,
  },
  {
    id: "point_at_scan",
    intent: "highlight",
    bubble: "Now DPAL will run safe provider checks. These are read-only checks.",
    targetSelector: `[data-dpal-target="${AUTOPILOT_TARGETS.runWaterEvidenceScan}"]`,
    dwellMs: 1800,
  },
  {
    id: "trigger_scan",
    intent: "trigger_scan",
    bubble: "Running the safe scan now — checking FloodGuard, USGS, NWS, and GeoLedger.",
    targetSelector: `[data-dpal-target="${AUTOPILOT_TARGETS.runWaterEvidenceScan}"]`,
    /** Waits for `markScanComplete` from the dashboard (same API as manual scan). */
    progressItems: ["FloodGuard", "USGS", "NWS", "GeoLedger"],
  },
  {
    id: "show_packet",
    intent: "show_packet_status",
    bubble: "DPAL completed the safe checks.",
    targetSelector: `[data-dpal-target="${AUTOPILOT_TARGETS.moduleHealthPanel}"]`,
    dwellMs: 2400,
  },
  {
    id: "human_approval_gate",
    intent: "human_approval_gate",
    bubble:
      "DPAL has completed safe automated checks. Publication, human verification, QR publication, blockchain anchoring, payments, or escalation still require human approval.",
    targetSelector: `[data-dpal-target="${AUTOPILOT_TARGETS.humanApprovalGate}"]`,
    /** Final step — autopilot stops here. */
  },
];

/** Sequence selector used by the panel + dashboard to keep things matched. */
export const AUTOPILOT_MODES = {
  visibleSafeChecks: "visible-safe-checks",
} as const;

export type AutopilotMode = typeof AUTOPILOT_MODES[keyof typeof AUTOPILOT_MODES];

/** Map a mode + scenario context to a step sequence. Returns `null` when unsupported. */
export function getAutopilotStepsForMode(mode: string | null): AutopilotStep[] | null {
  if (mode === AUTOPILOT_MODES.visibleSafeChecks) return WATER_ALERT_AUTOPILOT_STEPS;
  return null;
}
