import React from 'react';
import type { MissionProgress } from '../types';
import SectorCard from './SectorCard';

interface ProgressStatusSectorProps {
  progress: MissionProgress;
  onAddMember: () => void;
}

const ProgressStatusSector: React.FC<ProgressStatusSectorProps> = ({ progress, onAddMember }) => {
  return (
    <SectorCard title="Progress & Status Sector" subtitle="Live mission progress, status, and quick actions">
      <div className="space-y-3 text-xs text-zinc-300">
        <p><span className="text-zinc-500">Status:</span> {progress.statusLabel}</p>
        <div className="h-2 w-full rounded-full bg-zinc-800">
          <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }} />
        </div>
        <p>{progress.percent}% complete</p>
        <ul className="list-disc space-y-1 pl-4 text-zinc-400">
          {progress.timeline.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button type="button" onClick={onAddMember} className="rounded-lg bg-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-100">
          Add Member (mock)
        </button>
      </div>
    </SectorCard>
  );
};

export default ProgressStatusSector;
