import React from 'react';
import SectorCard from './SectorCard';
import { mw } from '../missionWorkspaceTheme';
import type { MissionLifecycleStatus } from '../types';

interface PrimaryActionSectorProps {
  missionStatus: MissionLifecycleStatus;
  onMissionStatusChange: (status: MissionLifecycleStatus) => void;
}

const smallBtn = 'rounded-lg border px-2 py-1 text-xs font-semibold transition';

const PrimaryActionSector: React.FC<PrimaryActionSectorProps> = ({ missionStatus, onMissionStatusChange }) => {
  return (
    <SectorCard title="Mission Actions">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onMissionStatusChange('active')}
          className="w-full rounded-xl bg-gradient-to-b from-teal-600 to-teal-800 px-4 py-3 text-2xl font-bold text-teal-50 shadow-[0_0_28px_rgba(13,148,136,0.35)] transition hover:from-teal-500 hover:to-teal-700"
        >
          Start Mission
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onMissionStatusChange('paused')}
            className={`${smallBtn} border-amber-700/50 bg-amber-950/40 text-amber-200 hover:bg-amber-950/70`}
          >
            Pause
          </button>
          <button
            type="button"
            onClick={() => onMissionStatusChange('active')}
            className={`${smallBtn} border-teal-700/50 bg-teal-950/60 text-teal-100 hover:bg-teal-900/80`}
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => onMissionStatusChange('cancelled')}
            className={`${smallBtn} border-rose-800/50 bg-rose-950/40 text-rose-200 hover:bg-rose-950/70`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onMissionStatusChange('completed')}
            className={`${smallBtn} border-emerald-700/50 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-950/80`}
          >
            Complete
          </button>
        </div>
        <p className="text-center text-xs text-teal-600/90">
          View Instructions
          <span className="ml-1">▼</span>
        </p>
        <p className={`text-center ${mw.textMuted}`}>Current state: {missionStatus}</p>
      </div>
    </SectorCard>
  );
};

export default PrimaryActionSector;
