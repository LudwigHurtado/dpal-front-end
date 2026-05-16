import React from 'react';
import { ChevronRight, Lock } from '../../../../components/icons';
import type { DmrvInputDef } from '../dmrvRegistry';
import type { DmrvType } from '../dmrvRegistry';
import { getInputConfigureHint } from '../dmrvInputRegistry';
import { DmrvInputSymbol } from './dmrvInputSymbols';
import { DmrvTypeSymbol } from './dmrvTypeSymbols';

export type DmrvInputSourceMeta = {
  configured: boolean;
  selectedCount: number;
  chips: string[];
};

export type DmrvInfographicRowProps = {
  rowId?: string;
  index: number;
  type: DmrvType;
  active: boolean;
  onSelect: () => void;
  onOpenProjectConfig: () => void;
  onConfigureInput?: (inputDef: DmrvInputDef) => void;
  getInputSourceMeta?: (inputKey: string) => DmrvInputSourceMeta | undefined;
};

const SOURCE_PICKER_KEYS = new Set(['satellite-imagery', 'lidar']);

export function DmrvInfographicRow({
  rowId,
  index,
  type,
  active,
  onSelect,
  onOpenProjectConfig,
  onConfigureInput,
  getInputSourceMeta,
}: DmrvInfographicRowProps): React.ReactElement {
  const inputDefs = type.inputDefs.length > 0 ? type.inputDefs.slice(0, 5) : [];

  const rowSurface = `grid w-full grid-cols-1 gap-3 rounded-xl border p-3 transition xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(140px,180px)] xl:items-center xl:gap-4 ${
    active
      ? 'border-slate-900 bg-white shadow-md ring-2 ring-slate-900/10'
      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
  }`;

  return (
    <li id={rowId} className="scroll-mt-24">
      <div
        className={rowSurface}
        style={active ? { borderLeftWidth: 4, borderLeftColor: type.segmentColor } : undefined}
      >
        <button type="button" onClick={onSelect} className="flex min-w-0 items-start gap-3 text-left">
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
        </button>

        <div className="border-t border-slate-100 pt-3 xl:border-t-0 xl:pt-0">
          <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 xl:hidden">
            Inputs for evaluation
          </span>

          <span className="flex flex-wrap justify-center gap-2.5 xl:justify-start">
            <InputConfigChip
              inputDef={{
                key: 'project-config',
                label: 'Project Config',
                shortDescription: 'Optional — project identity, AOI, methodology, and reporting period.',
                configType: 'generic',
                requiredForIntegrity: false,
                blockchainAnchorRequired: false,
                validationRole: 'Project context',
              }}
              iconLabel="Project Documents"
              accentColor={type.segmentColor}
              onPress={onOpenProjectConfig}
            />
            {inputDefs.map((inputDef) => (
              <InputConfigChip
                key={inputDef.key}
                inputDef={inputDef}
                accentColor={type.segmentColor}
                sourceMeta={getInputSourceMeta?.(inputDef.key)}
                onConfigure={onConfigureInput}
                isSourcePicker={SOURCE_PICKER_KEYS.has(inputDef.key)}
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
              iconLabel="Blockchain log"
              accentColor={type.segmentColor}
              onConfigure={onConfigureInput}
            />
          </span>
        </div>

        <div className="border-t border-slate-100 pt-3 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
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
        </div>
      </div>
    </li>
  );
}

function InputConfigChip({
  inputDef,
  iconLabel,
  accentColor,
  onConfigure,
  onPress,
  sourceMeta,
  isSourcePicker,
}: {
  inputDef: DmrvInputDef;
  iconLabel?: string;
  accentColor: string;
  onConfigure?: (inputDef: DmrvInputDef) => void;
  onPress?: () => void;
  sourceMeta?: DmrvInputSourceMeta;
  isSourcePicker?: boolean;
}): React.ReactElement {
  const interactive = Boolean(onPress) || Boolean(onConfigure);
  const configured = Boolean(sourceMeta?.configured);
  const hint = onPress ? inputDef.shortDescription || inputDef.label : getInputConfigureHint(inputDef.key);

  return (
    <button
      type="button"
      onClick={() => {
        if (onPress) {
          onPress();
          return;
        }
        onConfigure?.(inputDef);
      }}
      disabled={!interactive}
      title={interactive ? hint : 'Evidence input unavailable for this row.'}
      className={`group/input relative flex w-[88px] flex-col items-center gap-1 rounded-xl border px-1 pb-2 pt-1.5 text-center shadow-sm transition ${
        configured
          ? 'border-emerald-400/80 bg-gradient-to-b from-emerald-50 to-white hover:shadow-md hover:ring-2 hover:ring-emerald-500/20'
          : interactive
            ? 'cursor-pointer border-slate-200/90 bg-gradient-to-b from-white to-slate-50 hover:border-slate-400 hover:shadow-md hover:ring-2 hover:ring-[#1e3a5f]/20'
            : 'cursor-not-allowed border-slate-200/90 bg-gradient-to-b from-white to-slate-50 opacity-55 grayscale-[0.35]'
      }`}
      style={{ borderColor: configured ? undefined : `${accentColor}40` }}
    >
      {!interactive ? (
        <Lock className="absolute right-1 top-1 h-3 w-3 text-slate-500" aria-hidden />
      ) : null}
      <DmrvInputSymbol label={iconLabel ?? inputDef.label} size={44} accentColor={accentColor} />
      <span className="px-0.5 text-[7.5px] font-bold leading-tight text-slate-800">{inputDef.label}</span>

      {configured && sourceMeta ? (
        <>
          <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-wide text-white">
            Configured
          </span>
          <span className="text-[6.5px] font-bold text-emerald-800">{sourceMeta.selectedCount} selected</span>
          <span className="flex max-w-full flex-wrap justify-center gap-0.5 px-0.5">
            {sourceMeta.chips.map((chip) => (
              <span
                key={chip}
                className="truncate rounded bg-white/90 px-1 py-px text-[5.5px] font-semibold text-[#1e3a5f] ring-1 ring-emerald-200"
              >
                {chip}
              </span>
            ))}
          </span>
        </>
      ) : interactive ? (
        <span className="flex items-center gap-0.5 text-[6.5px] font-black uppercase tracking-wide text-[#1e3a5f] opacity-80 group-hover/input:opacity-100">
          {isSourcePicker ? 'Pick sources' : 'Configure'}
          <ChevronRight className="h-2.5 w-2.5" aria-hidden />
        </span>
      ) : (
        <span className="text-[6px] font-bold uppercase text-slate-500">Locked</span>
      )}
    </button>
  );
}
