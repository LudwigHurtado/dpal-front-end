import React from 'react';
import { ChevronRight } from '../../../../components/icons';

export type Crumb = { label: string; onClick?: () => void };

type Props = {
  crumbs: Crumb[];
};

export function DmrvBreadcrumb({ crumbs }: Props): React.ReactElement {
  return (
    <nav aria-label="DMRV navigation" className="mb-4 flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-600">
      {crumbs.map((c, i) => (
        <React.Fragment key={`${c.label}-${i}`}>
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
          {c.onClick ? (
            <button type="button" onClick={c.onClick} className="rounded px-1 py-0.5 hover:bg-slate-200/80 hover:text-slate-900">
              {c.label}
            </button>
          ) : (
            <span className="text-slate-900">{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
