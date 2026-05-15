import React, { useState } from 'react';

type CarbonPuraFoldPanelProps = {
  defaultExpanded?: boolean;
  children: React.ReactNode;
};

/** Collapse chrome only — child panels keep their own headings. */
export function CarbonPuraFoldPanel({ defaultExpanded = true, children }: CarbonPuraFoldPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
        aria-expanded={expanded}
      >
        <span>{expanded ? 'Collapse section' : 'Expand section'}</span>
        <span aria-hidden>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded ? <div className="border-t border-slate-100">{children}</div> : null}
    </div>
  );
}
