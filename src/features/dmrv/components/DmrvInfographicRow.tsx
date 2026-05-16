import React from 'react';
import { ChevronRight } from '../../../../components/icons';
import type { DmrvType } from '../dmrvRegistry';
import { DmrvInputIcon } from './dmrvInputIcon';

export type DmrvInfographicRowProps = {
  index: number;
  type: DmrvType;
  active: boolean;
  onSelect: () => void;
};

export function DmrvInfographicRow({
  index,
  type,
  active,
  onSelect,
}: DmrvInfographicRowProps): React.ReactElement {
  const inputs = type.inputExamples.slice(0, 5);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`group grid w-full grid-cols-1 gap-3 rounded-xl border p-3 text-left transition xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(140px,180px)] xl:items-center xl:gap-4 ${
          active
            ? 'border-slate-900 bg-white shadow-md ring-2 ring-slate-900/10'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        }`}
        style={active ? { borderLeftWidth: 4, borderLeftColor: type.segmentColor } : undefined}
      >
        <span className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-sm"
            style={{ backgroundColor: type.segmentColor }}
            aria-hidden
          >
            {index}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-black uppercase tracking-wide text-[#1e3a5f]">
              {index}. {type.title}
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-slate-600">{type.description}</span>
          </span>
          <ChevronRight
            className={`mt-1 h-4 w-4 shrink-0 xl:hidden ${active ? 'text-slate-900' : 'text-slate-400'}`}
            aria-hidden
          />
        </span>

        <span className="border-t border-slate-100 pt-3 xl:border-t-0 xl:pt-0">
          <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 xl:hidden">
            Inputs for evaluation
          </span>
          <span className="flex flex-wrap justify-center gap-2 xl:justify-start">
            {inputs.map((label) => (
              <span
                key={label}
                className="flex w-[72px] flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1 py-2 text-center"
                style={{ borderColor: `${type.segmentColor}33` }}
              >
                <DmrvInputIcon label={label} className="h-5 w-5 text-slate-600" />
                <span className="text-[8px] font-semibold leading-tight text-slate-700">{label}</span>
              </span>
            ))}
          </span>
        </span>

        <span className="border-t border-slate-100 pt-3 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
          <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 xl:hidden">
            Metrics
          </span>
          <ul className="space-y-0.5 text-[10px] font-medium text-slate-700">
            {type.evaluationMetrics.map((metric) => (
              <li key={metric} className="flex items-start gap-1.5">
                <span
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: type.segmentColor }}
                  aria-hidden
                />
                {metric}
              </li>
            ))}
          </ul>
        </span>
      </button>
    </li>
  );
}
