import React from 'react';
import type { DmrvCategory } from '../dmrvRegistry';

export type DmrvSelectorPanelProps = {
  category: DmrvCategory;
  selectedTypeId: string | null;
  onSelectType: (typeId: string) => void;
};

/** Left infographic-style vertical selector (dial metaphor). */
export function DmrvSelectorPanel({
  category,
  selectedTypeId,
  onSelectType,
}: DmrvSelectorPanelProps): React.ReactElement {
  return (
    <nav
      className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm"
      aria-label="DMRV type selector"
    >
      <p className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Selector</p>
      <p className="px-2 text-xs font-bold leading-snug text-[#1e3a5f]">{category.title}</p>

      <div className="relative mx-auto my-4 flex h-28 w-28 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border-4 border-slate-200"
          style={{ borderTopColor: category.color, borderRightColor: category.color }}
          aria-hidden
        />
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-center text-[9px] font-black uppercase leading-tight text-white shadow-inner"
          style={{ backgroundColor: category.color }}
        >
          DMRV
        </div>
      </div>

      <ul className="space-y-0.5">
        {category.types.map((type) => {
          const active = type.id === selectedTypeId;
          return (
            <li key={type.id}>
              <button
                type="button"
                onClick={() => onSelectType(type.id)}
                className={`w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {type.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
