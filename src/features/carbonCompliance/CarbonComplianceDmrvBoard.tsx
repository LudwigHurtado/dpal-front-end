import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DmrvBlockchainBadge } from '../dmrv/components/DmrvBlockchainSymbol';
import { DmrvInfographicBoard } from '../dmrv/components/DmrvInfographicBoard';
import { DMRV_CATEGORIES, getCategoryBySlug, type DmrvCategory } from '../dmrv/dmrvRegistry';

export type CarbonComplianceDmrvBoardProps = {
  /** Initial DMRV family slug (defaults to carbon-land). */
  initialCategorySlug?: string;
};

/**
 * Adaptive DMRV infographic surface — category image strip + interactive selector/table board.
 */
export function CarbonComplianceDmrvBoard({
  initialCategorySlug = 'carbon-land',
}: CarbonComplianceDmrvBoardProps): React.ReactElement {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [activeSlug, setActiveSlug] = useState(initialCategorySlug);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  const category = useMemo(() => getCategoryBySlug(activeSlug), [activeSlug]);

  useEffect(() => {
    if (category?.types[0]) {
      setSelectedTypeId(category.types[0].id);
    }
  }, [category?.slug]);

  const handleSelectCategory = useCallback((slug: string) => {
    setActiveSlug(slug);
  }, []);

  const handleSelectType = useCallback((typeId: string) => {
    setSelectedTypeId(typeId);
  }, []);

  return (
    <div className="space-y-5">
      <CategoryImageStrip activeSlug={activeSlug} onSelect={handleSelectCategory} />

      {category ? (
        <DmrvInfographicBoard
          category={category}
          types={category.types}
          selectedTypeId={selectedTypeId}
          onSelectType={handleSelectType}
          projectId={projectId}
        />
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Category not found. Choose a DMRV family above.
        </p>
      )}
    </div>
  );
}

function CategoryImageStrip({
  activeSlug,
  onSelect,
}: {
  activeSlug: string;
  onSelect: (slug: string) => void;
}): React.ReactElement {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-label="DMRV category families"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        DMRV families · select a board
      </p>
      <p className="mt-1 text-xs text-slate-600">
        All infographic boards are available on this page — open any category to view its selector dial and evaluation
        table.
      </p>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {DMRV_CATEGORIES.map((cat) => (
          <CategoryThumb key={cat.slug} category={cat} active={cat.slug === activeSlug} onSelect={() => onSelect(cat.slug)} />
        ))}
      </div>
    </section>
  );
}

function CategoryThumb({
  category,
  active,
  onSelect,
}: {
  category: DmrvCategory;
  active: boolean;
  onSelect: () => void;
}): React.ReactElement {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-[168px] shrink-0 snap-start overflow-hidden rounded-xl border text-left transition ${
        active
          ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/25 shadow-lg'
          : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
      }`}
    >
      <div className="relative aspect-[16/10] w-full bg-slate-100">
        {!imgFailed ? (
          <img
            src={category.image}
            alt=""
            className="h-full w-full object-cover object-top"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-bold uppercase text-[#1e3a5f]"
            style={{ borderBottom: `3px solid ${category.color}` }}
          >
            {category.title}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f172a]/95 via-[#0f172a]/50 to-transparent px-2 pb-2 pt-8">
          <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-300/90">DMRV</p>
          <p className="line-clamp-2 text-[11px] font-black leading-tight text-white">{category.title}</p>
        </div>
      </div>
      <span className="absolute left-2 top-2">
        <DmrvBlockchainBadge accentColor={category.color} className="shadow-md" />
      </span>
      {active ? (
        <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow">
          Active
        </span>
      ) : null}
    </button>
  );
}
