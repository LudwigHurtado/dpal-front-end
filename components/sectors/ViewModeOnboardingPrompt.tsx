import React from 'react';
import type { ViewMode } from './sectorDefinitions';

interface ViewModeOnboardingPromptProps {
  onSelect: (mode: ViewMode) => void;
  onDismiss: () => void;
}

const ViewModeOnboardingPrompt: React.FC<ViewModeOnboardingPromptProps> = ({ onSelect, onDismiss }) => {
  return (
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-[2rem] border border-zinc-700 bg-zinc-950 p-6 md:p-8 shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Welcome to DPAL</p>
        <h2 className="mt-3 text-2xl md:text-3xl font-black uppercase tracking-tight text-white">Choose your default view</h2>
        <p className="mt-3 text-sm text-zinc-300">
          Classic keeps the original flat categories. Next organizes categories into sectors for faster navigation.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect('classic')}
            className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-left hover:border-zinc-500 transition-colors"
          >
            <div className="text-sm font-black uppercase tracking-wider text-white">Classic View</div>
            <div className="mt-2 text-xs text-zinc-400">Current users and existing workflows</div>
          </button>
          <button
            type="button"
            onClick={() => onSelect('next')}
            className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-4 text-left hover:border-cyan-400 transition-colors"
          >
            <div className="text-sm font-black uppercase tracking-wider text-cyan-200">Next View</div>
            <div className="mt-2 text-xs text-zinc-300">Sector-based navigation and scalable structure</div>
          </button>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Decide later
        </button>
      </div>
    </div>
  );
};

export default ViewModeOnboardingPrompt;
