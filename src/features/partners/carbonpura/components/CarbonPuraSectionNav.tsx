import React from 'react';
import { CARBONPURA_SECTIONS } from '../carbonPuraSections';

export type CarbonPuraViewMode = 'executive' | 'technical';

type CarbonPuraSectionNavProps = {
  viewMode: CarbonPuraViewMode;
};

function scrollToSection(anchorId: string): void {
  const el = document.getElementById(anchorId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function CarbonPuraSectionNav({ viewMode }: CarbonPuraSectionNavProps) {
  const sections = CARBONPURA_SECTIONS.filter((s) => viewMode === 'technical' || s.executiveNav);

  return (
    <nav
      data-testid="carbonpura-section-nav"
      className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-slate-100/95 px-4 py-2 backdrop-blur md:-mx-6 md:px-6"
      aria-label="CarbonPura section navigation"
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.anchorId)}
            className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900"
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
