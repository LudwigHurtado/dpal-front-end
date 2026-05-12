import React from 'react';
import type { EnvironmentalProviderUiState } from './environmentalServiceStatus';
import { formatProviderStateLabel, providerChipClasses } from './environmentalServiceStatus';

export type EnvironmentalProviderStripItem = {
  id: string;
  label: string;
  state: EnvironmentalProviderUiState;
  hint?: string;
};

type Props = {
  items: EnvironmentalProviderStripItem[];
  className?: string;
  /** Dark strip for modules that use a slate command header (e.g. AquaScan). */
  variant?: 'light' | 'dark';
};

const EnvironmentalProviderStatusStrip: React.FC<Props> = ({ items, className, variant = 'light' }) => {
  if (!items.length) return null;
  const dark = variant === 'dark';
  return (
    <div
      className={`${
        dark ? 'border-b border-slate-800 bg-slate-900/95' : 'border-b border-slate-200 bg-white'
      } ${className ?? ''}`}
      role="region"
      aria-label="Provider status summary"
    >
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-stretch gap-2 px-4 py-2">
        {items.map((it) => (
          <div
            key={it.id}
            className={`flex min-w-[140px] flex-1 flex-col justify-center rounded-lg border px-2.5 py-1.5 ${
              dark ? 'border-slate-700/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/80'
            }`}
            title={it.hint}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {it.label}
            </p>
            <p className="mt-1">
              <span className={providerChipClasses(it.state)}>{formatProviderStateLabel(it.state)}</span>
            </p>
            {it.hint ? (
              <p className={`mt-0.5 text-[9px] leading-snug line-clamp-2 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                {it.hint}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnvironmentalProviderStatusStrip;
