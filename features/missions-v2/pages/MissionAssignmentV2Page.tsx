import React, { useEffect, useState } from 'react';
import type { MissionAssignmentV2Model } from '../types';
import { loadMissionAssignmentV2 } from '../services/adapters';
import { useMissionWorkspaceV2 } from '../hooks/useMissionWorkspaceV2';
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
}

const MissionAssignmentV2Page: React.FC<MissionAssignmentV2PageProps> = ({ onReturn }) => {
  const [initialModel, setInitialModel] = useState<MissionAssignmentV2Model | null>(null);

  useEffect(() => {
    let mounted = true;
    loadMissionAssignmentV2().then((data) => {
      if (mounted) setInitialModel(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!initialModel) {
    return <div className="py-10 text-center text-zinc-400">Loading mission workspace...</div>;
  }

  return <MissionAssignmentV2Board onReturn={onReturn} initialModel={initialModel} />;
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
    handleToggleTask,
    handleToggleProof,
    handleAddMember,
    updateMissionStatus,
    handleLayerAction,
    clearLayerActionError,
  } = useMissionWorkspaceV2(initialModel);

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-24 text-white">
      <button
        type="button"
        onClick={onReturn}
        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-900"
      >
        Back
      </button>

      <MissionHeaderSector identity={model.identity} />
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300">
        Tasks: {summary.doneTasks}/{summary.totalTasks} · Proof: {summary.doneProof}/{summary.totalProof}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-6">
          <ReportOverviewSector report={model.report} />
          <TaskListSector tasks={model.tasks} onToggleTask={handleToggleTask} />
          <EscrowConditionsSector conditions={model.escrowConditions} />
          <PlatformLayersSector
            layers={layers}
            activeAction={activeLayerAction}
            error={layerActionError}
            onAction={handleLayerAction}
            onDismissError={clearLayerActionError}
          />
        </div>

        <div className="space-y-4 lg:col-span-6">
          <MissionDetailsSector details={model.details} />
          <AssignedTeamSector team={model.team} />
          <ProgressStatusSector progress={model.progress} onAddMember={handleAddMember} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <PrimaryActionSector missionStatus={model.identity.status} onMissionStatusChange={updateMissionStatus} />
        </div>
        <div className="lg:col-span-6">
          <ProofCompletionSector proof={model.proof} onToggleProof={handleToggleProof} />
        </div>
      </div>
    </div>
  );
};

export default MissionAssignmentV2Page;
