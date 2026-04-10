import type { LayerExecutionState, MissionAssignmentV2Model, MissionLifecycleStatus } from '../types';

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
  const completed = tasks.filter((task) => task.done).length;
  const percent = Math.round((completed / Math.max(tasks.length, 1)) * 100);
  const next = {
    ...model,
    tasks,
    progress: {
      ...model.progress,
      percent,
    },
  };
  return appendTimeline(next, `Task update: ${completed}/${tasks.length} completed`);
}

export function toggleProofState(model: MissionAssignmentV2Model, proofId: string): MissionAssignmentV2Model {
  return {
    ...model,
    proof: model.proof.map((item) => (item.id === proofId ? { ...item, completed: !item.completed } : item)),
  };
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
