import React from 'react';

export type EvidenceChainStep = {
  id: string;
  label: string;
  state: 'complete' | 'current' | 'pending' | 'blocked';
  detail?: string;
};

const stateLabel: Record<EvidenceChainStep['state'], string> = {
  complete: 'Complete',
  current: 'In progress',
  pending: 'Pending',
  blocked: 'Blocked',
};

export function EvidenceChainTimeline({ steps, footerNote }: { steps: EvidenceChainStep[]; footerNote?: string }): React.ReactElement {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Evidence chain</h3>
      <p className="mt-1 text-xs text-slate-500">Honest lifecycle view — does not imply registry approval or final validation.</p>
      <ul className="mt-6 space-y-4">
        {steps.map((step, i) => (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <span
                className={`h-3 w-3 rounded-full ${
                  step.state === 'complete'
                    ? 'bg-emerald-500'
                    : step.state === 'current'
                      ? 'bg-sky-500 ring-4 ring-sky-100'
                      : step.state === 'blocked'
                        ? 'bg-rose-400'
                        : 'bg-slate-300'
                }`}
              />
              {i < steps.length - 1 ? <span className="mt-1 h-8 w-px bg-slate-200" aria-hidden /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{step.label}</p>
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{stateLabel[step.state]}</p>
              {step.detail ? <p className="mt-1 text-xs text-slate-600">{step.detail}</p> : null}
            </div>
          </li>
        ))}
      </ul>
      {footerNote ? <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">{footerNote}</p> : null}
    </div>
  );
}
