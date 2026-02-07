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
  <div className="dpal-mobile-ui min-h-full bg-[#f8fafc] pb-8">
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#0f172a]">Profile</h1>
      <div className="mt-6 dpal-card p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden">
          {hero.personas.find((p) => p.id === hero.equippedPersonaId)?.imageUrl ? (
            <img
              src={hero.personas.find((p) => p.id === hero.equippedPersonaId)?.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-[#94a3b8]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-[#0f172a] truncate">{hero.name}</h2>
          <p className="text-sm text-[#64748b]">{hero.title}</p>
          <p className="text-xs text-[#1e5f9e] font-semibold mt-1">
            {hero.heroCredits.toLocaleString()} HC · Level {hero.level}
          </p>
        </div>
      </div>
      {onNavigateToFullProfile && (
        <button
          type="button"
          onClick={onNavigateToFullProfile}
          className="mt-4 w-full py-3 rounded-xl font-semibold text-[#1e5f9e] border-2 border-[#1e5f9e] touch-manipulation"
        >
          Open full profile
        </button>
      )}
    </div>
  </div>
);

export default MobileProfileView;
