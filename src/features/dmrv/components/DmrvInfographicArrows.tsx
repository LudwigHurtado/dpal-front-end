import React from 'react';

/** Decorative flow arrows between selector → types → data (infographic layout). */
export function DmrvInfographicArrows(): React.ReactElement {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
      <svg className="absolute left-[218px] top-[42%] h-8 w-10 text-slate-400" viewBox="0 0 40 32" fill="none">
        <path d="M2 16h28M26 10l8 6-8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg className="absolute right-[288px] top-[38%] h-8 w-10 text-slate-400" viewBox="0 0 40 32" fill="none">
        <path d="M2 16h28M26 10l8 6-8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
