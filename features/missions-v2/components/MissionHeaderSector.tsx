import React from 'react';
import type { MissionIdentity } from '../types';

interface MissionHeaderSectorProps {
  identity: MissionIdentity;
}

const MissionHeaderSector: React.FC<MissionHeaderSectorProps> = ({ identity }) => {
  return (
    <header className="rounded-2xl border border-cyan-800/60 bg-cyan-950/40 p-5 md:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">DPAL Mission Workspace</p>
      <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">{identity.title}</h1>
      <p className="mt-1 text-sm text-zinc-300">{identity.subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-100">ID: {identity.id}</span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-100">{identity.missionType}</span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-100">{identity.category}</span>
        <span className="rounded-full bg-amber-700/80 px-3 py-1 font-semibold text-amber-50">
          Urgency: {identity.urgency}
        </span>
        <span className="rounded-full bg-emerald-700/80 px-3 py-1 font-semibold text-emerald-50">
          Status: {identity.status}
        </span>
      </div>
    </header>
  );
};

export default MissionHeaderSector;
