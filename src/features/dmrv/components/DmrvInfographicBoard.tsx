import React from 'react';
import { ShieldCheck } from '../../../../components/icons';
import type { DmrvCategory, DmrvType } from '../dmrvRegistry';
import { DMRV_FOOTER_TAGLINES } from '../dmrvInfographicTheme';
import { DmrvInfographicRow } from './DmrvInfographicRow';
import { DmrvSelectorDial } from './DmrvSelectorDial';

export type DmrvInfographicBoardProps = {
  category: DmrvCategory;
  types: DmrvType[];
  selectedTypeId: string | null;
  onSelectType: (typeId: string) => void;
};

export function DmrvInfographicBoard({
  category,
  types,
  selectedTypeId,
  onSelectType,
}: DmrvInfographicBoardProps): React.ReactElement {
  const footerTagline = DMRV_FOOTER_TAGLINES[category.slug] ?? 'environmental intelligence';

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
        <h1 className="text-lg font-black uppercase tracking-[0.06em] text-[#1e3a5f] md:text-2xl">
          DPAL Adaptive DMRV: {category.title}
        </h1>
        <p className="mx-auto mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600">
          {category.subtitle}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <DmrvSelectorDial
          category={category}
          types={types}
          selectedTypeId={selectedTypeId}
          onSelectType={onSelectType}
        />

        <section className="min-w-0 space-y-3">
          <div className="hidden items-center gap-2 px-1 xl:flex">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              {category.title} DMRV types
            </p>
            <span className="flex-1 border-t border-dashed border-slate-300" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Inputs for evaluation (examples)
            </p>
          </div>

          <ul className="space-y-2">
            {types.map((type, i) => (
              <DmrvInfographicRow
                key={type.id}
                index={i + 1}
                type={type}
                active={type.id === selectedTypeId}
                onSelect={() => onSelectType(type.id)}
              />
            ))}
          </ul>
        </section>
      </div>

      <footer className="flex items-center justify-center gap-3 rounded-2xl border border-[#1e3a5f]/25 bg-[#e8f0f7] px-5 py-4 text-center">
        <ShieldCheck className="h-8 w-8 shrink-0 text-[#1e3a5f]" aria-hidden />
        <p className="text-xs font-medium leading-snug text-slate-700 md:text-sm">
          <span className="font-black uppercase tracking-wide text-[#1e3a5f]">
            Adaptive. Transparent. Scientific.
          </span>{' '}
          One DMRV system, configured for {footerTagline}.
        </p>
      </footer>
    </div>
  );
}

