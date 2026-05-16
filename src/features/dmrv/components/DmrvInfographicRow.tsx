import React from 'react';
import { ChevronRight } from '../../../../components/icons';
import type { DmrvInputDef } from '../dmrvRegistry';
import type { DmrvType } from '../dmrvRegistry';
import { DmrvInputSymbol } from './dmrvInputSymbols';
import { DmrvTypeSymbol } from './dmrvTypeSymbols';

export type DmrvInfographicRowProps = {
  rowId?: string;
  index: number;
  type: DmrvType;
  active: boolean;
  onSelect: () => void;
  onConfigureInput?: (inputDef: DmrvInputDef) => void;
};

export function DmrvInfographicRow({
  rowId,
  index,
  type,
  active,
  onSelect,
  onConfigureInput,
}: DmrvInfographicRowProps): React.ReactElement {
  const inputDefs = type.inputDefs.length > 0 ? type.inputDefs.slice(0, 5) : [];

  return (
    <li id={rowId} className="scroll-mt-24">
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
          <DmrvTypeSymbol
            typeId={type.id}
            title={type.title}
            size={44}
            ringColor={type.segmentColor}
            className="shrink-0"
          />
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
          <span className="flex flex-wrap justify-center gap-2.5 xl:justify-start">
            {inputDefs.map((inputDef) => (
              <InputConfigChip
                key={inputDef.key}
                inputDef={inputDef}
                accentColor={type.segmentColor}
                onConfigure={onConfigureInput}
              />
            ))}
            <InputConfigChip
              inputDef={{
                key: 'blockchain-log',
                label: 'Blockchain log',
                shortDescription: '',
                configType: 'blockchain',
                requiredForIntegrity: true,
                blockchainAnchorRequired: true,
                validationRole: 'Integrity timestamp',
              }}
              accentColor={type.segmentColor}
              onConfigure={onConfigureInput}
            />
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

function InputConfigChip({
  inputDef,
  accentColor,
  onConfigure,
}: {
  inputDef: DmrvInputDef;
  accentColor: string;
  onConfigure?: (inputDef: DmrvInputDef) => void;
}): React.ReactElement {
  const interactive = Boolean(onConfigure);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onConfigure?.(inputDef);
      }}
      disabled={!interactive}
      className={`group/input relative flex w-[76px] flex-col items-center gap-1.5 rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50 px-1 pb-2 pt-1.5 text-center shadow-sm transition hover:border-slate-400 hover:shadow-md hover:ring-2 hover:ring-[#1e3a5f]/20 ${
        interactive ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{ borderColor: `${accentColor}40` }}
      title={interactive ? `Configure ${inputDef.label}` : inputDef.label}
    >
      <DmrvInputSymbol label={inputDef.label} size={44} accentColor={accentColor} />
      <span className="px-0.5 text-[7.5px] font-bold leading-tight text-slate-800">
        {inputDef.label}
      </span>
      {interactive ? (
        <span className="flex items-center gap-0.5 text-[6.5px] font-black uppercase tracking-wide text-[#1e3a5f] opacity-80 group-hover/input:opacity-100">
          Configure
          <ChevronRight className="h-2.5 w-2.5" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}
