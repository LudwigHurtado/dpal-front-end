import React from 'react';
import { COLORADO_MAP_AREAS } from '../services/coloradoRiverMockData';

export default function BasinMapPlaceholder(): React.ReactElement {
  return (
    <div
      className="rounded-2xl border dpal-border-subtle overflow-hidden"
      style={{ background: 'var(--dpal-card)' }}
    >
      <div
        className="px-4 py-3 border-b dpal-border-subtle flex items-center justify-between flex-wrap gap-2"
        style={{ background: 'var(--dpal-surface-alt)' }}
      >
        <span className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
          Colorado River Basin — demo map panel
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#fde68a' }}>
          Mock / Demo geometry
        </span>
      </div>
      <div
        className="relative min-h-[280px] md:min-h-[360px]"
        style={{
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(56,189,248,0.22), transparent 55%), radial-gradient(ellipse at 70% 55%, rgba(34,197,94,0.1), transparent 50%), linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        }}
      >
        <div className="absolute inset-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-center gap-2 p-3 content-start">
          {COLORADO_MAP_AREAS.map((area) => (
            <div
              key={area.id}
              className="rounded-lg px-2 py-1.5 text-[10px] font-semibold"
              style={{
                background: 'rgba(15,23,42,0.75)',
                border: '1px solid rgba(34,211,238,0.35)',
                color: '#e2e8f0',
              }}
            >
              <div>{area.label}</div>
              {area.sublabel && <div className="text-[9px] font-normal opacity-80">{area.sublabel}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
