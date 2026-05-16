import React from 'react';
import { OCEAN_PLASTIC_INTELLIGENCE_HERO } from '../plasticWatchAssets';

export type OceanPlasticIntelligenceHeroProps = {
  className?: string;
};

export function OceanPlasticIntelligenceHero({
  className = '',
}: OceanPlasticIntelligenceHeroProps): React.ReactElement {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-950 shadow-lg shadow-slate-900/20 ${className}`}
      aria-label="Ocean and Plastic Intelligence"
    >
      <img
        src={OCEAN_PLASTIC_INTELLIGENCE_HERO}
        alt="Ocean and Plastic Intelligence — satellite heatmaps, drone surveys, field sampling, lab analysis, and underwater cleanup"
        className="block w-full max-h-[min(52vh,520px)] object-cover object-center"
        loading="eager"
        fetchPriority="high"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-transparent px-5 pb-5 pt-16 sm:px-8 sm:pb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/90">
          Planetary Intelligence
        </p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl md:text-3xl">
          Ocean &amp; Plastic Intelligence
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-200 sm:text-sm">
          Satellite screening, PACE ocean-color context, field validation, drone surveys, and evidence packets — human
          gates before any plastic attribution claim.
        </p>
      </div>
    </section>
  );
}
