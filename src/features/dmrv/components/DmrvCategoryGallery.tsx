import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from '../../../../components/icons';
import { DMRV_CATEGORIES } from '../dmrvRegistry';
import { DmrvImageButtonCard } from './DmrvImageButtonCard';

export type DmrvCategoryGalleryProps = {
  /** Highlights the active category card (current route slug). */
  currentSlug?: string;
  /** Denser cards for in-category pages. */
  compact?: boolean;
  title?: string;
  subtitle?: string;
};

/**
 * Horizontal image-card strip for all DMRV MRV domains — one scrollable row with arrow controls below.
 */
export function DmrvCategoryGallery({
  currentSlug,
  compact = false,
  title = 'MRV domains',
  subtitle = 'Choose an environmental intelligence domain. Each card opens that category’s DMRV connectors and evaluation types.',
}: DmrvCategoryGalleryProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const syncScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = Math.max(0, scrollWidth - clientWidth);
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(overflow > 8 && scrollLeft < overflow - 8);
    setScrollProgress(overflow > 0 ? scrollLeft / overflow : 0);
  }, []);

  const scrollByPage = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(200, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    syncScroll();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => syncScroll());
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncScroll]);

  const cardWidthClass = compact
    ? 'w-[148px] sm:w-[168px]'
    : 'w-[200px] sm:w-[228px] md:w-[240px]';

  return (
    <section className="mb-6">
      <div className="mb-4 px-1">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[#1e3a5f]">{title}</h2>
        <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-slate-600">{subtitle}</p>
      </div>

      <div
        ref={scrollRef}
        onScroll={syncScroll}
        className="flex flex-nowrap gap-3 overflow-x-auto overflow-y-hidden pb-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        aria-label="MRV category image cards"
      >
        {DMRV_CATEGORIES.map((category) => (
          <div key={category.slug} className={`shrink-0 snap-start ${cardWidthClass}`}>
            <DmrvImageButtonCard
              category={category}
              isActive={category.slug === currentSlug}
              compact={compact}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col items-center gap-2">
        <div
          className="flex items-center gap-2.5"
          role="group"
          aria-label="Scroll MRV categories"
        >
          <GalleryScrollButton
            direction="left"
            disabled={!canScrollLeft}
            onClick={() => scrollByPage('left')}
          />
          <GalleryScrollButton
            direction="right"
            disabled={!canScrollRight}
            onClick={() => scrollByPage('right')}
          />
        </div>

        <div
          className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-slate-200/90"
          aria-hidden={!canScrollLeft && !canScrollRight}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1e3a5f] to-emerald-600 transition-[width,margin-left] duration-200"
            style={{
              width: `${Math.max(18, 18 + scrollProgress * 82)}%`,
              marginLeft: `${scrollProgress * (100 - Math.max(18, 18 + scrollProgress * 82))}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}

function GalleryScrollButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}): React.ReactElement {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  const label = direction === 'left' ? 'Scroll categories left' : 'Scroll categories right';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-all duration-200 ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300'
          : 'border-[#1e3a5f]/25 bg-white text-[#1e3a5f] hover:border-[#1e3a5f]/45 hover:bg-[#e8f0f7] hover:shadow-md active:scale-95'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
