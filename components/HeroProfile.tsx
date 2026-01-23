import React from 'react';
import HeroProfileView from './HeroProfileView';
import HeroProfileTab from './HeroProfileTab';
import type { Hero, Archetype } from '../types';

type HeroTabDeps = {
  setHero: React.Dispatch<React.SetStateAction<Hero>>;
  onNavigate: (view: any, cat?: any, tab?: any) => void;
  onAddHeroPersona: (description: string, archetype: Archetype, sourceImage?: string) => Promise<void>;
  onDeleteHeroPersona: (personaId: string) => void;
  onEquipHeroPersona: (personaId: string | null) => void;
};

type Props = {
  hero?: Hero | null;

  /**
   * "tab" uses HeroProfileTab (needs extra props)
   * "view" uses HeroProfileView (standalone profile screen)
   */
  mode?: 'view' | 'tab';

  /** Required only when mode === "tab" */
  tabDeps?: HeroTabDeps;

  /** Required only when mode === "view" (because HeroProfileView expects setHero) */
  setHero?: React.Dispatch<React.SetStateAction<Hero>>;
};

export default function HeroProfile({ hero, mode = 'view', tabDeps, setHero }: Props) {
  if (!hero) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-lg font-semibold">No Hero loaded</div>
          <div className="mt-2 text-sm opacity-80">
            Create or select a Hero first, then open Profile again.
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'tab') {
    if (!tabDeps) {
      return (
        <div className="p-4">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="text-sm font-semibold text-amber-300">Profile tab wiring incomplete</div>
            <div className="mt-2 text-xs opacity-80">
              Missing tabDeps (setHero, onNavigate, persona handlers). Wire HeroProfile inside HeroHub.
            </div>
          </div>
        </div>
      );
    }

    return (
      <HeroProfileTab
        hero={hero}
        setHero={tabDeps.setHero}
        onNavigate={tabDeps.onNavigate}
        onAddHeroPersona={tabDeps.onAddHeroPersona}
        onDeleteHeroPersona={tabDeps.onDeleteHeroPersona}
        onEquipHeroPersona={tabDeps.onEquipHeroPersona}
      />
    );
  }

  // mode === "view"
  if (!setHero) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="text-sm font-semibold text-amber-300">Profile view wiring incomplete</div>
          <div className="mt-2 text-xs opacity-80">Missing setHero prop for HeroProfileView.</div>
        </div>
      </div>
    );
  }

  return <HeroProfileView hero={hero} setHero={setHero} />;
}
