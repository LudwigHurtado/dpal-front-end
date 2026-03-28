import React from 'react';
import type { CategoryDefinition } from '../../../types/categoryGateway';

export type PlayHubViewProps = {
  definition: CategoryDefinition;
  accent: string;
  onOpenGameHub: () => void;
};

const PlayHubView: React.FC<PlayHubViewProps> = ({ definition, accent, onOpenGameHub }) => {
  const intro = definition.modes.play?.intro;
  const tiles = [
    { title: 'Spot the issue', sub: 'Training mode', type: 'challenge' as const },
    { title: 'Signal hunters', sub: 'Discovery trail', type: 'hunt' as const },
    { title: 'Badge trail', sub: 'Verified learning', type: 'collection' as const },
    { title: 'Mission streak', sub: 'Weekly rhythm', type: 'streak' as const },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-50 to-cyan-50 p-8 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Play</h2>
        <p className="mt-2 text-slate-700 leading-relaxed">{intro}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiles.map((t) => (
          <button
            key={t.title}
            type="button"
            onClick={onOpenGameHub}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.type}</p>
            <h3 className="mt-2 text-lg font-black text-slate-900">{t.title}</h3>
            <p className="text-sm text-slate-600">{t.sub}</p>
            <span className="mt-4 inline-block text-sm font-bold" style={{ color: accent }}>
              Open in Game Hub →
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onOpenGameHub}
          className="rounded-2xl px-8 py-3 text-sm font-bold text-white shadow-lg"
          style={{ backgroundColor: accent }}
        >
          Open DPAL Game Hub
        </button>
      </div>
    </div>
  );
};

export default PlayHubView;
