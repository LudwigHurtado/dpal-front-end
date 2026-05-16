import React from 'react';
import { DMRV_WORKFLOW_STEPS } from '../dmrvRegistry';

export type DmrvWorkflowPanelProps = {
  activeStep: number;
  onStepChange: (step: number) => void;
  riskFlags: string[];
};

export function DmrvWorkflowPanel({
  activeStep,
  onStepChange,
  riskFlags,
}: DmrvWorkflowPanelProps): React.ReactElement {
  return (
    <div className="rounded-2xl border border-slate-300 bg-[#f7f9fc] p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Evidence workflow</p>
      <h3 className="text-sm font-black uppercase tracking-wide text-[#1e3a5f]">DPAL DMRV pipeline</h3>

      <ol className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
        {DMRV_WORKFLOW_STEPS.map((label, index) => {
          const step = index + 1;
          const current = step === activeStep;
          const done = step < activeStep;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onStepChange(step)}
                className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                  current
                    ? 'border-[#1e3a5f] bg-white shadow-sm'
                    : done
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-slate-200 bg-white/80 hover:bg-white'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                    current ? 'bg-[#1e3a5f] text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step}
                </span>
                <span className="text-[11px] font-semibold leading-snug text-slate-800">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {riskFlags.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-amber-900">Risk flags</p>
          <ul className="mt-2 space-y-1 text-[11px] text-amber-950">
            {riskFlags.slice(0, 4).map((flag) => (
              <li key={flag} className="flex gap-2">
                <span aria-hidden>⚠</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
