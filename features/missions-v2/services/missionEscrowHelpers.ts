import type { MissionAssignmentV2Model, MissionEscrowRecord } from '../types';

export function buildDefaultEscrow(
  rewardType: 'Coins' | 'Tokens' | 'HC' | 'None',
  rewardAmount: number,
): MissionEscrowRecord {
  const enabled = rewardType !== 'None' && rewardAmount > 0;

  return {
    enabled,
    status: enabled ? 'pending_funding' : 'not_applicable',
    rewardType,
    rewardAmount,
  };
}

export const getLeadMember = (model: MissionAssignmentV2Model) =>
  model.team.find((m) => m.role === 'Lead');

export const getVerifierMember = (model: MissionAssignmentV2Model) =>
  model.team.find((m) => m.role === 'Verifier');

export function isMissionReadyForRelease(model: MissionAssignmentV2Model): boolean {
  const taskDone = model.tasks.every((t) => t.done);
  const proofDone = model.proof.every((p) => p.completed);
  const objectiveDone = model.details.objectivePhases.every((phase) =>
    phase.items.every((item) => item.done),
  );
  return taskDone && proofDone && objectiveDone;
}
