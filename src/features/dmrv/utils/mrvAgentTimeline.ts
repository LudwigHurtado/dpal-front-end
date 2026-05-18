import type { MrvAgentFindingDto } from '../services/mrvAgentApi';

export type TimelineStepStatus =
  | 'Complete'
  | 'Warning'
  | 'Critical'
  | 'Skipped'
  | 'Pending';

export type MissionTimelineStep = {
  id: string;
  label: string;
  status: TimelineStepStatus;
  message: string;
  sourceLabel: string;
};

type StepDef = {
  id: string;
  label: string;
  match: (f: MrvAgentFindingDto) => boolean;
};

const STEP_DEFS: StepDef[] = [
  {
    id: 'PROJECT_CONFIG',
    label: 'Project config',
    match: (f) => f.category === 'PROJECT_CONFIG' && f.source === 'projectConfigAgent',
  },
  { id: 'AOI', label: 'AOI', match: (f) => f.category === 'AOI' },
  { id: 'SATELLITE', label: 'Satellite', match: (f) => f.category === 'SATELLITE' },
  { id: 'EVIDENCE', label: 'Evidence', match: (f) => f.category === 'EVIDENCE' },
  { id: 'FIELD', label: 'Field', match: (f) => f.category === 'FIELD' },
  { id: 'CALCULATION', label: 'Calculation', match: (f) => f.category === 'CALCULATION' },
  {
    id: 'SECURITY',
    label: 'Security / risk',
    match: (f) => f.category === 'SECURITY',
  },
  { id: 'VALIDATOR', label: 'Validator', match: (f) => f.category === 'VALIDATOR' },
  {
    id: 'REPORT',
    label: 'Report',
    match: (f) => f.source === 'reportAgent',
  },
  {
    id: 'NOTIFICATION',
    label: 'Notification',
    match: (f) => f.source === 'notificationAgent',
  },
];

function sourceLabelForFinding(f: MrvAgentFindingDto): string {
  if (f.category === 'VALIDATOR') return 'Validator Review Needed';
  if (f.severity === 'INFO') return 'System Checked';
  if (f.severity === 'WARNING' || f.severity === 'CRITICAL') return 'User Review Needed';
  return 'AI Suggested';
}

function statusFromFindings(findings: MrvAgentFindingDto[]): TimelineStepStatus {
  if (findings.length === 0) return 'Pending';
  const skipped = findings.some((f) => /skipped/i.test(f.message) || /skipped/i.test(f.title));
  if (skipped && findings.every((f) => f.severity === 'INFO')) return 'Skipped';
  if (findings.some((f) => f.severity === 'CRITICAL')) return 'Critical';
  if (findings.some((f) => f.severity === 'WARNING')) return 'Warning';
  return 'Complete';
}

function primaryMessage(findings: MrvAgentFindingDto[]): string {
  if (findings.length === 0) return 'Not checked';
  const ranked = [...findings].sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });
  return ranked[0].message;
}

export function buildMissionTimeline(findings: MrvAgentFindingDto[]): MissionTimelineStep[] {
  const used = new Set<string>();

  return STEP_DEFS.map((def) => {
    const matched = findings.filter((f) => {
      if (!def.match(f)) return false;
      if (used.has(f.id)) return false;
      used.add(f.id);
      return true;
    });

    const status = statusFromFindings(matched);
    const lead = matched[0];

    return {
      id: def.id,
      label: def.label,
      status,
      message: primaryMessage(matched),
      sourceLabel: lead ? sourceLabelForFinding(lead) : 'System Checked',
    };
  });
}

export function timelineStatusClass(status: TimelineStepStatus): string {
  switch (status) {
    case 'Critical':
      return 'border-red-300 bg-red-50 text-red-900';
    case 'Warning':
      return 'border-amber-300 bg-amber-50 text-amber-950';
    case 'Skipped':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    case 'Complete':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    default:
      return 'border-slate-200 bg-white text-slate-500';
  }
}
