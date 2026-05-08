import type { FloodGuardWorkflowStepId } from '../floodGuard/components/FloodGuardStartPanel';

export interface WaterIntelWorkflowStepBase {
  id: string;
  title: string;
  purpose: string;
  checklist: string[];
  successLooksLike?: string;
  openTabLabel: string;
  continueLabel: string;
  aiHint: string;
}

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
