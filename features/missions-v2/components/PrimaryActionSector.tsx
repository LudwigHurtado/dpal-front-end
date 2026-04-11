import React from 'react';
import SectorCard from './SectorCard';
import type { MissionLifecycleStatus } from '../types';

interface PrimaryActionSectorProps {
  missionStatus: MissionLifecycleStatus;
  onMissionStatusChange: (status: MissionLifecycleStatus) => void;
}

const PrimaryActionSector: React.FC<PrimaryActionSectorProps> = ({ missionStatus, onMissionStatusChange }) => {
  return (
    <SectorCard title="Mission Actions">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onMissionStatusChange('active')}
          className="w-full rounded-md bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-3 text-2xl font-bold text-white"
        >
          Start Mission
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onMissionStatusChange('paused')} className="rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-white">Pause</button>
          <button type="button" onClick={() => onMissionStatusChange('active')} className="rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white">Resume</button>
          <button type="button" onClick={() => onMissionStatusChange('cancelled')} className="rounded bg-rose-500 px-2 py-1 text-xs font-semibold text-white">Cancel</button>
          <button type="button" onClick={() => onMissionStatusChange('completed')} className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">Complete</button>
        </div>
        <p className="text-center text-xs text-slate-600">
          View Instructions
          <span className="ml-1">▼</span>
        </p>
        <p className="text-center text-[11px] text-slate-500">Current state: {missionStatus}</p>
      </div>
    </SectorCard>
  );
};

export default PrimaryActionSector;
