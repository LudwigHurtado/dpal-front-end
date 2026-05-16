import React from 'react';

export type StatusChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<StatusChipTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  info: 'bg-sky-50 text-sky-900 border-sky-200',
};

export interface StatusChipProps {
  label: string;
  tone?: StatusChipTone;
  dot?: boolean;
  className?: string;
}

/** Compact status badge for enterprise dashboards (Tailwind). */
export function StatusChip({ label, tone = 'neutral', dot = true, className = '' }: StatusChipProps): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight ${toneClasses[tone]} ${className}`}
    >
      {dot ? (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            tone === 'success'
              ? 'bg-emerald-500'
              : tone === 'warning'
                ? 'bg-amber-500'
                : tone === 'danger'
                  ? 'bg-rose-500'
                  : tone === 'info'
                    ? 'bg-sky-500'
                    : 'bg-slate-400'
          }`}
          aria-hidden
        />
      ) : null}
      {label}
    </span>
  );
}
