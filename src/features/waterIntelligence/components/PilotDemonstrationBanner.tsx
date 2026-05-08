import React from 'react';

/** Shown on every Water Intelligence route — pilot / demonstration labeling. */
export default function PilotDemonstrationBanner(): React.ReactElement {
  return (
    <div
      className="rounded-xl px-3 py-2 text-[11px] font-semibold border dpal-border-subtle flex flex-wrap items-center gap-2"
      style={{ background: 'rgba(245,158,11,0.12)', color: '#fde68a', borderColor: 'rgba(245,158,11,0.35)' }}
    >
      <span className="uppercase tracking-wider text-[10px]">Pilot / Demonstration Mode</span>
      <span className="opacity-90">
        Mock and planned layers — not a certified legal water exchange, official credit, or agency-approved program unless
        separately governed.
      </span>
    </div>
  );
}
