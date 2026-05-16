import React from 'react';
import { Link } from 'react-router-dom';
import { PLANETARY_INTELLIGENCE_CATEGORIES } from '../../data/planetaryIntelligenceCategories';
import { DeepOwlCategoryIcon } from './DeepOwlCategoryIcon';

export type DeepOwlServiceLinesListProps = {
  /** compact = denser rows for home preview */
  variant?: 'default' | 'compact';
  className?: string;
};

export function DeepOwlServiceLinesList({
  variant = 'default',
  className = '',
}: DeepOwlServiceLinesListProps): React.ReactElement {
  const compact = variant === 'compact';

  return (
    <ol
      className={`list-none space-y-0 p-0 ${compact ? 'space-y-1' : 'sm:columns-2 sm:gap-x-8 lg:columns-3'} ${className}`.trim()}
    >
      {PLANETARY_INTELLIGENCE_CATEGORIES.map((c, index) => (
        <li key={c.id} className={compact ? '' : 'mb-2 break-inside-avoid'}>
          <Link
            to={c.href}
            className={`group flex items-start gap-3 rounded-xl border border-transparent text-slate-800 transition hover:border-emerald-200/80 hover:bg-emerald-50/50 ${
              compact ? 'px-2 py-1.5 text-sm' : 'px-2 py-2.5 text-sm'
            }`}
          >
            <DeepOwlCategoryIcon icon={c.icon} size={compact ? 16 : 18} />
            <span className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-400 group-hover:text-emerald-700">
                {index + 1}
              </span>
              <span className="min-w-0 font-medium leading-snug group-hover:text-emerald-950">{c.title}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
