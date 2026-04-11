import type { LayerExecutionState, MissionAssignmentV2Model, MissionLifecycleStatus } from '../types';

function countObjectiveItems(model: MissionAssignmentV2Model): { done: number; total: number } {
  let total = 0;
  let done = 0;
  for (const phase of model.details.objectivePhases || []) {
    for (const item of phase.items || []) {
      total += 1;
      if (item.done) done += 1;
    }
  }
  return { done, total };
}

/**
 * Single completion score from tasks, proof requirements, and objective-phase checklist items.
 */
export function recalculateMissionProgress(model: MissionAssignmentV2Model): MissionAssignmentV2Model {
  const taskDone = model.tasks.filter((t) => t.done).length;
  const taskTotal = Math.max(model.tasks.length, 0);
  const proofDone = model.proof.filter((p) => p.completed).length;
  const proofTotal = Math.max(model.proof.length, 0);
  const { done: objDone, total: objTotal } = countObjectiveItems(model);

  const parts = taskTotal + proofTotal + objTotal;
  const completed = taskDone + proofDone + objDone;
  const percent = parts === 0 ? 0 : Math.round((completed / parts) * 100);

  return {
    ...model,
    progress: {
      ...model.progress,
      percent,
    },
  };
}

function appendTimeline(model: MissionAssignmentV2Model, entry: string): MissionAssignmentV2Model {
  return {
    ...model,
    progress: {
      ...model.progress,
      timeline: [entry, ...model.progress.timeline].slice(0, 8),
    },
  };
}

export function applyMissionState(
  model: MissionAssignmentV2Model,
  missionStatus: MissionLifecycleStatus,
): MissionAssignmentV2Model {
  const statusLabelMap: Record<MissionLifecycleStatus, string> = {
    draft: 'Ready to Start',
    active: 'In Progress',
    paused: 'Paused',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return {
    ...model,
    identity: {
      ...model.identity,
      status: missionStatus,
    },
    progress: {
      ...model.progress,
      statusLabel: statusLabelMap[missionStatus],
    },
  };
}

export function toggleTaskState(model: MissionAssignmentV2Model, taskId: string): MissionAssignmentV2Model {
  const tasks = model.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task));
  const taskDone = tasks.filter((task) => task.done).length;
  const next = recalculateMissionProgress({
    ...model,
    tasks,
  });
  return appendTimeline(next, `Task update: ${taskDone}/${tasks.length} tasks done`);
}

export function toggleProofState(model: MissionAssignmentV2Model, proofId: string): MissionAssignmentV2Model {
  const proof = model.proof.map((item) => (item.id === proofId ? { ...item, completed: !item.completed } : item));
  return recalculateMissionProgress({
    ...model,
    proof,
  });
}

export function toggleObjectiveItemState(
  model: MissionAssignmentV2Model,
  phaseId: string,
  itemId: string,
): MissionAssignmentV2Model {
  const objectivePhases = model.details.objectivePhases.map((phase) => (
    phase.id !== phaseId
      ? phase
      : {
          ...phase,
          items: phase.items.map((item) => (
            item.id === itemId ? { ...item, done: !item.done } : item
          )),
        }
  ));
  return recalculateMissionProgress({
    ...model,
    details: { ...model.details, objectivePhases },
  });
}

export function assignTeamPlaceholder(model: MissionAssignmentV2Model): MissionAssignmentV2Model {
  const hasBackup = model.team.some((member) => member.name === 'Backup Ops');
  if (hasBackup) return model;
  return {
    ...model,
    team: [
      ...model.team,
      { id: `tm-${Date.now()}`, role: 'Helper', name: 'Backup Ops', profile: '@backup.ops', permissions: ['execute', 'upload proof'] },
    ],
  };
}

export function nextLayerState(
  prev: LayerExecutionState,
  action:
    | 'syncReport'
    | 'collectEvidence'
    | 'approveValidation'
    | 'rejectValidation'
    | 'lockEscrow'
    | 'releaseEscrow'
    | 'disputeEscrow'
    | 'startResolution'
    | 'resolveCase'
    | 'recordOutcome'
    | 'awardReputation'
    | 'closeGovernance',
): LayerExecutionState {
  switch (action) {
    case 'syncReport':
      return { ...prev, report: 'synced' };
    case 'collectEvidence':
      return { ...prev, evidence: 'collected' };
    case 'approveValidation':
      return { ...prev, validation: 'approved' };
    case 'rejectValidation':
      return { ...prev, validation: 'rejected' };
    case 'lockEscrow':
      return { ...prev, escrow: 'locked' };
    case 'releaseEscrow':
      return { ...prev, escrow: 'released' };
    case 'disputeEscrow':
      return { ...prev, escrow: 'disputed' };
    case 'startResolution':
      return { ...prev, resolution: 'in_progress' };
    case 'resolveCase':
      return { ...prev, resolution: 'resolved' };
    case 'recordOutcome':
      return { ...prev, outcome: 'recorded' };
    case 'awardReputation':
      return { ...prev, reputation: 'awarded' };
    case 'closeGovernance':
      return { ...prev, governance: 'closed' };
    default:
      return prev;
  }
}
