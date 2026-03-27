import React from 'react';
import { SECTOR_HERO_ASSET, type SectorDefinition, type SectorKey } from './sectorDefinitions';

interface SectorGatewayGridProps {
  sectors: SectorDefinition[];
  activeSector: SectorKey;
  onSelectSector: (sector: SectorKey) => void;
}

const SectorGatewayGrid: React.FC<SectorGatewayGridProps> = ({ sectors, activeSector, onSelectSector }) => {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-4 md:p-6">
      <h2 className="text-sm font-black uppercase tracking-[0.28em] text-zinc-300 mb-4">Sector Gateways</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {sectors.map((sector) => {
          const isActive = sector.key === activeSector;
          const heroSrc = SECTOR_HERO_ASSET[sector.key];
          return (
            <button
              key={sector.key}
              type="button"
              onClick={() => onSelectSector(sector.key)}
              className={`relative overflow-hidden text-left rounded-3xl border min-h-[200px] transition-all ${isActive ? 'border-cyan-500 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border-zinc-700 hover:border-zinc-500'}`}
            >
              <img
                src={heroSrc}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-100 saturate-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/15" />
              <div
                className={`relative z-10 p-5 ${isActive ? 'ring-1 ring-inset ring-cyan-400/35 rounded-3xl' : ''}`}
              >
                <div className="text-3xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">{sector.emoji}</div>
                <div className="mt-3 text-base font-black uppercase tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {sector.label}
                </div>
                <div className="mt-2 text-xs text-zinc-200/95 leading-relaxed line-clamp-3">{sector.subtitle}</div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300">
                  {sector.categories.length} mapped categories
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SectorGatewayGrid;
