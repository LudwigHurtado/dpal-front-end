import React, { useEffect, useState } from 'react';
import type { MissionAssignmentV2Model, MissionSourceType } from '../types';
import { hydrateMissionWorkspaceWithPersistence, loadMissionAssignmentV2 } from '../services/adapters';
import { useMissionWorkspaceV2 } from '../hooks/useMissionWorkspaceV2';
import type { Report } from '../../../types';
import MissionHeaderSector from '../components/MissionHeaderSector';
import ReportOverviewSector from '../components/ReportOverviewSector';
import MissionDetailsSector from '../components/MissionDetailsSector';
import TaskListSector from '../components/TaskListSector';
import AssignedTeamSector from '../components/AssignedTeamSector';
import ProgressStatusSector from '../components/ProgressStatusSector';
import EscrowConditionsSector from '../components/EscrowConditionsSector';
import PrimaryActionSector from '../components/PrimaryActionSector';
import ProofCompletionSector from '../components/ProofCompletionSector';
import PlatformLayersSector from '../components/PlatformLayersSector';
import { mw } from '../missionWorkspaceTheme';

function missionSourceLabel(source: MissionSourceType): string {
  switch (source) {
    case 'report_derived':
      return 'Report mission';
    case 'user_created':
      return 'User-created';
    case 'ai_suggested':
      return 'AI-suggested';
    default:
      return 'Mission';
  }
}

interface MissionAssignmentV2PageProps {
  onReturn: () => void;
  /** Same as main menu / header — updates App view + URL together (avoids URL/view flicker). */
  onOpenCreateMission: () => void;
  sourceReport?: Report | null;
  /** When set (e.g. after Create Mission), load merges persisted workspace for this id — same V2 board as report-driven. */
  prefetchedModel?: MissionAssignmentV2Model | null;
}

const MissionAssignmentV2Page: React.FC<MissionAssignmentV2PageProps> = ({
  onReturn,
  onOpenCreateMission,
  sourceReport,
  prefetchedModel,
}) => {
  const [initialModel, setInitialModel] = useState<MissionAssignmentV2Model | null>(null);
  /** Bumps on each successful load so the board remounts when re-opening the same report. */
  const [loadGeneration, setLoadGeneration] = useState(0);

  const prefetchKey = prefetchedModel?.report.reportId ?? '';
  const sourceReportId = sourceReport?.id ?? '';

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (prefetchedModel) {
        const data = await hydrateMissionWorkspaceWithPersistence(prefetchedModel);
        if (mounted) {
          setInitialModel(data);
          setLoadGeneration((g) => g + 1);
        }
        return;
      }
      const data = await loadMissionAssignmentV2(sourceReport ?? null);
      if (mounted) {
        setInitialModel(data);
        setLoadGeneration((g) => g + 1);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sourceReportId, prefetchKey, prefetchedModel]);

  if (!initialModel) {
    return (
      <div className={`${mw.shell} py-16 text-center text-teal-300/90`}>Loading mission workspace...</div>
    );
  }

  // Remount on report id + load generation so workspace state never survives a different report
  // or a fresh load of the same report (aligns with persisted layerExecution + model).
  return (
    <MissionAssignmentV2Board
      key={`${initialModel.report.reportId}-${loadGeneration}`}
      onReturn={onReturn}
      onOpenCreateMission={onOpenCreateMission}
      initialModel={initialModel}
      sourceLabel={missionSourceLabel(initialModel.community.sourceType)}
    />
  );
};

interface MissionAssignmentV2BoardProps {
  onReturn: () => void;
  onOpenCreateMission: () => void;
  initialModel: MissionAssignmentV2Model;
  sourceLabel: string;
}

const MissionAssignmentV2Board: React.FC<MissionAssignmentV2BoardProps> = ({
  onReturn,
  onOpenCreateMission,
  initialModel,
  sourceLabel,
}) => {
  const {
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
  } = useMissionWorkspaceV2(initialModel);

  const hasVerifier = model.team.some((m) => m.role === 'Verifier');

  return (
    <div className={mw.shell}>
      <div className={mw.page}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onReturn} className={mw.btnGhost}>
          Back
        </button>
        <button type="button" onClick={onOpenCreateMission} className={mw.btnPrimary}>
          Create mission
        </button>
      </div>

      <MissionHeaderSector identity={model.identity} sourceLabel={sourceLabel} />
      <div className={mw.panel}>
        {/* Row 1 — report context + progress & actions above the fold */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-6">
            <ReportOverviewSector report={model.report} />
          </div>
          <div className="space-y-3 lg:col-span-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ProgressStatusSector progress={model.progress} onAddMember={handleAddMember} />
              <PrimaryActionSector missionStatus={model.identity.status} onMissionStatusChange={updateMissionStatus} />
            </div>
          </div>
        </div>

        {/* Row 2 — tasks + mission details */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-6">
            <TaskListSector
              tasks={model.tasks}
              onToggleTask={handleToggleTask}
              onGenerateWithAi={handleGenerateTasksWithAi}
              isGeneratingWithAi={isAiGeneratingTasks}
              aiError={aiTaskError}
              onDismissAiError={clearAiTaskError}
            />
          </div>
          <div className="space-y-3 lg:col-span-6">
            <MissionDetailsSector
              missionType={model.identity.missionType}
              details={model.details}
              onToggleObjectiveItem={handleToggleObjectiveItem}
              onAddObjectiveItemImage={handleAddObjectiveItemImage}
              onRewardSelection={handleRewardSelection}
            />
          </div>
        </div>

        {/* Row 3 — team + proof */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <AssignedTeamSector
              team={model.team}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
              onSendPrivateMessage={handleSendPrivateMessage}
            />
          </div>
          <div className="lg:col-span-6">
            <ProofCompletionSector proof={model.proof} onToggleProof={handleToggleProof} />
          </div>
        </div>

        {/* Row 4 — escrow workflow */}
        <div className="mt-3">
          <EscrowConditionsSector
            conditions={model.escrowConditions}
            escrow={model.escrow}
            canLock={model.escrow.enabled && model.escrow.status === 'pending_funding'}
            canRequestRelease={
              model.escrow.enabled &&
              model.escrow.status === 'locked' &&
              layers.validation === 'approved' &&
              isMissionReadyForRelease(model)
            }
            canApproveRelease={
              model.escrow.enabled && model.escrow.status === 'release_requested' && hasVerifier
            }
            canDispute={model.escrow.enabled && model.escrow.status === 'release_requested' && hasVerifier}
            onLock={handleLockEscrow}
            onRequestRelease={handleRequestEscrowRelease}
            onApproveRelease={handleApproveEscrowRelease}
            onDispute={handleDisputeEscrow}
          />
        </div>

        <div className={`mt-3 ${mw.statusLine}`}>
          Tasks: {summary.doneTasks}/{summary.totalTasks} · Proof: {summary.doneProof}/{summary.totalProof}
        </div>

        <div className={`mt-2 ${mw.statusLine}`}>
          {workspaceSaveStatus === 'saving' && 'Saving mission workspace...'}
          {workspaceSaveStatus === 'saved_server' && 'Mission workspace saved to server.'}
          {workspaceSaveStatus === 'saved_local' &&
            'Could not sync to the server; a copy is saved on this device. Tap Sync Report (Service Layer) to retry.'}
          {workspaceSaveStatus === 'error' && `Save failed: ${workspaceSaveError || 'unknown error'}`}
          {workspaceSaveStatus === 'idle' && 'Mission workspace ready.'}
        </div>

        <div className="mt-3">
          <PlatformLayersSector
            layers={layers}
            activeAction={activeLayerAction}
            error={layerActionError}
            onAction={handleLayerAction}
            onDismissError={clearLayerActionError}
          />
        </div>
      </div>
      </div>
    </div>
  );
};

export default MissionAssignmentV2Page;
