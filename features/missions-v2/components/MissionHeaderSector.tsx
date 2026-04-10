import React from 'react';
import type { MissionIdentity } from '../types';

interface MissionHeaderSectorProps {
  identity: MissionIdentity;
}

const MissionHeaderSector: React.FC<MissionHeaderSectorProps> = ({ identity }) => {
  return (
    <header className="rounded-t-xl border border-blue-700 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 px-5 py-4 text-white">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400 text-sm font-black text-blue-900">
          ◆
        </div>
        <div className="min-w-0">
          <p className="text-4xl font-black tracking-wide">DPAL</p>
          <h1 className="text-4xl font-bold leading-tight">Mission Assignment</h1>
          <p className="text-xl text-blue-100">Organize, Assign &amp; Complete Missions</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded bg-blue-900/50 px-2 py-1">#{identity.id}</span>
        <span className="rounded bg-blue-900/50 px-2 py-1">{identity.missionType}</span>
        <span className="rounded bg-blue-900/50 px-2 py-1">{identity.category}</span>
        <span className="rounded bg-emerald-700/70 px-2 py-1">{identity.status}</span>
      </div>
    </header>
  );
};

export default MissionHeaderSector;
