import React from 'react';

export interface SystemOverviewCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

export function SystemOverviewCard({ title, value, subtitle }: SystemOverviewCardProps): React.ReactElement {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.04]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      {subtitle ? <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p> : null}
    </div>
  );
}
