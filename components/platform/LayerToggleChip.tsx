import React from 'react';

export type LayerToggleChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

/** Non-functional preview chip — toggles local UI state only unless wired. */
export function LayerToggleChip({ label, active = false, onClick }: LayerToggleChipProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-left text-[11px] font-semibold tracking-tight transition ${
        active
          ? 'border-emerald-500/80 bg-emerald-500/20 text-emerald-100 shadow-sm'
          : 'border-white/20 bg-slate-950/40 text-slate-200 hover:border-white/35 hover:bg-slate-900/50'
      }`}
    >
      {label}
    </button>
  );
}
