import React, { useMemo } from 'react';
import { ChevronRight, Lock, Satellite } from '../../../../components/icons';
import type { DmrvInputDef } from '../dmrvRegistry';
import type { DmrvType } from '../dmrvRegistry';
import { DMRV_EXPANDED_WORKFLOW_INPUTS, getInputConfigureHint } from '../dmrvInputRegistry';
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
/** Always surface remote-sensing pickers in collapsed rows when the type supports them. */
const SOURCE_PICKER_PRIORITY = ['satellite-imagery', 'lidar'] as const;
const COLLAPSED_PREVIEW_COUNT = 2;

const PROJECT_CONFIG_DEF: DmrvInputDef = {
  key: 'project-config',
  label: 'Project Config',
  shortDescription: 'Optional — project identity, AOI, methodology, and reporting period.',
  configType: 'generic',
  requiredForIntegrity: false,
  blockchainAnchorRequired: false,
  validationRole: 'Project context',
};

const BLOCKCHAIN_LOG_DEF: DmrvInputDef = {
  key: 'blockchain-log',
  label: 'Blockchain Anchor',
  shortDescription: 'Evidence hash, ledger record, and public verification link.',
  configType: 'blockchain',
  requiredForIntegrity: true,
  blockchainAnchorRequired: true,
  validationRole: 'Integrity timestamp',
};

const ROW_GRID =
  'grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,1fr)_minmax(420px,1.4fr)_minmax(220px,0.8fr)] xl:items-start';

function buildVisibleActions(type: DmrvType, expanded: boolean): DmrvInputDef[] {
  const typeInputs = type.inputDefs;
  if (!expanded) {
    const seen = new Set<string>();
    const merged: DmrvInputDef[] = [PROJECT_CONFIG_DEF];
    seen.add(PROJECT_CONFIG_DEF.key);
    for (const key of SOURCE_PICKER_PRIORITY) {
      const def = typeInputs.find((d) => d.key === key);
      if (def && !seen.has(def.key)) {
        seen.add(def.key);
        merged.push(def);
      }
    }
    for (const def of typeInputs) {
      if (seen.has(def.key)) continue;
      if (merged.length >= 1 + SOURCE_PICKER_PRIORITY.length + COLLAPSED_PREVIEW_COUNT) break;
      seen.add(def.key);
      merged.push(def);
    }
    return merged;
  }
  const seen = new Set<string>();
  const merged: DmrvInputDef[] = [];
  for (const def of [
    PROJECT_CONFIG_DEF,
    ...typeInputs,
    ...DMRV_EXPANDED_WORKFLOW_INPUTS,
    BLOCKCHAIN_LOG_DEF,
  ]) {
    if (seen.has(def.key)) continue;
    seen.add(def.key);
    merged.push(def);
  }
  return merged;
}

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
  const isSelected = active;
  const visibleActions = useMemo(() => buildVisibleActions(type, isSelected), [type, isSelected]);

  const rowSurface = [
    'w-full rounded-2xl border bg-white transition-all duration-300 ease-out',
    isSelected
      ? 'min-h-[250px] border-emerald-600 shadow-lg ring-1 ring-emerald-600/20'
      : 'min-h-[132px] border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md',
  ].join(' ');

  const buttonGridClass = isSelected
    ? 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5'
    : 'grid grid-cols-3 gap-3';

  return (
    <li id={rowId} className="scroll-mt-24">
      <article
        className={rowSurface}
        style={isSelected ? { borderLeftWidth: 4, borderLeftColor: '#059669' } : undefined}
      >
        <div className={`${ROW_GRID} p-4`}>
          <button
            type="button"
            onClick={onSelect}
            className="flex min-w-0 items-start gap-3 text-left"
            aria-pressed={isSelected}
          >
            <DmrvTypeSymbol
              typeId={type.id}
              title={type.title}
              size={isSelected ? 52 : 44}
              ringColor={type.segmentColor}
              className="shrink-0"
            />
            <span className="min-w-0 flex-1">
              {isSelected ? (
                <span className="mb-1.5 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                  Selected workflow
                </span>
              ) : null}
              <span className="block text-[11px] font-black uppercase tracking-wide text-[#1e3a5f] md:text-xs">
                {index}. {type.title}
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-slate-600">{type.description}</span>
              {!isSelected && type.inputDefs.length > 0 ? (
                <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                  {type.inputDefs.length + 2} evidence inputs — select to expand
                </span>
              ) : null}
            </span>
            <ChevronRight
              className={`mt-1 h-4 w-4 shrink-0 transition-transform duration-300 ${
                isSelected ? 'rotate-90 text-emerald-700' : 'text-slate-400'
              }`}
              aria-hidden
            />
          </button>

          <div className="min-w-0">
            <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
              Configuration
            </span>
            <div className={buttonGridClass}>
              {visibleActions.map((inputDef) => (
                <InputConfigChip
                  key={inputDef.key}
                  compact
                  inputDef={inputDef}
                  accentColor={type.segmentColor}
                  sourceMeta={
                    inputDef.key === 'project-config' ? undefined : getInputSourceMeta?.(inputDef.key)
                  }
                  onPress={
                    inputDef.key === 'project-config' || inputDef.key === 'methodology'
                      ? onOpenProjectConfig
                      : undefined
                  }
                  onConfigure={
                    inputDef.availability === 'coming-soon' ||
                    inputDef.key === 'project-config' ||
                    inputDef.key === 'methodology'
                      ? undefined
                      : onConfigureInput
                  }
                  isSourcePicker={SOURCE_PICKER_KEYS.has(inputDef.key)}
                  isSatellitePicker={inputDef.key === 'satellite-imagery'}
                />
              ))}
            </div>

          </div>

          <div className="min-w-0 border-t border-slate-100 pt-3 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
            <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
              Inputs for evaluation
            </span>
            <ul className="space-y-0.5 text-[10px] font-medium text-slate-700 md:text-[11px]">
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
      </article>
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
  isSatellitePicker = false,
  compact = false,
}: {
  inputDef: DmrvInputDef;
  iconLabel?: string;
  accentColor: string;
  onConfigure?: (inputDef: DmrvInputDef) => void;
  onPress?: () => void;
  sourceMeta?: DmrvInputSourceMeta;
  isSourcePicker?: boolean;
  isSatellitePicker?: boolean;
  compact?: boolean;
}): React.ReactElement {
  const comingSoon = inputDef.availability === 'coming-soon';
  const interactive = !comingSoon && (Boolean(onPress) || Boolean(onConfigure));
  const configured = Boolean(sourceMeta?.configured);
  const hint = onPress ? inputDef.shortDescription || inputDef.label : getInputConfigureHint(inputDef.key);
  const iconSize = compact ? 34 : 44;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!interactive) return;
        if (onPress) {
          onPress();
          return;
        }
        onConfigure?.(inputDef);
      }}
      disabled={!interactive}
      title={
        comingSoon
          ? `${inputDef.label} — coming soon in this workspace.`
          : interactive
            ? hint
            : 'Evidence input unavailable for this row.'
      }
      className={`group/input relative z-10 flex w-full min-w-0 flex-col items-center gap-0.5 rounded-lg border px-1 pb-1.5 pt-1 text-center shadow-sm transition ${
        compact ? 'max-h-[108px]' : ''
      } ${
        comingSoon
          ? 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50/90 opacity-70'
          : configured
            ? 'border-emerald-400/80 bg-gradient-to-b from-emerald-50 to-white hover:shadow-md hover:ring-2 hover:ring-emerald-500/20'
            : interactive
              ? isSatellitePicker
                ? 'cursor-pointer border-sky-500/90 bg-gradient-to-b from-slate-900 via-sky-950/20 to-sky-50 hover:border-sky-600 hover:shadow-md hover:ring-2 hover:ring-sky-400/40'
                : isSourcePicker
                  ? 'cursor-pointer border-emerald-400/70 bg-gradient-to-b from-emerald-50 to-white hover:border-emerald-500 hover:shadow-md hover:ring-2 hover:ring-emerald-500/25'
                  : 'cursor-pointer border-slate-200/90 bg-gradient-to-b from-white to-slate-50 hover:border-slate-400 hover:shadow-md hover:ring-2 hover:ring-[#1e3a5f]/20'
              : 'cursor-not-allowed border-slate-200/90 bg-gradient-to-b from-white to-slate-50 opacity-55 grayscale-[0.35]'
      }`}
      style={{ borderColor: configured || comingSoon ? undefined : `${accentColor}40` }}
    >
      {comingSoon ? (
        <span className="absolute right-1 top-1 rounded bg-slate-200 px-1 py-px text-[5px] font-black uppercase text-slate-600">
          Soon
        </span>
      ) : !interactive ? (
        <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-slate-500" aria-hidden />
      ) : isSatellitePicker ? (
        <span
          className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm ring-1 ring-white"
          aria-hidden
        >
          <Satellite className="h-2.5 w-2.5" />
        </span>
      ) : null}
      <DmrvInputSymbol
        inputKey={inputDef.key}
        configType={inputDef.configType}
        label={iconLabel ?? inputDef.label}
        size={iconSize}
        accentColor={accentColor}
      />
      <span
        className={`px-0.5 font-bold leading-tight ${isSatellitePicker ? 'text-sky-950' : 'text-slate-800'} ${compact ? 'text-[6.5px]' : 'text-[7.5px]'}`}
      >
        {isSatellitePicker ? 'Satellite' : inputDef.label}
      </span>

      {comingSoon ? (
        <span className="text-[5.5px] font-bold uppercase text-slate-500">Coming soon</span>
      ) : configured && sourceMeta ? (
        <>
          <span className="rounded-full bg-emerald-600 px-1 py-px text-[5.5px] font-black uppercase tracking-wide text-white">
            Set
          </span>
          <span className="text-[6px] font-bold text-emerald-800">{sourceMeta.selectedCount} src</span>
          {sourceMeta.chips.length > 0 && compact ? (
            <span className="line-clamp-1 max-w-full truncate px-0.5 text-[5.5px] font-semibold text-[#1e3a5f]">
              {sourceMeta.chips.join(' · ')}
            </span>
          ) : (
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
          )}
        </>
      ) : interactive ? (
        <span
          className={`flex items-center gap-0.5 text-[6px] font-black uppercase tracking-wide opacity-80 group-hover/input:opacity-100 ${
            isSatellitePicker ? 'text-sky-800' : 'text-[#1e3a5f]'
          }`}
        >
          {isSatellitePicker ? 'Pick satellites' : isSourcePicker ? 'Pick' : inputDef.key === 'project-config' || inputDef.key === 'methodology' ? 'Open' : 'Configure'}
          <ChevronRight className="h-2 w-2" aria-hidden />
        </span>
      ) : (
        <span className="text-[5.5px] font-bold uppercase text-slate-500">Locked</span>
      )}
    </button>
  );
}
