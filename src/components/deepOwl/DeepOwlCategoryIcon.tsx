import React from 'react';

/** Visual token per Deep Owl service line — used in nav list and service-lines page. */
export type DeepOwlIconKey =
  | 'carbon'
  | 'search'
  | 'methane'
  | 'factory'
  | 'algae'
  | 'plastic'
  | 'ocean'
  | 'forest'
  | 'mining'
  | 'water'
  | 'flood'
  | 'flame'
  | 'heat'
  | 'air'
  | 'ship'
  | 'agriculture'
  | 'drought'
  | 'biodiversity'
  | 'infrastructure'
  | 'dam'
  | 'insurance'
  | 'land'
  | 'waste'
  | 'supply-chain'
  | 'government'
  | 'community'
  | 'legal'
  | 'investor'
  | 'city'
  | 'verified';

const ICON_CLASS: Record<DeepOwlIconKey, string> = {
  carbon: 'text-emerald-600',
  search: 'text-violet-600',
  methane: 'text-amber-600',
  factory: 'text-slate-600',
  algae: 'text-teal-600',
  plastic: 'text-sky-600',
  ocean: 'text-cyan-600',
  forest: 'text-green-700',
  mining: 'text-stone-600',
  water: 'text-blue-600',
  flood: 'text-indigo-600',
  flame: 'text-orange-600',
  heat: 'text-rose-600',
  air: 'text-slate-500',
  ship: 'text-blue-700',
  agriculture: 'text-lime-700',
  drought: 'text-amber-700',
  biodiversity: 'text-emerald-700',
  infrastructure: 'text-zinc-600',
  dam: 'text-sky-700',
  insurance: 'text-indigo-700',
  land: 'text-amber-800',
  waste: 'text-red-600',
  'supply-chain': 'text-purple-600',
  government: 'text-blue-800',
  community: 'text-teal-700',
  legal: 'text-slate-700',
  investor: 'text-emerald-800',
  city: 'text-cyan-700',
  verified: 'text-emerald-600',
};

export function DeepOwlCategoryIcon({
  icon,
  className = '',
  size = 18,
}: {
  icon: DeepOwlIconKey;
  className?: string;
  size?: number;
}): React.ReactElement {
  const tone = ICON_CLASS[icon];
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true as const };

  const glyphs: Record<DeepOwlIconKey, React.ReactNode> = {
    carbon: (
      <>
        <path d="M12 22c4-2 7-6 7-11a7 7 0 10-14 0c0 5 3 9 7 11z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8v8M9 11h6" strokeLinecap="round" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-3-3" strokeLinecap="round" />
        <path d="M8 11h6M11 8v6" strokeLinecap="round" opacity="0.5" />
      </>
    ),
    methane: (
      <>
        <path d="M6 16c2-4 4-8 6-8s4 4 6 8" strokeLinecap="round" />
        <path d="M4 18h16" strokeLinecap="round" />
      </>
    ),
    factory: (
      <>
        <path d="M3 21V9l6 4V9l6 4V5l6 4v12H3z" strokeLinejoin="round" />
        <path d="M9 17v4M15 17v4" strokeLinecap="round" />
      </>
    ),
    algae: (
      <>
        <path d="M12 3c-2 4-2 8 0 12 2-4 2-8 0-12z" strokeLinecap="round" />
        <path d="M8 8c1 2 1 4 0 6M16 8c-1 2-1 4 0 6" strokeLinecap="round" />
      </>
    ),
    plastic: (
      <>
        <path d="M8 4l2 16M16 4l-2 16M6 10h12M7 16h10" strokeLinecap="round" />
      </>
    ),
    ocean: (
      <>
        <path d="M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0" strokeLinecap="round" />
        <path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" strokeLinecap="round" />
      </>
    ),
    forest: (
      <>
        <path d="M12 22V12M8 12l4-8 4 8M6 14h12" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    mining: (
      <>
        <path d="M4 20h16M8 20l4-14 4 14M10 10h4" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    water: (
      <>
        <path d="M12 3c-3 5-3 9 0 12 3-3 3-7 0-12z" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    flood: (
      <>
        <path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" strokeLinecap="round" />
        <path d="M6 20h12" strokeLinecap="round" />
      </>
    ),
    flame: (
      <>
        <path
          d="M12 3c-1 4-4 5-4 9a4 4 0 108 0c0-4-3-5-4-9z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
    heat: (
      <>
        <path d="M14 4v10a4 4 0 11-4 0V4" strokeLinecap="round" />
        <path d="M10 4v2M14 4v2" strokeLinecap="round" />
      </>
    ),
    air: (
      <>
        <path d="M4 12h12M4 8h16M4 16h8" strokeLinecap="round" />
        <circle cx="18" cy="12" r="2" />
      </>
    ),
    ship: (
      <>
        <path d="M3 18h18M5 18l2-8h10l2 8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 6V4" strokeLinecap="round" />
      </>
    ),
    agriculture: (
      <>
        <path d="M12 22V10M8 14l4-6 4 6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 18h12" strokeLinecap="round" />
      </>
    ),
    drought: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M8 12h8M12 8v8" strokeLinecap="round" opacity="0.35" />
        <path d="M6 6l12 12" strokeLinecap="round" />
      </>
    ),
    biodiversity: (
      <>
        <path d="M12 4c-3 2-5 5-5 8a5 5 0 1010 0c0-3-2-6-5-8z" strokeLinecap="round" />
        <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    infrastructure: (
      <>
        <path d="M4 20h16M6 20V8h4v12M14 20V4h4v16" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 12h4" strokeLinecap="round" />
      </>
    ),
    dam: (
      <>
        <path d="M4 20h16M6 20V10l6-4 6 4v10" strokeLinejoin="round" />
        <path d="M9 14h6" strokeLinecap="round" />
      </>
    ),
    insurance: (
      <>
        <path d="M12 3l8 4v6c0 4-3 7-8 8-5-1-8-4-8-8V7l8-4z" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    land: (
      <>
        <path d="M4 20l8-16 8 16H4z" strokeLinejoin="round" />
        <path d="M9 16h6" strokeLinecap="round" />
      </>
    ),
    waste: (
      <>
        <path d="M9 4h6l1 3H8l1-3zM6 7h12v13H6V7z" strokeLinejoin="round" />
        <path d="M10 11v6M14 11v6" strokeLinecap="round" />
      </>
    ),
    'supply-chain': (
      <>
        <path d="M6 6h12v12H6V6z" strokeLinejoin="round" />
        <path d="M6 12h12M12 6v12" strokeLinecap="round" />
      </>
    ),
    government: (
      <>
        <path d="M4 20h16M6 20V10h4v10M14 20V6h4v14" strokeLinejoin="round" />
        <path d="M12 4v2" strokeLinecap="round" />
      </>
    ),
    community: (
      <>
        <circle cx="9" cy="8" r="2.5" />
        <circle cx="15" cy="8" r="2.5" />
        <path d="M4 20c1.5-3 4-5 8-5s6.5 2 8 5" strokeLinecap="round" />
      </>
    ),
    legal: (
      <>
        <path d="M8 4h8v4a4 4 0 01-8 0V4z" strokeLinejoin="round" />
        <path d="M12 12v8M8 20h8" strokeLinecap="round" />
      </>
    ),
    investor: (
      <>
        <path d="M4 18l4-8 4 4 4-10 4 14" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    city: (
      <>
        <path d="M3 21h18M5 21V9h4v12M11 21V5h4v16M17 21V13h2v8" strokeLinejoin="round" />
      </>
    ),
    verified: (
      <>
        <path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4z" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-100/90 p-1.5 ${tone} ${className}`.trim()}
    >
      <svg {...common}>{glyphs[icon]}</svg>
    </span>
  );
}
