import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayerAction, LayerExecutionState, MissionAssignmentV2Model, MissionLifecycleStatus } from '../types';
import { generateMissionTaskList } from '../../../services/geminiService';
import { saveMissionWorkspaceV2 } from '../services/missionWorkspaceService';
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
  const [isAiGeneratingTasks, setIsAiGeneratingTasks] = useState(false);
  const [aiTaskError, setAiTaskError] = useState<string | null>(null);
  const [workspaceSaveStatus, setWorkspaceSaveStatus] = useState<'idle' | 'saving' | 'saved_server' | 'saved_local' | 'error'>('idle');
  const [workspaceSaveError, setWorkspaceSaveError] = useState<string | null>(null);
  const isFirstPersistRef = useRef(true);

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

  const handleUpdateMember = useCallback((memberId: string, updates: { name: string; profile: string }) => {
    setModel((prev) => ({
      ...prev,
      team: prev.team.map((member) => (
        member.id === memberId
          ? { ...member, name: updates.name.trim() || member.name, profile: updates.profile.trim() || member.profile }
          : member
      )),
    }));
  }, []);

  const handleDeleteMember = useCallback((memberId: string) => {
    setModel((prev) => ({
      ...prev,
      team: prev.team.filter((member) => member.id !== memberId),
    }));
  }, []);

  const handleToggleObjectiveItem = useCallback((phaseId: string, itemId: string) => {
    setModel((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        objectivePhases: prev.details.objectivePhases.map((phase) => (
          phase.id !== phaseId
            ? phase
            : {
                ...phase,
                items: phase.items.map((item) => (
                  item.id === itemId ? { ...item, done: !item.done } : item
                )),
              }
        )),
      },
    }));
  }, []);

  const handleAddObjectiveItemImage = useCallback((phaseId: string, itemId: string, imageDataUrl: string) => {
    if (!imageDataUrl) return;
    setModel((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        objectivePhases: prev.details.objectivePhases.map((phase) => (
          phase.id !== phaseId
            ? phase
            : {
                ...phase,
                items: phase.items.map((item) => (
                  item.id === itemId
                    ? { ...item, images: [...item.images, imageDataUrl].slice(-6) }
                    : item
                )),
              }
        )),
      },
    }));
  }, []);

  const handleRewardSelection = useCallback((rewardType: 'Coins' | 'Tokens' | 'HC', rewardAmount: number) => {
    setModel((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        rewardType,
        rewardAmount,
        rewardLabel: `${rewardAmount.toLocaleString()} ${rewardType} + Escrow Release`,
      },
    }));
  }, []);

  const handleSendPrivateMessage = useCallback((memberId: string, message: string) => {
    const body = message.trim();
    if (!body) return;
    setModel((prev) => ({
      ...prev,
      team: prev.team.map((member) => (
        member.id === memberId
          ? {
              ...member,
              privateMessages: [
                ...(member.privateMessages ?? []),
                {
                  id: `pm-${Date.now()}`,
                  body,
                  sentAt: new Date().toISOString(),
                  from: 'Mission Control',
                },
              ],
            }
          : member
      )),
    }));
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

  const clearAiTaskError = useCallback(() => {
    setAiTaskError(null);
  }, []);

  const handleGenerateTasksWithAi = useCallback(async () => {
    setIsAiGeneratingTasks(true);
    setAiTaskError(null);
    try {
      const generated = await generateMissionTaskList({
        missionTitle: model.identity.title,
        missionType: model.identity.missionType,
        objective: model.details.objective,
        location: model.report.location,
        issueType: model.report.issueType,
        reportSnapshot: model.report.snapshot,
      });

      setModel((prev) => {
        const nextTasks = generated.map((task, idx) => ({
          id: `ai-task-${Date.now()}-${idx}`,
          title: task.title,
          proofRequired: task.proofRequired,
          done: false,
        }));
        return {
          ...prev,
          tasks: nextTasks,
          progress: {
            ...prev.progress,
            percent: 0,
            timeline: ['AI generated mission task list', ...prev.progress.timeline].slice(0, 8),
          },
        };
      });
    } catch (error: any) {
      setAiTaskError(error?.message || 'AI could not generate tasks right now.');
    } finally {
      setIsAiGeneratingTasks(false);
    }
  }, [model]);

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

  useEffect(() => {
    const reportId = model.report.reportId;
    if (!reportId) return;

    // Avoid immediately re-saving right after initial load/hydration.
    if (isFirstPersistRef.current) {
      isFirstPersistRef.current = false;
      return;
    }

    const timer = window.setTimeout(async () => {
      setWorkspaceSaveStatus('saving');
      setWorkspaceSaveError(null);
      try {
        const source = await saveMissionWorkspaceV2(reportId, model);
        if (source === 'server') {
          setWorkspaceSaveStatus('saved_server');
        } else if (source === 'local') {
          setWorkspaceSaveStatus('saved_local');
        } else {
          setWorkspaceSaveStatus('idle');
        }
      } catch (error: any) {
        setWorkspaceSaveStatus('error');
        setWorkspaceSaveError(error?.message || 'Could not save mission workspace.');
      }
    }, 550);

    return () => window.clearTimeout(timer);
  }, [model]);

  return {
    model,
    layers,
    summary,
    activeLayerAction,
    layerActionError,
    isAiGeneratingTasks,
    aiTaskError,
    workspaceSaveStatus,
    workspaceSaveError,
    handleToggleTask,
    handleToggleProof,
    handleAddMember,
    handleUpdateMember,
    handleDeleteMember,
    handleSendPrivateMessage,
    handleGenerateTasksWithAi,
    handleToggleObjectiveItem,
    handleAddObjectiveItemImage,
    handleRewardSelection,
    updateMissionStatus,
    handleLayerAction,
    clearLayerActionError,
    clearAiTaskError,
  };
}
