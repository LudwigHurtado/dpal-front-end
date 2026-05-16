import React, { useMemo } from 'react';
import { ShieldCheck } from '../../../../components/icons';
import type { DmrvCategory, DmrvType } from '../dmrvRegistry';

export type DmrvSelectorDialProps = {
  category: DmrvCategory;
  types: DmrvType[];
  selectedTypeId: string | null;
  onSelectType: (typeId: string) => void;
};

export function DmrvSelectorDial({
  category,
  types,
  selectedTypeId,
  onSelectType,
}: DmrvSelectorDialProps): React.ReactElement {
  const selectedIndex = Math.max(0, types.findIndex((t) => t.id === selectedTypeId));
  const accentColor = types[selectedIndex]?.segmentColor ?? category.color;

  const ringGradient = useMemo(() => {
    const slice = 100 / types.length;
    const stops = types
      .map((t, i) => {
        const start = (i * slice).toFixed(2);
        const end = ((i + 1) * slice).toFixed(2);
        return `${t.segmentColor} ${start}% ${end}%`;
      })
      .join(', ');
    return `conic-gradient(from -90deg, ${stops})`;
  }, [types]);

  const knobRotation = selectedIndex * (360 / types.length) + 360 / types.length / 2;

  return (
    <nav
      className="flex h-full flex-col rounded-2xl border border-slate-300 bg-white p-4 shadow-sm lg:sticky lg:top-4"
      aria-label={`${category.title} selector`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {category.title} selector
      </p>
      <p className="mt-1 text-[11px] font-medium leading-snug text-slate-600">
        Choose the evaluation type to determine the appropriate DMRV approach.
      </p>

      <div className="relative mx-auto my-5 flex h-36 w-36 items-center justify-center">
        <DialRing style={{ background: ringGradient }} />
        <DialKnob rotation={knobRotation} color={accentColor} />
        <DialCenter />
      </div>

      <ol className="mt-4 space-y-1">
        {types.map((type, index) => {
          const active = type.id === selectedTypeId;
          return (
            <li key={type.id}>
              <button
                type="button"
                onClick={() => onSelectType(type.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white"
                  style={{ backgroundColor: type.segmentColor }}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 leading-tight">{type.selectorLabel}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div
        className="mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[10px] leading-snug text-slate-600"
        style={{ borderColor: `${accentColor}55`, backgroundColor: `${accentColor}0d` }}
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accentColor }} aria-hidden />
        <p>Selection determines the DMRV type and required inputs for evaluation.</p>
      </div>
    </nav>
  );
}

function DialRing({ style }: { style: React.CSSProperties }): React.ReactElement {
  return (
    <div className="absolute inset-0 rounded-full p-[10px] shadow-inner" style={style}>
      <DialRingHole />
    </div>
  );
}

function DialRingHole(): React.ReactElement {
  return <div className="h-full w-full rounded-full bg-[#f4f6f9]" />;
}

function DialKnob({ rotation, color }: { rotation: number; color: string }): React.ReactElement {
  return (
    <div
      className="absolute inset-0 flex items-start justify-center pt-3"
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-hidden
    >
      <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-lg ring-2 ring-white/20">
        <div className="mb-1 h-0.5 w-6 rounded-full" style={{ backgroundColor: color }} />
        <div className="h-2 w-2 rounded-full bg-zinc-950" />
      </div>
    </div>
  );
}

function DialCenter(): React.ReactElement {
  return (
    <div
      className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-zinc-800 text-[8px] font-black uppercase leading-tight text-white shadow-md"
      aria-hidden
    >
      DMRV
    </div>
  );
}
