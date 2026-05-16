import React from 'react';

export type StepStatus = 'Available now' | 'Module-local' | 'Backend event available' | 'Pending' | 'Not implemented yet';

export type OperatorStep = {
  id: string;
  title: string;
  status: StepStatus;
};

export function OperatorPathStepper({ steps }: { steps: OperatorStep[] }): React.ReactElement {
  const tone: Record<StepStatus, string> = {
    'Available now': 'text-emerald-800 bg-emerald-50 border-emerald-200',
    'Module-local': 'text-sky-900 bg-sky-50 border-sky-200',
    'Backend event available': 'text-indigo-900 bg-indigo-50 border-indigo-200',
    Pending: 'text-amber-900 bg-amber-50 border-amber-200',
    'Not implemented yet': 'text-slate-600 bg-slate-100 border-slate-200',
  };

  return (
    <ol className="space-y-4">
      {steps.map((step, idx) => (
        <li key={step.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-xs font-bold text-slate-900">
              {idx + 1}
            </span>
            {idx < steps.length - 1 ? <span className="mt-1 w-px flex-1 bg-slate-200" aria-hidden /> : null}
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{step.title}</p>
            <p className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone[step.status]}`}>
              {step.status}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
