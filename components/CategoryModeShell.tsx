import React from 'react';
import type { CategoryDefinition, CategoryMode } from '../types/categoryGateway';
import { ArrowLeft, FileText, Heart, Briefcase, Gamepad } from './icons';

export type CategoryModeShellProps = {
  category: CategoryDefinition;
  mode: CategoryMode;
  categoryLabel: string;
  onBack: () => void;
  onSwitchMode?: (mode: CategoryMode) => void;
  children: React.ReactNode;
};

const MODE_ICONS: Record<CategoryMode, React.ReactNode> = {
  report: <FileText className="w-4 h-4" />,
  help: <Heart className="w-4 h-4" />,
  work: <Briefcase className="w-4 h-4" />,
  play: <Gamepad className="w-4 h-4" />,
};

const MODES: CategoryMode[] = ['report', 'help', 'work', 'play'];

const CategoryModeShell: React.FC<CategoryModeShellProps> = ({
  category,
  mode,
  categoryLabel,
  onBack,
  onSwitchMode,
  children,
}) => {
  const accent = category.accentColor;

  return (
    <div className="min-h-screen bg-[var(--dpal-background)] text-[var(--dpal-text-primary)]">
      <header
        className="border-b border-[var(--dpal-border)] bg-[color-mix(in_srgb,var(--dpal-topbar)_92%,transparent)] backdrop-blur-sm sticky top-0 z-20"
        style={{ boxShadow: `0 1px 0 0 ${accent}18` }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--dpal-border)] bg-[var(--dpal-surface)] text-[var(--dpal-text-secondary)] hover:bg-[var(--dpal-surface-alt)]"
              aria-label="Back to category hub"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--dpal-text-muted)] truncate">{categoryLabel}</p>
              <h1 className="text-lg font-black tracking-tight text-[var(--dpal-text-primary)] truncate">{category.title}</h1>
            </div>
          </div>

          {onSwitchMode && (
            <nav className="flex flex-wrap gap-1 md:justify-end" aria-label="Switch mode">
              {MODES.filter((m) => category.supportedModes.includes(m)).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSwitchMode(m)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                    mode === m ? 'text-white shadow-sm' : 'bg-[var(--dpal-surface-alt)] text-[var(--dpal-text-secondary)] hover:bg-[var(--dpal-panel)]'
                  }`}
                  style={mode === m ? { backgroundColor: accent } : undefined}
                >
                  {MODE_ICONS[m]}
                  {m}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
};

export default CategoryModeShell;
