import React from 'react';
import type { MissionIdentity } from '../types';

interface MissionHeaderSectorProps {
  identity: MissionIdentity;
  /** Short label for mission source (report vs user vs AI). */
  sourceLabel?: string;
}

const chipBase =
  'rounded-md border px-2 py-1 text-[11px] font-semibold backdrop-blur-sm';

const MissionHeaderSector: React.FC<MissionHeaderSectorProps> = ({ identity, sourceLabel }) => {
  return (
    <header className="rounded-t-xl border border-teal-700/50 bg-gradient-to-br from-teal-950 via-teal-900 to-teal-950 px-5 py-4 text-teal-50 shadow-[0_0_40px_rgba(13,148,136,0.15)]">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-teal-500/40 bg-teal-950/80 text-sm font-black text-teal-200 shadow-[0_0_12px_rgba(45,212,191,0.25)]">
          ◆
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-black tracking-wide text-teal-100/95 sm:text-4xl">DPAL</p>
          <h1 className="text-2xl font-bold leading-tight text-white sm:text-4xl">Mission Assignment</h1>
          <p className="mt-1 text-base text-teal-200/85 sm:text-xl">Organize, Assign &amp; Complete Missions</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        {sourceLabel ? (
          <span className={`${chipBase} border-teal-500/45 bg-teal-950/70 text-teal-100`}>{sourceLabel}</span>
        ) : null}
        <span className={`${chipBase} border-teal-800/60 bg-teal-950/60 text-teal-200`}>#{identity.id}</span>
        <span className={`${chipBase} border-teal-800/60 bg-teal-950/60 text-teal-200`}>{identity.missionType}</span>
        <span className={`${chipBase} border-teal-800/60 bg-teal-950/60 text-teal-200`}>{identity.category}</span>
        <span className={`${chipBase} border-emerald-700/50 bg-emerald-950/50 text-emerald-200`}>{identity.status}</span>
      </div>
    </header>
  );
};

export default MissionHeaderSector;
