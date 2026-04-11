import React, { useEffect, useState } from 'react';
import type { MissionAssignmentV2Model } from '../types';
import { loadMissionAssignmentV2 } from '../services/adapters';
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

interface MissionAssignmentV2PageProps {
  onReturn: () => void;
  sourceReport?: Report | null;
}

const MissionAssignmentV2Page: React.FC<MissionAssignmentV2PageProps> = ({ onReturn, sourceReport }) => {
  const [initialModel, setInitialModel] = useState<MissionAssignmentV2Model | null>(null);
  /** Bumps on each successful load so the board remounts when re-opening the same report. */
  const [loadGeneration, setLoadGeneration] = useState(0);

  useEffect(() => {
    let mounted = true;
    loadMissionAssignmentV2(sourceReport).then((data) => {
      if (mounted) {
        setInitialModel(data);
        setLoadGeneration((g) => g + 1);
      }
    });
    return () => {
      mounted = false;
    };
  }, [sourceReport]);

  if (!initialModel) {
    return <div className="py-10 text-center text-zinc-400">Loading mission workspace...</div>;
  }

  // Remount on report id + load generation so workspace state never survives a different report
  // or a fresh load of the same report (aligns with persisted layerExecution + model).
  return (
    <MissionAssignmentV2Board
      key={`${initialModel.report.reportId}-${loadGeneration}`}
      onReturn={onReturn}
      initialModel={initialModel}
    />
  );
};

interface MissionAssignmentV2BoardProps {
  onReturn: () => void;
  initialModel: MissionAssignmentV2Model;
}

const MissionAssignmentV2Board: React.FC<MissionAssignmentV2BoardProps> = ({ onReturn, initialModel }) => {
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
  } = useMissionWorkspaceV2(initialModel);

  return (
    <div className="mx-auto max-w-[1220px] space-y-3 pb-24 text-slate-800">
      <button
        type="button"
        onClick={onReturn}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
      >
        Back
      </button>

      <MissionHeaderSector identity={model.identity} />
      <div className="rounded-b-xl border border-t-0 border-slate-300 bg-slate-200 p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-6">
            <ReportOverviewSector report={model.report} />
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <AssignedTeamSector
                team={model.team}
                onUpdateMember={handleUpdateMember}
                onDeleteMember={handleDeleteMember}
                onSendPrivateMessage={handleSendPrivateMessage}
              />
              <ProgressStatusSector progress={model.progress} onAddMember={handleAddMember} />
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <EscrowConditionsSector conditions={model.escrowConditions} />
          </div>
          <div className="lg:col-span-4">
            <PrimaryActionSector missionStatus={model.identity.status} onMissionStatusChange={updateMissionStatus} />
          </div>
          <div className="lg:col-span-4">
            <ProofCompletionSector proof={model.proof} onToggleProof={handleToggleProof} />
          </div>
        </div>

        <div className="mt-3 rounded-md border border-slate-300 bg-white p-2 text-center text-xs text-slate-600">
          Tasks: {summary.doneTasks}/{summary.totalTasks} · Proof: {summary.doneProof}/{summary.totalProof}
        </div>

        <div className="mt-2 rounded-md border border-slate-300 bg-white p-2 text-center text-xs text-slate-600">
          {workspaceSaveStatus === 'saving' && 'Saving mission workspace...'}
          {workspaceSaveStatus === 'saved_server' && 'Mission workspace saved to server.'}
          {workspaceSaveStatus === 'saved_local' && 'Server unavailable: mission workspace saved locally on this device.'}
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
  );
};

export default MissionAssignmentV2Page;
