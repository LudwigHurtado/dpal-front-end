import React from 'react';
import type { SectorDefinition, SectorKey } from './sectorDefinitions';

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
          return (
            <button
              key={sector.key}
              type="button"
              onClick={() => onSelectSector(sector.key)}
              className={`text-left rounded-3xl border p-5 transition-all ${isActive ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-500'}`}
            >
              <div className="text-3xl">{sector.emoji}</div>
              <div className="mt-3 text-base font-black uppercase tracking-wider">{sector.label}</div>
              <div className="mt-2 text-xs text-zinc-400 leading-relaxed">{sector.subtitle}</div>
              <div className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                {sector.categories.length} mapped categories
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SectorGatewayGrid;
