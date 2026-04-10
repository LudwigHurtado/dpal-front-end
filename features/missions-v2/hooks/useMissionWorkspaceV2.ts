import { useCallback, useMemo, useState } from 'react';
import type { LayerAction, LayerExecutionState, MissionAssignmentV2Model, MissionLifecycleStatus } from '../types';
import {
  applyMissionState,
  assignTeamPlaceholder,
  toggleProofState,
  toggleTaskState,
} from '../services/layerServices';
import { runLayerAction } from '../services/layers/layerActionRunner';

const initialLayerState: LayerExecutionState = {
  report: 'ready',
  evidence: 'pending',
  validation: 'pending',
  mission: 'draft',
  escrow: 'pending',
  resolution: 'idle',
  outcome: 'pending',
  reputation: 'unchanged',
  governance: 'open',
};

export function useMissionWorkspaceV2(initialModel: MissionAssignmentV2Model) {
  const [model, setModel] = useState<MissionAssignmentV2Model>(initialModel);
  const [layers, setLayers] = useState<LayerExecutionState>(initialLayerState);
  const [activeLayerAction, setActiveLayerAction] = useState<LayerAction | null>(null);
  const [layerActionError, setLayerActionError] = useState<string | null>(null);

  const updateMissionStatus = useCallback((status: MissionLifecycleStatus) => {
    setModel((prev) => applyMissionState(prev, status));
    setLayers((prev) => ({ ...prev, mission: status }));
  }, []);

  const handleToggleTask = useCallback((taskId: string) => {
    setModel((prev) => toggleTaskState(prev, taskId));
  }, []);

  const handleToggleProof = useCallback((proofId: string) => {
    setModel((prev) => toggleProofState(prev, proofId));
  }, []);

  const handleAddMember = useCallback(() => {
    setModel((prev) => assignTeamPlaceholder(prev));
  }, []);

  const handleLayerAction = useCallback(async (action: LayerAction) => {
    setActiveLayerAction(action);
    setLayerActionError(null);
    try {
      const next = await runLayerAction(action, layers);
      setLayers(next);
    } catch {
      setLayerActionError(`Layer action failed: ${action}`);
    } finally {
      setActiveLayerAction(null);
    }
  }, [layers]);

  const clearLayerActionError = useCallback(() => {
    setLayerActionError(null);
  }, []);

  const summary = useMemo(() => {
    const doneTasks = model.tasks.filter((task) => task.done).length;
    const doneProof = model.proof.filter((item) => item.completed).length;
    return {
      doneTasks,
      totalTasks: model.tasks.length,
      doneProof,
      totalProof: model.proof.length,
    };
  }, [model.tasks, model.proof]);

  return {
    model,
    layers,
    summary,
    activeLayerAction,
    layerActionError,
    handleToggleTask,
    handleToggleProof,
    handleAddMember,
    updateMissionStatus,
    handleLayerAction,
    clearLayerActionError,
  };
}
