import React from 'react';

const STEPS = [
  'Project Config',
  'Evidence Sources',
  'Validation Rules',
  'Evidence Packet',
  'Blockchain Anchor',
] as const;

export type DmrvWorkflowStep = (typeof STEPS)[number];

export function DmrvWorkflowProgress({
  activeStep,
}: {
  activeStep: number;
}): React.ReactElement {
  return (
    <nav aria-label="DMRV workflow progress" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Workflow</p>
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => {
          const done = i < activeStep;
          const current = i === activeStep;
          return (
            <li
              key={label}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                current
                  ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                  : done
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px]">
                {i + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
