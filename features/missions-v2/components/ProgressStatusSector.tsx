import React from 'react';
import type { MissionProgress } from '../types';
import { mw } from '../missionWorkspaceTheme';
import SectorCard from './SectorCard';

interface ProgressStatusSectorProps {
  progress: MissionProgress;
  onAddMember: () => void;
}

const ProgressStatusSector: React.FC<ProgressStatusSectorProps> = ({ progress, onAddMember }) => {
  return (
    <SectorCard title="Mission Progress">
      <div className={`space-y-3 text-sm ${mw.textBody}`}>
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-teal-500/90">
          {progress.statusLabel}
        </p>
        <div className="h-5 w-full rounded-md border border-teal-900/60 bg-teal-950/80 p-0.5">
          <div
            className="h-full rounded bg-gradient-to-r from-teal-700 to-teal-500 shadow-[0_0_8px_rgba(13,148,136,0.4)]"
            style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }}
          />
        </div>
        <p className="text-center font-semibold text-teal-100/90">{progress.percent}% Completed</p>
        <button type="button" onClick={onAddMember} className={`${mw.btnPrimary} w-full py-2.5`}>
          Add Member +
        </button>
      </div>
    </SectorCard>
  );
};

export default ProgressStatusSector;
