import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from '../../../../components/icons';

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export default function PlasticWatchProjectInfoPanel({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: Props): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50/80"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Project information</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-600 line-clamp-2">{subtitle}</p> : null}
        </div>
        <span className="mt-0.5 shrink-0 text-slate-500">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open ? <div className="border-t border-slate-100">{children}</div> : null}
    </div>
  );
}
