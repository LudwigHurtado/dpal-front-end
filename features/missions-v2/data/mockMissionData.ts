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
    reportId: 'rep-773120',
    issueType: 'Hazard and obstruction',
    location: 'Main Avenue, District 4',
    snapshot: 'Initial report includes crowd photos and route blockage details.',
    imageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1280&q=80',
  },
  details: {
    objective: 'Clear the route safely, verify conditions, and confirm reopening evidence.',
    deadline: '2026-04-12 18:00',
    rewardLabel: '1,250 HC + Escrow Release',
    escrowLabel: 'Escrow #ESC-9942 (sponsor funded)',
    rules: [
      'Lead must approve task completion order.',
      'Verifier sign-off required before payout.',
      'At least 2 proof items required for final closure.',
    ],
  },
  tasks: [
    { id: 't1', title: 'Site check and boundary scan', done: true, proofRequired: 'GPS check-in' },
    { id: 't2', title: 'Collect photo evidence of obstruction', done: false, proofRequired: '2 photos minimum' },
    { id: 't3', title: 'Coordinate helper safety lane', done: false, proofRequired: 'Verifier note' },
    { id: 't4', title: 'Submit final beneficiary confirmation', done: false, proofRequired: 'Beneficiary signature' },
  ],
  team: [
    { role: 'Lead', name: 'A. Rivera', permissions: ['assign', 'start', 'pause'] },
    { role: 'Helper', name: 'S. Kim', permissions: ['execute', 'upload proof'] },
    { role: 'Verifier', name: 'M. Soto', permissions: ['approve', 'reject'] },
    { role: 'Witness', name: 'L. Reed', permissions: ['observe', 'attest'] },
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
