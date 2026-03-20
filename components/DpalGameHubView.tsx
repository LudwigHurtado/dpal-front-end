import React from 'react';
import { ArrowLeft, Award, Zap } from './icons';

interface DpalGameHubViewProps {
  onReturn: () => void;
}

const GAME_POSTERS = [
  { id: 'pack-1', title: 'Mission Pack Alpha', src: '/games/game-card-pack-1.png' },
  { id: 'pack-2', title: 'Mission Pack Beta', src: '/games/game-card-pack-2.png' },
  { id: 'silent-observer', title: 'Silent Observer', src: '/games/silent-observer.png' },
  { id: 'save-the-environment', title: 'Save The Environment', src: '/games/save-the-environment.png' },
  { id: 'signal-hunters', title: 'Signal Hunters', src: '/games/signal-hunters.png' },
  { id: 'locator-hunt', title: 'DPAL Locator Hunt', src: '/games/dpal-locator-hunt.png' },
  { id: 'dig-up-evidence', title: 'Dig Up Evidence', src: '/games/dig-up-evidence.png' },
];

const DpalGameHubView: React.FC<DpalGameHubViewProps> = ({ onReturn }) => {
  return (
    <div className="animate-fade-in font-mono text-white max-w-7xl mx-auto pb-24 px-4">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onReturn}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300 hover:text-cyan-200 bg-black/60 px-5 py-2 rounded-2xl border border-cyan-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
          <Award className="w-4 h-4 text-amber-400" />
          Beta Game Hub
        </div>
      </div>

      <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/50 p-6 md:p-8 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
            <Zap className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight">DPAL Game System</h1>
            <p className="mt-2 text-sm text-zinc-300 max-w-3xl">
              Game mode turns community safety into mission-driven participation: earn progress for verified reports,
              complete guided tasks, and collaborate on real-world accountability operations.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {GAME_POSTERS.map((poster) => (
          <div key={poster.id} className="rounded-[1.6rem] overflow-hidden border border-zinc-800 bg-zinc-950 shadow-xl">
            <img src={poster.src} alt={poster.title} className="w-full h-auto object-cover" />
            <div className="px-4 py-3 border-t border-zinc-800">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-200">{poster.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DpalGameHubView;
