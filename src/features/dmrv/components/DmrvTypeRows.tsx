import React from 'react';
import { ChevronRight } from '../../../../components/icons';
import type { DmrvType } from '../dmrvRegistry';

export type DmrvTypeRowsProps = {
  types: DmrvType[];
  selectedTypeId: string | null;
  accentColor: string;
  onSelectType: (typeId: string) => void;
};

export function DmrvTypeRows({
  types,
  selectedTypeId,
  accentColor,
  onSelectType,
}: DmrvTypeRowsProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">DMRV types</span>
        <span className="hidden flex-1 border-t border-dashed border-slate-300 sm:block" aria-hidden />
        <ChevronRight className="hidden h-3 w-3 text-slate-400 sm:block" aria-hidden />
        <span className="hidden text-[10px] font-bold uppercase text-slate-400 sm:block">Data inputs</span>
      </div>

      <ul className="space-y-2">
        {types.map((type, index) => {
          const active = type.id === selectedTypeId;
          return (
            <li key={type.id}>
              <button
                type="button"
                onClick={() => onSelectType(type.id)}
                className={`group flex w-full items-stretch overflow-hidden rounded-xl border text-left transition ${
                  active
                    ? 'border-slate-900 bg-white shadow-md ring-2 ring-slate-900/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <span
                  className="flex w-10 shrink-0 items-center justify-center text-xs font-black text-white"
                  style={{ backgroundColor: accentColor }}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 px-3 py-2.5">
                  <span className="block text-sm font-black text-[#1e3a5f]">{type.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-600">{type.description}</span>
                </span>
                <span className="flex items-center px-2 text-slate-400 group-hover:text-slate-600">
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
