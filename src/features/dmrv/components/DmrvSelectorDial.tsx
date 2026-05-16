import React, { useMemo } from 'react';
import { ShieldCheck } from '../../../../components/icons';
import type { DmrvCategory, DmrvType } from '../dmrvRegistry';
import { DmrvBlockchainSymbol } from './DmrvBlockchainSymbol';
import { DmrvTypeSymbol } from './dmrvTypeSymbols';
import {
  AdaptiveDmrvSelectorDial,
  type AdaptiveDmrvSelectorItem,
} from './AdaptiveDmrvSelectorDial';

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
  const activeId = selectedTypeId ?? types[0]?.id ?? '';
  const selectedIndex = Math.max(0, types.findIndex((t) => t.id === activeId));
  const accentColor = types[selectedIndex]?.segmentColor ?? category.color;

  const items = useMemo<AdaptiveDmrvSelectorItem[]>(
    () =>
      types.map((type) => ({
        id: type.id,
        label: type.title,
        shortLabel: type.selectorLabel,
        color: type.segmentColor,
        icon: (
          <DmrvTypeSymbol
            typeId={type.id}
            title={type.selectorLabel}
            size={18}
            ringColor={type.segmentColor}
          />
        ),
      })),
    [types],
  );

  const selectorTitle = `${category.title} selector`.toUpperCase();

  const footer = (
    <div
      className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[10px] leading-snug text-slate-600"
      style={{ borderColor: `${accentColor}55`, backgroundColor: `${accentColor}0d` }}
    >
      <span className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
        <DmrvBlockchainSymbol size={22} accentColor={accentColor} className="rounded overflow-hidden" />
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} aria-hidden />
      </span>
      <p>
        Selection determines the DMRV type and required inputs for evaluation. Every pathway includes blockchain
        evidence timestamps.
      </p>
    </div>
  );

  return (
    <AdaptiveDmrvSelectorDial
      title={selectorTitle}
      helperText="Choose the evaluation type to determine the appropriate DMRV approach."
      items={items}
      activeId={activeId}
      onSelect={onSelectType}
      footer={footer}
    />
  );
}
