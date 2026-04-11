import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LAYER_EXECUTION_STATE,
  layerEscrowDisplayFromRecord,
  type LayerAction,
  type LayerExecutionState,
  type MissionAssignmentV2Model,
  type MissionLifecycleStatus,
} from '../types';
import { generateMissionTaskList } from '../../../services/geminiService';
import { saveMissionWorkspaceV2 } from '../services/missionWorkspaceService';
import {
  buildDefaultEscrow,
  getLeadMember,
  getVerifierMember,
  isMissionReadyForRelease,
} from '../services/missionEscrowHelpers';
import {
  applyMissionState,
  assignTeamPlaceholder,
  recalculateMissionProgress,
  toggleObjectiveItemState,
  toggleProofState,
  toggleTaskState,
} from '../services/layerServices';
import { runLayerAction } from '../services/layers/layerActionRunner';

function layersFromModel(model: MissionAssignmentV2Model): LayerExecutionState {
  const base = model.layerExecution ?? DEFAULT_LAYER_EXECUTION_STATE;
  return {
    ...base,
    escrow: layerEscrowDisplayFromRecord(model.escrow),
    mission: model.identity.status,
  };
}

/** Parent should remount when `reportId` (or workspace load) changes — see MissionAssignmentV2Page board `key`. */
export function useMissionWorkspaceV2(initialModel: MissionAssignmentV2Model) {
  const [model, setModel] = useState<MissionAssignmentV2Model>(initialModel);
  const [layers, setLayers] = useState<LayerExecutionState>(() => layersFromModel(initialModel));
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
    setModel((prev) => toggleObjectiveItemState(prev, phaseId, itemId));
  }, []);

  const handleAddObjectiveItemImage = useCallback((phaseId: string, itemId: string, imageDataUrl: string) => {
    if (!imageDataUrl) return;
    setModel((prev) => {
      const next: MissionAssignmentV2Model = {
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
      };
      return recalculateMissionProgress(next);
    });
  }, []);

  const handleRewardSelection = useCallback((rewardType: 'Coins' | 'Tokens' | 'HC' | 'None', rewardAmount: number) => {
    const amount = rewardType === 'None' ? 0 : rewardAmount;
    const nextEscrow = buildDefaultEscrow(rewardType, amount);
    setModel((prev) =>
      recalculateMissionProgress({
        ...prev,
        details: {
          ...prev.details,
          rewardType,
          rewardAmount: amount,
          rewardLabel:
            rewardType === 'None'
              ? 'No monetary reward'
              : `${amount.toLocaleString()} ${rewardType} + Escrow Release`,
        },
        escrow: nextEscrow,
      }),
    );
    setLayers((prev) => ({ ...prev, escrow: layerEscrowDisplayFromRecord(nextEscrow) }));
  }, []);

  const handleLockEscrow = useCallback(() => {
    setModel((prev) => {
      if (!prev.escrow.enabled) return prev;
      if (prev.escrow.status !== 'pending_funding') return prev;
      const lead = getLeadMember(prev);
      return recalculateMissionProgress({
        ...prev,
        escrow: {
          ...prev.escrow,
          status: 'locked',
          lockedAt: new Date().toISOString(),
          lockedBy: lead?.name || 'Lead',
        },
      });
    });
    setLayers((prev) => ({ ...prev, escrow: 'locked' }));
  }, []);

  const handleRequestEscrowRelease = useCallback(() => {
    setModel((prev) => {
      if (!prev.escrow.enabled) return prev;
      if (prev.escrow.status !== 'locked') return prev;
      if (layers.validation !== 'approved') return prev;
      if (!isMissionReadyForRelease(prev)) return prev;

      const lead = getLeadMember(prev);
      return recalculateMissionProgress({
        ...prev,
        escrow: {
          ...prev.escrow,
          status: 'release_requested',
          releaseRequestedAt: new Date().toISOString(),
          releaseRequestedBy: lead?.name || 'Lead',
        },
      });
    });
    setLayers((prev) => ({ ...prev, escrow: 'release_requested' }));
  }, [layers.validation]);

  const handleApproveEscrowRelease = useCallback(() => {
    setModel((prev) => {
      if (!prev.escrow.enabled) return prev;
      if (prev.escrow.status !== 'release_requested') return prev;

      const verifier = getVerifierMember(prev);
      if (!verifier) return prev;

      return recalculateMissionProgress({
        ...prev,
        escrow: {
          ...prev.escrow,
          status: 'released',
          approvedAt: new Date().toISOString(),
          approvedBy: verifier.name,
        },
      });
    });
    setLayers((prev) => ({ ...prev, escrow: 'released' }));
  }, []);

  const handleDisputeEscrow = useCallback((reason: string) => {
    const cleaned = reason.trim();
    if (!cleaned) return;

    setModel((prev) => {
      if (!prev.escrow.enabled) return prev;
      if (prev.escrow.status !== 'release_requested') return prev;
      const verifier = getVerifierMember(prev);
      if (!verifier) return prev;

      return recalculateMissionProgress({
        ...prev,
        escrow: {
          ...prev.escrow,
          status: 'disputed',
          disputeReason: cleaned,
          disputedAt: new Date().toISOString(),
          disputedBy: verifier.name,
        },
      });
    });
    setLayers((prev) => ({ ...prev, escrow: 'disputed' }));
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
      /** Explicit server push — auto-save may fail on payload size; Sync Report retries with slimmer payloads in `saveMissionWorkspaceV2`. */
      if (action === 'syncReport') {
        const reportId = model.report.reportId;
        if (reportId) {
          setWorkspaceSaveStatus('saving');
          setWorkspaceSaveError(null);
          try {
            const source = await saveMissionWorkspaceV2(reportId, { ...model, layerExecution: next });
            if (source === 'server') {
              setWorkspaceSaveStatus('saved_server');
            } else if (source === 'local') {
              setWorkspaceSaveStatus('saved_local');
            } else {
              setWorkspaceSaveStatus('idle');
            }
          } catch (err: unknown) {
            setWorkspaceSaveStatus('error');
            setWorkspaceSaveError(err instanceof Error ? err.message : 'Could not save mission workspace.');
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : `Layer action failed: ${action}`;
      setLayerActionError(msg);
    } finally {
      setActiveLayerAction(null);
    }
  }, [layers, model]);

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
        const withTasks = {
          ...prev,
          tasks: nextTasks,
          progress: {
            ...prev.progress,
            timeline: ['AI generated mission task list', ...prev.progress.timeline].slice(0, 8),
          },
        };
        return recalculateMissionProgress(withTasks);
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
        const source = await saveMissionWorkspaceV2(reportId, { ...model, layerExecution: layers });
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
  }, [model, layers]);

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
    handleLockEscrow,
    handleRequestEscrowRelease,
    handleApproveEscrowRelease,
    handleDisputeEscrow,
    isMissionReadyForRelease,
  };
}
