import React from 'react';
import {
  type MissionWorkflowStep,
  workflowStatusLabel,
  workflowStatusTone,
} from '../utils/plasticMissionWorkflow';

type Props = {
  steps: MissionWorkflowStep[];
  activeStepId?: string | null;
  onStepClick?: (stepId: string) => void;
};

export function PlasticMissionStepper({ steps, activeStepId, onStepClick }: Props): React.ReactElement {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Mission workflow</h2>
      <p className="mt-1 text-[11px] text-slate-600">Follow each step from mission type through ledger anchor.</p>
      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => {
          const selected = activeStepId === step.id;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onStepClick?.(step.id)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                  selected ? 'border-sky-300 bg-sky-50' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${workflowStatusTone(step.status)}`} />
                  <span className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-900">{step.title}</span>
                    <span className="ml-2 text-[10px] font-medium text-slate-500">{workflowStatusLabel(step.status)}</span>
                  </span>
                </div>
                <p className="mt-1 pl-7 text-[10px] leading-snug text-slate-600">{step.detail}</p>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
