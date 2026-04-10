import React from 'react';
import SectorCard from './SectorCard';
import type { MissionLifecycleStatus } from '../types';

interface PrimaryActionSectorProps {
  missionStatus: MissionLifecycleStatus;
  onMissionStatusChange: (status: MissionLifecycleStatus) => void;
}

const PrimaryActionSector: React.FC<PrimaryActionSectorProps> = ({ missionStatus, onMissionStatusChange }) => {
  return (
    <SectorCard title="Primary Action Sector" subtitle="Mission workflow controls and SOP access">
      <p className="mb-2 text-xs text-zinc-300">Current mission state: {missionStatus}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onMissionStatusChange('active')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-50">Start Mission</button>
        <button type="button" onClick={() => onMissionStatusChange('paused')} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-amber-50">Pause</button>
        <button type="button" onClick={() => onMissionStatusChange('active')} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-cyan-50">Resume</button>
        <button type="button" onClick={() => onMissionStatusChange('cancelled')} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-rose-50">Cancel</button>
        <button type="button" onClick={() => onMissionStatusChange('completed')} className="rounded-lg bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100">Mark Complete</button>
      </div>
    </SectorCard>
  );
};

export default PrimaryActionSector;
