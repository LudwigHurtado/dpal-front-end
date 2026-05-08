import type { FloodGuardWorkflowStepId } from '../floodGuard/components/FloodGuardStartPanel';

export type ColoradoWorkflowStepId =
  | 'cr_basin_map'
  | 'cr_river_conditions'
  | 'cr_conservation'
  | 'cr_evidence'
  | 'cr_routing'
  | 'cr_ledger'
  | 'cr_public';

export interface WaterIntelWorkflowStepBase {
  id: string;
  title: string;
  purpose: string;
  checklist: string[];
  openTabLabel: string;
  continueLabel: string;
  aiHint: string;
}

export interface ColoradoWorkflowStep extends WaterIntelWorkflowStepBase {
  id: ColoradoWorkflowStepId;
  relatedTab: ColoradoPilotTab;
}

export type ColoradoPilotTab =
  | 'basin_map'
  | 'river_conditions'
  | 'conservation'
  | 'evidence'
  | 'routing'
  | 'ledger'
  | 'public_verify';

export const COLORADO_WORKFLOW_STEPS: ColoradoWorkflowStep[] = [
  {
    id: 'cr_basin_map',
    title: 'Step 1 — Review Basin Map',
    purpose:
      'Confirm the Colorado River basin overview, reservoirs, river gauges, conservation zones, and active risk indicators.',
    checklist: [
      'Confirm Colorado River Basin is selected',
      'Confirm Lake Powell and Lake Mead are visible',
      'Confirm conservation zones are visible',
      'Confirm active risk signals are visible',
      'Confirm data source labels are visible',
      'Confirm mock/fallback/live labels are clear',
    ],
    openTabLabel: 'Open Basin Map',
    continueLabel: 'Mark reviewed & continue',
    relatedTab: 'basin_map',
    aiHint:
      'Begin by reviewing the basin map. Confirm reservoirs, gauges, conservation zones, and data-source labels before generating evidence.',
  },
  {
    id: 'cr_river_conditions',
    title: 'Step 2 — Review River & Reservoir Conditions',
    purpose:
      'Check reservoir stress, stream gauge signals, snowpack/runoff forecast, and drought/flood indicators.',
    checklist: [
      'Review Lake Powell trend',
      'Review Lake Mead trend',
      'Review river gauge signals',
      'Review snowpack/runoff indicator',
      'Review drought/flood risk flags',
    ],
    openTabLabel: 'Open River Conditions',
    continueLabel: 'Mark reviewed & continue',
    relatedTab: 'river_conditions',
    aiHint:
      'Focus on Lake Powell, Lake Mead, and any conservation opportunity zones. Treat all charts as demo until live APIs are connected.',
  },
  {
    id: 'cr_conservation',
    title: 'Step 3 — Review Conservation Opportunities',
    purpose:
      'Identify agricultural, municipal, or system-enhancement opportunities where verified conservation could be measured.',
    checklist: [
      'Review agricultural irrigation opportunities',
      'Review urban conservation opportunities',
      'Review possible acre-feet savings',
      'Review verification readiness',
      'Review evidence gaps',
    ],
    openTabLabel: 'Open Conservation Opportunities',
    continueLabel: 'Mark reviewed & continue',
    relatedTab: 'conservation',
    aiHint:
      'Review whether acre-feet savings can be estimated and whether the evidence is strong enough for a future Verified Water Conservation Unit.',
  },
  {
    id: 'cr_evidence',
    title: 'Step 4 — Generate Evidence Packet',
    purpose:
      'Create a DPAL evidence packet with source labels, data digests, location records, confidence notes, and conservation relevance.',
    checklist: [
      'Confirm project ID',
      'Confirm geography',
      'Confirm data layers',
      'Confirm source labels',
      'Confirm confidence notes',
      'Confirm no private information is exposed',
    ],
    openTabLabel: 'Generate Evidence Packet',
    continueLabel: 'Mark complete & continue',
    relatedTab: 'evidence',
    aiHint:
      'Keep source labels attached to every digest. This pilot uses mock digests — label them clearly in any export.',
  },
  {
    id: 'cr_routing',
    title: 'Step 5 — Run Routing / Stakeholder Preview',
    purpose:
      'Dry-run who should receive the intelligence summary, such as water district, city, conservation sponsor, agency, validator, or internal DPAL team.',
    checklist: [
      'Preview recipients',
      'Confirm dry-run mode',
      'Confirm no real notifications are sent',
      'Confirm blocked routes and reasons',
      'Confirm stakeholder categories',
    ],
    openTabLabel: 'Generate Routing Preview',
    continueLabel: 'Mark complete & continue',
    relatedTab: 'routing',
    aiHint:
      'Preview routing is exactly that — a preview. No real notifications are sent in this mode.',
  },
  {
    id: 'cr_ledger',
    title: 'Step 6 — Anchor / Register Record',
    purpose: 'Create a mock or live ledger record depending on mode.',
    checklist: [
      'Confirm ledger mode',
      'Confirm evidence hash',
      'Confirm public-safe summary',
      'Confirm no private documents are exposed',
    ],
    openTabLabel: 'Anchor / Register Record',
    continueLabel: 'Mark complete & continue',
    relatedTab: 'ledger',
    aiHint:
      'Mock ledger mode is active. Records demonstrate workflow behavior but should not be represented as live blockchain anchors.',
  },
  {
    id: 'cr_public',
    title: 'Step 7 — Open Public Verification Page',
    purpose:
      'Open a public-safe record that shows the project summary, evidence hash, status, and timeline without exposing private documents.',
    checklist: [
      'Confirm public record opens',
      'Confirm private data is hidden',
      'Confirm public-safe language is shown',
      'Confirm disclaimers remain visible',
    ],
    openTabLabel: 'Open Public Verification',
    continueLabel: 'Finish Workflow',
    relatedTab: 'public_verify',
    aiHint:
      'Public verification must never expose situation-room threads, raw citizen media, or privileged documents.',
  },
];

/** City FloodGuard demo workflow — same step IDs as FloodGuardStartPanel, extended for UI panel. */
export interface CityFloodWorkflowStep extends WaterIntelWorkflowStepBase {
  id: FloodGuardWorkflowStepId;
  relatedTab: 'overview' | 'agent_monitor' | 'evidence' | 'settings';
}

export const CITY_FLOODGUARD_WORKFLOW_PANEL_STEPS: CityFloodWorkflowStep[] = [
  {
    id: 'review_city',
    title: 'Step 1 — Review City Flood Map',
    purpose: 'Open the City Flood Map and confirm zones, alert pins, cameras, rivers, roads, and the active city.',
    checklist: [
      'Confirm the intended pilot city is selected',
      'Confirm flood zones render on the map',
      'Confirm alert pins match the feed',
      'Confirm data source chips show mock/fallback/API where applicable',
    ],
    openTabLabel: 'Open City Flood Map',
    continueLabel: 'Mark reviewed & continue',
    relatedTab: 'overview',
    aiHint: 'Start with the city map. Confirm zones and labels before moving to agents or missions.',
  },
  {
    id: 'open_agent_monitor',
    title: 'Step 2 — Open Agent Monitor',
    purpose: 'Use the Agent Monitor for rainfall, satellite, and water-level integrations plus safety posture.',
    checklist: [
      'Open Agent Monitor',
      'Confirm adapter cards load or show graceful fallback',
      'Read the safety disclaimer',
    ],
    openTabLabel: 'Open Agent Monitor',
    continueLabel: 'Mark reviewed & continue',
    relatedTab: 'agent_monitor',
    aiHint: 'Agent Monitor is the operational hub for remote-first screening before any field dispatch.',
  },
  {
    id: 'refresh_evaluation',
    title: 'Step 3 — Refresh zone evaluation',
    purpose: 'Pull the latest agentic evaluation for each zone.',
    checklist: [
      'Press Refresh in Agent Monitor',
      'Confirm each zone shows reasons and mission safety class',
    ],
    openTabLabel: 'Open Agent Monitor',
    continueLabel: 'Mark reviewed & continue',
    relatedTab: 'agent_monitor',
    aiHint: 'Refresh after significant weather changes or new detections.',
  },
  {
    id: 'dispatch_safe_mission',
    title: 'Step 4 — Dispatch safe mission (only if allowed)',
    purpose: 'Dispatch only when the safety classification permits; unsafe missions stay blocked.',
    checklist: [
      'Confirm mission is recommended (not blocked)',
      'Confirm validator posture if applicable',
      'Dispatch only if policy allows',
    ],
    openTabLabel: 'Open Agent Monitor',
    continueLabel: 'Mark complete & continue',
    relatedTab: 'agent_monitor',
    aiHint: 'Never override a blocked mission — the gate protects operators and the public.',
  },
  {
    id: 'generate_evidence',
    title: 'Step 5 — Generate evidence packet',
    purpose: 'Create hashes, summaries, and provenance digests for the selected alert.',
    checklist: [
      'Select the correct alert',
      'Generate packet',
      'Confirm mock ledger labels if offline',
    ],
    openTabLabel: 'Open Evidence Packet',
    continueLabel: 'Mark complete & continue',
    relatedTab: 'evidence',
    aiHint: 'Evidence packets should list which signals were mock, fallback, or live.',
  },
  {
    id: 'generate_routing_preview',
    title: 'Step 6 — Generate routing preview (dry run)',
    purpose: 'Preview audiences and channels — no real notifications.',
    checklist: [
      'Open Alert Settings → Routing Preview',
      'Choose dry-run',
      'Review blocked vs routable paths',
    ],
    openTabLabel: 'Open Routing Preview',
    continueLabel: 'Mark complete & continue',
    relatedTab: 'settings',
    aiHint: 'Routing preview is not official alerting — keep copy aligned with preview-only labeling.',
  },
  {
    id: 'anchor_evidence',
    title: 'Step 7 — Anchor on DPAL ledger',
    purpose: 'Register a ledger record with anchoring hash — mock chain in pilot.',
    checklist: [
      'Confirm ledger mode (mock vs live)',
      'Anchor from Evidence Packet',
      'Store verification link safely',
    ],
    openTabLabel: 'Open Evidence Packet',
    continueLabel: 'Mark complete & continue',
    relatedTab: 'evidence',
    aiHint: 'Mock ledger records are for workflow demonstration, not production claims.',
  },
  {
    id: 'open_verification',
    title: 'Step 8 — Open public verification page',
    purpose: 'Review the public-safe ledger surface — no private media or threads.',
    checklist: [
      'Open verification from ledger block',
      'Confirm only public-safe fields appear',
      'Keep disclaimers visible',
    ],
    openTabLabel: 'Open Evidence Packet',
    continueLabel: 'Finish Workflow',
    relatedTab: 'evidence',
    aiHint: 'Public verification builds trust because it hides private operational detail by design.',
  },
];
