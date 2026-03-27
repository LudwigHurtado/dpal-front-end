import React from 'react';
import type { CategoryMappingRow, SectorDefinition, SectorKey } from './sectorDefinitions';
import { ArrowRight } from '../icons';

interface CategoryMappingPanelProps {
  rows: CategoryMappingRow[];
  sectors: SectorDefinition[];
  getClassicLabel: (row: CategoryMappingRow) => string;
}

const sectorLabelByKey = (sectors: SectorDefinition[]): Record<SectorKey, string> => {
  return sectors.reduce((acc, sector) => {
    acc[sector.key] = `${sector.emoji} ${sector.label}`;
    return acc;
  }, {} as Record<SectorKey, string>);
};

const CategoryMappingPanel: React.FC<CategoryMappingPanelProps> = ({ rows, sectors, getClassicLabel }) => {
  const labelBySector = sectorLabelByKey(sectors);

  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.28em] text-zinc-300">Compatibility Layer</h2>
          <p className="mt-2 text-xs text-zinc-500 uppercase tracking-[0.2em]">
            classic category {"->"} sector route {"->"} next category
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 md:gap-3 px-4 py-3 bg-zinc-950/70 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
          <span>Classic Category</span>
          <span className="hidden md:block" />
          <span>Sector</span>
          <span className="hidden md:block" />
          <span>Next Category</span>
        </div>
        {rows.map((row) => (
          <div
            key={`${row.classicCategory}-${row.nextCategory}`}
            className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 md:gap-3 px-4 py-3 border-t border-zinc-800 text-sm text-zinc-200 bg-zinc-900/40"
          >
            <span>{getClassicLabel(row)}</span>
            <span className="hidden md:inline-flex items-center text-zinc-500">
              <ArrowRight className="w-4 h-4" />
            </span>
            <span className="text-cyan-300">{labelBySector[row.sector]}</span>
            <span className="hidden md:inline-flex items-center text-zinc-500">
              <ArrowRight className="w-4 h-4" />
            </span>
            <span>{row.nextCategory}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryMappingPanel;
