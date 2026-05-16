import React from 'react';

export type ComplianceTimelineStep = {
  id: string;
  title: string;
  detail?: string;
  state: 'done' | 'current' | 'upcoming';
};

export interface ComplianceTimelineProps {
  steps: ComplianceTimelineStep[];
}

/** Horizontal-friendly vertical timeline for compliance workflows. */
export function ComplianceTimeline({ steps }: ComplianceTimelineProps): React.ReactElement {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => (
        <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 ? (
            <span
              className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200"
              aria-hidden
            />
          ) : null}
          <span
            className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
              step.state === 'done'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : step.state === 'current'
                  ? 'border-sky-500 bg-sky-50 text-sky-900'
                  : 'border-slate-200 bg-white text-slate-400'
            }`}
          >
            {step.state === 'done' ? '✓' : i + 1}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-slate-900">{step.title}</p>
            {step.detail ? <p className="mt-0.5 text-xs text-slate-600">{step.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
