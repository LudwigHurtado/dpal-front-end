import React from 'react';
import { Link } from 'react-router-dom';

export default function CreateProjectPlaceholder(): React.ReactElement {
  return (
    <div className="rounded-2xl p-6 border dpal-border-subtle space-y-3 max-w-2xl" style={{ background: 'var(--dpal-card)' }}>
      <h1 className="text-xl font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
        Create New Water Project
      </h1>
      <p className="text-sm dpal-text-secondary leading-relaxed">
        Project creation for river basins, irrigation districts, reservoirs, municipalities, and conservation programs is
        planned as a future phase. This placeholder keeps navigation safe without implying a live provisioning API.
      </p>
      <ul className="text-xs dpal-text-secondary list-disc pl-5 space-y-1">
        <li>Use the Colorado River exchange pilot for basin-scale demo workflow.</li>
        <li>Use the Santa Cruz FloodGuard demo for city-scale flood intelligence (`/floodguard?p=santa-cruz`).</li>
      </ul>
      <span
        className="inline-flex text-[10px] font-bold uppercase px-2 py-1 rounded"
        style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.4)' }}
      >
        Demo placeholder — not persisted
      </span>
      <div>
        <Link to="/water-intelligence" className="text-[11px] font-semibold text-cyan-300 hover:underline">
          ← Water Intelligence home
        </Link>
      </div>
    </div>
  );
}
