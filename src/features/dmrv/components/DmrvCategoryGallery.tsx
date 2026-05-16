import React from 'react';
import { DMRV_CATEGORIES } from '../dmrvRegistry';
import { DmrvImageButtonCard } from './DmrvImageButtonCard';

export type DmrvCategoryGalleryProps = {
  /** Highlights the active category card (current route slug). */
  currentSlug?: string;
  /** Denser grid for in-category pages. */
  compact?: boolean;
  title?: string;
  subtitle?: string;
};

/**
 * Image-card grid for all DMRV MRV domains — hub entry and in-category navigation.
 */
export function DmrvCategoryGallery({
  currentSlug,
  compact = false,
  title = 'MRV domains',
  subtitle = 'Choose an environmental intelligence domain. Each card opens that category’s DMRV connectors and evaluation types.',
}: DmrvCategoryGalleryProps): React.ReactElement {
  return (
    <section className="mb-6">
      <div className="mb-4 px-1">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[#1e3a5f]">{title}</h2>
        <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-slate-600">{subtitle}</p>
      </div>
      <div
        className={
          compact
            ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            : 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'
        }
      >
        {DMRV_CATEGORIES.map((category) => (
          <DmrvImageButtonCard
            key={category.slug}
            category={category}
            isActive={category.slug === currentSlug}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
}
