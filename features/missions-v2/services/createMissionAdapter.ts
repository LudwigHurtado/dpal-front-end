import type { MissionAssignmentV2Model } from '../types';
import { DEFAULT_LAYER_EXECUTION_STATE } from '../types';
import type { CreateMissionInput } from '../createMissionTypes';
import { recalculateMissionProgress } from './layerServices';

function labelForMissionType(value: string): string {
  const hit = value.includes(' ')
    ? value
    : value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return hit || 'User mission';
}

/**
 * Builds a full V2 workspace model from the create-mission wizard — same shape as report-derived loads.
 */
export function buildUserCreatedMission(input: CreateMissionInput): MissionAssignmentV2Model {
  const now = new Date().toISOString();
  const missionId = `usr-msn-${Date.now()}`;
  const mtLabel = labelForMissionType(input.missionType);
  const loc = input.isRemote ? 'Remote / online' : input.location.trim() || 'Location TBD';
  const deadline =
    input.deadline?.trim() ||
    (input.startsAt?.trim() ? `Target start: ${input.startsAt}` : 'No fixed deadline');

  const rewardLabel =
    input.rewardType === 'None'
      ? 'No monetary reward'
      : `${input.rewardAmount.toLocaleString()} ${input.rewardType}`;

  const tasks = (input.initialTasks.length > 0 ? input.initialTasks : ['Plan mission steps', 'Confirm participants']).map(
    (title, idx) => ({
      id: `task-${missionId}-${idx + 1}`,
      title: title.trim() || `Task ${idx + 1}`,
      done: false,
      proofRequired: input.requiresProof ? 'Proof required' : 'Optional',
    }),
  );

  const proof =
    input.proofLabels.length > 0
      ? input.proofLabels.map((label, idx) => ({
          id: `proof-${missionId}-${idx + 1}`,
          label: label.trim() || `Proof ${idx + 1}`,
          completed: false,
        }))
      : input.requiresProof
        ? [{ id: `proof-${missionId}-1`, label: 'Photo or written confirmation', completed: false }]
        : [];

  const model: MissionAssignmentV2Model = {
    identity: {
      id: missionId,
      title: input.title.trim() || 'Untitled mission',
      subtitle: 'User-created community mission',
      missionType: mtLabel,
      category: input.category.trim() || 'Community',
      urgency: input.urgency,
      status: 'draft',
    },
    report: {
      title: input.title.trim() || 'Untitled mission',
      reportId: missionId,
      issueType: mtLabel,
      location: loc,
      snapshot: input.description.trim() || 'No description provided.',
    },
    details: {
      missionType: mtLabel,
      objective: input.description.trim() || 'Mission objective to be refined with your team.',
      deadline,
      rewardLabel,
      rewardType: input.rewardType === 'None' ? 'None' : input.rewardType,
      rewardAmount: input.rewardType === 'None' ? 0 : Math.max(0, input.rewardAmount),
      escrowLabel: 'No escrow configured',
      rules: [
        input.joinPolicy === 'open' ? 'Open join — be respectful and follow safety guidance.' : 'Lead may approve participants before work begins.',
        input.requiresProof ? 'Proof is required for completion where noted.' : 'Proof optional unless upgraded later.',
      ],
      objectivePhases: [
        {
          id: 'phase-setup',
          title: 'Mission setup',
          items: [
            { id: 'obj-1', label: 'Confirm participants and roles', done: false, images: [] },
            { id: 'obj-2', label: 'Review mission rules and safety', done: false, images: [] },
          ],
        },
      ],
    },
    tasks,
    team: [
      {
        id: `tm-${input.creator.userId}`,
        role: 'Lead',
        name: input.creator.displayName,
        profile: input.creator.profileHandle,
        permissions: ['assign', 'start', 'pause', 'invite'],
      },
    ],
    progress: {
      percent: 0,
      statusLabel: 'Ready to Start',
      timeline: ['Mission created'],
    },
    escrowConditions: [],
    proof,
    participation: {
      visibility: input.visibility,
      joinPolicy: input.joinPolicy,
      participantLimit: Math.max(1, input.participantLimit),
      allowRoleSelection: true,
      requiresLeadApproval: input.joinPolicy !== 'open',
      localOnly: !input.isRemote,
    },
    community: {
      sourceType: 'user_created',
      createdBy: input.creator,
      createdAt: now,
      startsAt: input.startsAt,
      invitees: [],
      joinRequests: [],
      tags: [input.category, mtLabel].filter(Boolean),
    },
    layerExecution: { ...DEFAULT_LAYER_EXECUTION_STATE },
  };

  return recalculateMissionProgress(model);
}
