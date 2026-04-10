import type { MissionAssignmentV2Model } from '../types';

export const mockMissionAssignmentV2: MissionAssignmentV2Model = {
  identity: {
    id: 'msn-v2-001',
    title: 'Mission Assignment V2',
    subtitle: 'Modular service-ready mission workspace preview',
    missionType: 'Field Verification',
    category: 'Public Safety',
    urgency: 'high',
    status: 'draft',
  },
  report: {
    title: 'Abandoned Lot Cleanup',
    reportId: 'rep-773120',
    issueType: 'Hazard and obstruction',
    location: 'Main Avenue, District 4',
    snapshot: 'Initial report includes crowd photos and route blockage details.',
    imageUrl: '/main-screen/file-a-report.png',
  },
  details: {
    missionType: 'Field Verification',
    objective: 'Clear the route safely, verify conditions, and confirm reopening evidence.',
    deadline: '2026-04-12 18:00',
    rewardLabel: '1,250 HC + Escrow Release',
    rewardType: 'HC',
    rewardAmount: 1250,
    escrowLabel: 'Escrow #ESC-9942 (sponsor funded)',
    rules: [
      'Lead must approve task completion order.',
      'Verifier sign-off required before payout.',
      'At least 2 proof items required for final closure.',
    ],
    objectivePhases: [
      {
        id: 'phase-beginning',
        title: 'Beginning Objective',
        items: [
          { id: 'bo-1', label: 'Capture arrival condition photo set', done: false, images: [] },
          { id: 'bo-2', label: 'Confirm safety perimeter and access', done: false, images: [] },
        ],
      },
      {
        id: 'phase-validation',
        title: 'Validation Objective',
        items: [
          { id: 'vo-1', label: 'Upload before/after proof', done: false, images: [] },
          { id: 'vo-2', label: 'Verifier checklist sign-off', done: false, images: [] },
        ],
      },
    ],
  },
  tasks: [
    { id: 't1', title: 'Site check and boundary scan', done: true, proofRequired: 'GPS check-in' },
    { id: 't2', title: 'Collect photo evidence of obstruction', done: false, proofRequired: '2 photos minimum' },
    { id: 't3', title: 'Coordinate helper safety lane', done: false, proofRequired: 'Verifier note' },
    { id: 't4', title: 'Submit final beneficiary confirmation', done: false, proofRequired: 'Beneficiary signature' },
  ],
  team: [
    { id: 'tm-1', role: 'Lead', name: 'A. Rivera', profile: '@a.rivera', permissions: ['assign', 'start', 'pause'] },
    { id: 'tm-2', role: 'Helper', name: 'S. Kim', profile: '@s.kim', permissions: ['execute', 'upload proof'] },
    { id: 'tm-3', role: 'Verifier', name: 'M. Soto', profile: '@m.soto', permissions: ['approve', 'reject'] },
    { id: 'tm-4', role: 'Witness', name: 'L. Reed', profile: '@l.reed', permissions: ['observe', 'attest'] },
  ],
  progress: {
    percent: 25,
    statusLabel: 'Ready to Start',
    timeline: ['Mission created', 'Team seeded', 'First task scoped'],
  },
  escrowConditions: [
    { label: 'Release trigger', value: 'Verifier + Beneficiary confirmation' },
    { label: 'Dispute window', value: '48 hours after completion' },
    { label: 'Fallback action', value: 'Manual admin arbitration' },
  ],
  proof: [
    { id: 'p1', label: 'Upload on-site photos', completed: false },
    { id: 'p2', label: 'GPS check-in match', completed: true },
    { id: 'p3', label: 'Final verification package', completed: false },
    { id: 'p4', label: 'Beneficiary confirmation', completed: false },
  ],
};
