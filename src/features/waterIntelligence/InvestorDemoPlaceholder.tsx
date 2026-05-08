import React from 'react';
import { Link } from 'react-router-dom';

export default function InvestorDemoPlaceholder(): React.ReactElement {
  return (
    <div className="rounded-2xl p-6 border dpal-border-subtle space-y-3 max-w-3xl" style={{ background: 'var(--dpal-card)' }}>
      <h1 className="text-xl font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
        Investor / stakeholder demo
      </h1>
      <p className="text-sm dpal-text-secondary leading-relaxed">
        This placeholder routes stakeholders to the Colorado River pilot surfaces: measurable baselines, monitoring labels,
        VWCU registry patterns, exchange categories (resale / system enhancement / sequestered-archived), evidence
        packets, and public verification — all explicitly marked Pilot / Demonstration Mode.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/water-intelligence/colorado-river"
          className="rounded-lg px-3 py-2 text-[11px] font-bold"
          style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
        >
          Open Colorado River pilot
        </Link>
        <Link to="/water-intelligence/registry" className="rounded-lg px-3 py-2 text-[11px] font-semibold border dpal-border-subtle">
          VWCU registry
        </Link>
        <Link to="/water-intelligence/public/PUB-WI-CR-001" className="rounded-lg px-3 py-2 text-[11px] font-semibold border dpal-border-subtle">
          Sample public record
        </Link>
      </div>
      <Link to="/water-intelligence" className="text-[11px] font-semibold text-cyan-300 hover:underline inline-block">
        ← Water Intelligence home
      </Link>
    </div>
  );
}
