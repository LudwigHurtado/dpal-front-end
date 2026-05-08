export type ExchangeWorkflowStepId =
  | 'ex_map'
  | 'ex_baseline'
  | 'ex_monitor'
  | 'ex_calc'
  | 'ex_evidence'
  | 'ex_tx'
  | 'ex_club';

export interface ColoradoExchangeWorkflowStep {
  id: ExchangeWorkflowStepId;
  title: string;
  purpose: string;
  checklist: string[];
  /** Path after /water-intelligence */
  path: string;
  /** Optional search string including ? */
  search?: string;
  openLabel: string;
  continueLabel: string;
  aiHint: string;
}

export const COLORADO_EXCHANGE_WORKFLOW_STEPS: ColoradoExchangeWorkflowStep[] = [
  {
    id: 'ex_map',
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
    path: '/basin-map',
    openLabel: 'Open Basin Map',
    continueLabel: 'Mark reviewed & continue',
    aiHint:
      'Start with geographic context. A conservation claim must tie to a clear basin and AOI before baseline review.',
  },
  {
    id: 'ex_baseline',
    title: 'Step 2 — Review Baseline Use',
    purpose: 'Confirm the before-condition for each water conservation project.',
    checklist: [
      'Review historical consumptive use',
      'Review irrigated acres or urban use area',
      'Review water source',
      'Review baseline confidence',
      'Review missing documents',
    ],
    path: '/colorado-river',
    search: '?focus=baseline',
    openLabel: 'Open Baseline / Project Details',
    continueLabel: 'Mark reviewed & continue',
    aiHint:
      'Start with the baseline. A conservation claim is only useful if the before-condition is documented.',
  },
  {
    id: 'ex_monitor',
    title: 'Step 3 — Review Conservation Monitoring',
    purpose: 'Review the after-condition and conservation action.',
    checklist: [
      'Review soil moisture or irrigation reduction data',
      'Review satellite / field evidence',
      'Review user-submitted reports',
      'Review monitoring period',
      'Review evidence gaps',
    ],
    path: '/colorado-river',
    search: '?focus=monitoring',
    openLabel: 'Open Conservation Monitoring',
    continueLabel: 'Mark reviewed & continue',
    aiHint:
      'This project may have monitoring data but still needs water-right documentation before authority review.',
  },
  {
    id: 'ex_calc',
    title: 'Step 4 — Calculate Saved Acre-Feet',
    purpose: 'Estimate gross and net verified conservation.',
    checklist: [
      'Confirm baseline AF',
      'Confirm current monitored AF',
      'Confirm rainfall adjustment',
      'Confirm return-flow adjustment',
      'Confirm uncertainty buffer',
      'Confirm eligible VWCUs',
    ],
    path: '/calculator',
    openLabel: 'Open Calculator',
    continueLabel: 'Mark reviewed & continue',
    aiHint: '1 VWCU = 1 acre-foot in this pilot demo — label outputs as Pilot / Demonstration Mode.',
  },
  {
    id: 'ex_evidence',
    title: 'Step 5 — Generate Evidence Packet',
    purpose:
      'Create a DPAL evidence packet with source labels, calculation results, confidence notes, and public-safe summary.',
    checklist: [
      'Confirm project ID',
      'Confirm geography',
      'Confirm source labels',
      'Confirm calculation output',
      'Confirm private info is hidden',
    ],
    path: '/evidence',
    openLabel: 'Generate Evidence Packet',
    continueLabel: 'Mark complete & continue',
    aiHint: 'Keep mock digests visibly labeled. Do not present demo hashes as legal filings.',
  },
  {
    id: 'ex_tx',
    title: 'Step 6 — Assign Transaction Category',
    purpose: 'Classify the saved water as resale, system enhancement, or sequestered/archived.',
    checklist: [
      'Review resale eligibility',
      'Review system enhancement option',
      'Review sequestered/archived option',
      'Review authority approval needs',
      'Review compensation notes',
    ],
    path: '/exchange',
    openLabel: 'Open Exchange / Transactions',
    continueLabel: 'Mark complete & continue',
    aiHint:
      'For resale, the project needs authority review and a transfer or lease agreement — this UI does not execute transfers.',
  },
  {
    id: 'ex_club',
    title: 'Step 7 — Prepare Club 20 Proposal',
    purpose: 'Generate a stakeholder-ready explanation of the pilot.',
    checklist: ['Problem', 'Opportunity', 'Agriculture protection', 'DPAL technology role', 'Pilot geography', 'Next steps'],
    path: '/club20',
    openLabel: 'Open Club 20 Builder',
    continueLabel: 'Finish Workflow',
    aiHint: 'For Club 20, emphasize agriculture protection, compensation, and verified acre-feet with honest pilot labeling.',
  },
];
