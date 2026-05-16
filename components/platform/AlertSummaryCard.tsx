import React from 'react';

export type AlertSummaryPriority = 'high' | 'medium' | 'low';

const accent: Record<AlertSummaryPriority, string> = {
  high: 'border-l-rose-500 bg-white',
  medium: 'border-l-amber-500 bg-white',
  low: 'border-l-sky-400 bg-white',
};

const pill: Record<AlertSummaryPriority, string> = {
  high: 'bg-rose-100 text-rose-800',
  medium: 'bg-amber-100 text-amber-900',
  low: 'bg-sky-100 text-sky-900',
};

function AlertGlyph({ priority }: { priority: AlertSummaryPriority }): React.ReactElement {
  if (priority === 'high') {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
          <path d="M10.3 3.6L1.8 18a1 1 0 00.9 1.5h18.6a1 1 0 00.9-1.5L13.7 3.6a1 1 0 00-1.8 0z" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (priority === 'medium') {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export interface AlertSummaryCardProps {
  title: string;
  location: string;
  timeAgo?: string;
  priority?: AlertSummaryPriority;
  priorityLabel?: string;
}

export function AlertSummaryCard({
  title,
  location,
  timeAgo,
  priority = 'medium',
  priorityLabel,
}: AlertSummaryCardProps): React.ReactElement {
  const label =
    priorityLabel ?? (priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium');
  return (
    <div
      className={`min-w-[240px] max-w-[280px] shrink-0 snap-start rounded-2xl border border-slate-200/90 border-l-4 py-4 pl-4 pr-4 shadow-sm ${accent[priority]}`}
    >
      <div className="flex gap-3">
        <AlertGlyph priority={priority} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pill[priority]}`}>
              {label}
            </span>
            {timeAgo ? <span className="text-[10px] font-medium text-slate-400">{timeAgo}</span> : null}
          </div>
          <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{location}</p>
        </div>
      </div>
    </div>
  );
}
