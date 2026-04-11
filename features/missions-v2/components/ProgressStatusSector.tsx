import React from 'react';
import type { MissionProgress } from '../types';
import SectorCard from './SectorCard';

interface ProgressStatusSectorProps {
  progress: MissionProgress;
  onAddMember: () => void;
}

const ProgressStatusSector: React.FC<ProgressStatusSectorProps> = ({ progress, onAddMember }) => {
  return (
    <SectorCard title="Mission Progress">
      <div className="space-y-3 text-sm text-slate-700">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
          {progress.statusLabel}
        </p>
        <button type="button" className="w-full rounded-md bg-emerald-500 px-3 py-2 font-semibold text-white">
          + In Progress
        </button>
        <div className="h-5 w-full rounded-md border border-slate-300 bg-white p-0.5">
          <div className="h-full rounded bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }} />
        </div>
        <p className="text-center font-semibold text-slate-700">{progress.percent}% Completed</p>
        <button type="button" onClick={onAddMember} className="w-full rounded-md bg-blue-600 px-3 py-2 font-semibold text-white">
          Add Member +
        </button>
      </div>
    </SectorCard>
  );
};

export default ProgressStatusSector;
