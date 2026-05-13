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
  /** Forest Integrity / AFOLU — read-only UI walkthrough through QR field simulation and PDF export. */
  afoluProofWalkthrough: "afolu-proof-walkthrough",
} as const;

export type AutopilotMode = typeof AUTOPILOT_MODES[keyof typeof AUTOPILOT_MODES];

/** Stable `data-dpal-target` values for the AFOLU visible walkthrough. */
export const AFOLU_AUTOPILOT_TARGETS = {
  workflowIntro: "afolu-workflow-intro",
  tabMissions: "afolu-tab-missions",
  headerLaunchMission: "afolu-header-launch-mission",
  tabAssets: "afolu-tab-assets",
  qrSimulate: "afolu-qr-simulate",
  tabEvidence: "afolu-tab-evidence",
  tabReports: "afolu-tab-reports",
  pdfQr: "afolu-pdf-qr",
  humanGate: "afolu-human-gate",
} as const;

/**
 * AFOLU “watch DPAL walk it” sequence — highlight-only steps plus a final human gate.
 * The AFOLU page syncs tabs / demo actions from `step.id` (see `AfoluEngineView`).
 */
export const AFOLU_PROOF_WALKTHROUGH_STEPS: AutopilotStep[] = [
  {
    id: "afolu_step_home",
    intent: "highlight",
    bubble:
      "This walkthrough is read-only: it switches tabs and can generate a local PDF preview on your device. Nothing is published or anchored automatically.",
    targetSelector: `[data-dpal-target="${AFOLU_AUTOPILOT_TARGETS.workflowIntro}"]`,
    dwellMs: 2600,
  },
  {
    id: "afolu_step_missions",
    intent: "highlight",
    bubble: "Missions are the activity layer: planting, patrol, plot checks, and survival cycles that feed the proof stack.",
    targetSelector: `[data-dpal-target="${AFOLU_AUTOPILOT_TARGETS.tabMissions}"]`,
    dwellMs: 2200,
  },
  {
    id: "afolu_step_launch",
    intent: "highlight",
    bubble: "Operators launch missions from here. Deployment still requires human confirmation outside this demo path.",
    targetSelector: `[data-dpal-target="${AFOLU_AUTOPILOT_TARGETS.headerLaunchMission}"]`,
    dwellMs: 2200,
  },
  {
    id: "afolu_step_assets",
    intent: "highlight",
    bubble: "Assets (plots, batches, checkpoints) carry stable codes so field evidence can be tied back to geography.",
    targetSelector: `[data-dpal-target="${AFOLU_AUTOPILOT_TARGETS.tabAssets}"]`,
    dwellMs: 2000,
  },
  {
    id: "afolu_step_qr_sim",
    intent: "highlight",
    bubble: "A QR scan in the field would open a verification-style URL. Here we only simulate the scan locally.",
    targetSelector: `[data-dpal-target="${AFOLU_AUTOPILOT_TARGETS.qrSimulate}"]`,
    dwellMs: 2600,
  },
  {
    id: "afolu_step_evidence",
    intent: "highlight",
    bubble: "Evidence rows show how GPS, timestamps, photos, and QR match flags roll up into a proof score for reviewers.",
    targetSelector: `[data-dpal-target="${AFOLU_AUTOPILOT_TARGETS.tabEvidence}"]`,
    dwellMs: 2400,
  },
  {
    id: "afolu_step_reports",
    intent: "highlight",
    bubble: "The Reports tab separates observed field facts from modeled impact claims before any external submission.",
    targetSelector: `[data-dpal-target="${AFOLU_AUTOPILOT_TARGETS.tabReports}"]`,
    dwellMs: 2200,
  },
  {
    id: "afolu_step_generate_pdf",
    intent: "highlight",
    bubble: "DPAL can render a local verification PDF that embeds a QR pointing at a read-only summary URL for this preview.",
    targetSelector: `[data-dpal-target="${AFOLU_AUTOPILOT_TARGETS.pdfQr}"]`,
    dwellMs: 3200,
  },
  {
    id: "afolu_human_gate",
    intent: "human_approval_gate",
    bubble:
      "Autopilot ends here. Registry submission, buyer contracts, credit issuance, blockchain anchoring, and validator sign-off still require explicit human approval.",
    targetSelector: `[data-dpal-target="${AFOLU_AUTOPILOT_TARGETS.humanGate}"]`,
  },
];

/** Map a mode + scenario context to a step sequence. Returns `null` when unsupported. */
export function getAutopilotStepsForMode(mode: string | null): AutopilotStep[] | null {
  if (mode === AUTOPILOT_MODES.visibleSafeChecks) return WATER_ALERT_AUTOPILOT_STEPS;
  if (mode === AUTOPILOT_MODES.afoluProofWalkthrough) return AFOLU_PROOF_WALKTHROUGH_STEPS;
  return null;
}
