import React from 'react';
import type { SectorDefinition } from './sectorDefinitions';

interface SectorHeroBannerProps {
  sector: SectorDefinition;
  imageSrc: string;
}

const SectorHeroBanner: React.FC<SectorHeroBannerProps> = ({ sector, imageSrc }) => {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-zinc-800 min-h-[220px]">
      <img
        src={imageSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
      <div className="relative p-6 md:p-8">
        <p className="text-[10px] font-black tracking-[0.28em] uppercase text-cyan-300">Next View Active</p>
        <h2 className="mt-3 text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
          {sector.emoji} {sector.label}
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300">{sector.subtitle}</p>
        <p className="mt-4 text-[10px] font-black tracking-[0.22em] uppercase text-zinc-400">
          Select a category below to continue into the shared report engine
        </p>
      </div>
    </div>
  );
};

export default SectorHeroBanner;
