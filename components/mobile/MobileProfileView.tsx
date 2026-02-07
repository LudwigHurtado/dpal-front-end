import React from 'react';
import { User } from '../icons';
import type { Hero } from '../../types';

interface MobileProfileViewProps {
  hero: Hero;
  onNavigateToFullProfile?: () => void;
}

const MobileProfileView: React.FC<MobileProfileViewProps> = ({
  hero,
  onNavigateToFullProfile,
}) => (
  <div className="dpal-mobile-ui min-h-full bg-zinc-950 pb-8">
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white uppercase tracking-tight">Profile</h1>
      <div className="mt-6 dpal-card p-6 flex items-center gap-4 border-zinc-800">
        <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
          {hero.personas.find((p) => p.id === hero.equippedPersonaId)?.imageUrl ? (
            <img
              src={hero.personas.find((p) => p.id === hero.equippedPersonaId)?.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-zinc-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white truncate">{hero.name}</h2>
          <p className="text-sm text-zinc-500">{hero.title}</p>
          <p className="text-xs text-cyan-400 font-bold mt-1">
            {hero.heroCredits.toLocaleString()} HC · Level {hero.level}
          </p>
        </div>
      </div>
      {onNavigateToFullProfile && (
        <button
          type="button"
          onClick={onNavigateToFullProfile}
          className="mt-4 w-full py-3 rounded-xl font-bold text-cyan-400 border-2 border-cyan-500 bg-zinc-900 touch-manipulation uppercase tracking-wider"
        >
          Open full profile
        </button>
      )}
    </div>
  </div>
);

export default MobileProfileView;
