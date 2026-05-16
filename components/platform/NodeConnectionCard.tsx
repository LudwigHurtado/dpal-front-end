import React from 'react';
import { StatusChip, type StatusChipTone } from './StatusChip';

export interface NodeConnectionCardProps {
  title?: string;
  statusLabel: string;
  statusTone?: StatusChipTone;
  lines: { label: string; value: string }[];
  actions?: React.ReactNode;
}

/** Enterprise-style registry / node reachability panel. */
export function NodeConnectionCard({
  title = 'Node & registry connectivity',
  statusLabel,
  statusTone = 'neutral',
  lines,
  actions,
}: NodeConnectionCardProps): React.ReactElement {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <StatusChip label={statusLabel} tone={statusTone} />
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {lines.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
            <dt className="text-slate-500">{row.label}</dt>
            <dd className="font-medium text-slate-900 text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
