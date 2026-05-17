import React, { useCallback, useId, useMemo } from 'react';
import './adaptiveDmrvSelectorDial.css';

export type AdaptiveDmrvSelectorItem = {
  id: string;
  label: string;
  shortLabel?: string;
  color: string;
  icon?: React.ReactNode;
};

export type AdaptiveDmrvSelectorDialProps = {
  title: string;
  helperText?: string;
  items: AdaptiveDmrvSelectorItem[];
  activeId: string;
  onSelect: (id: string) => void;
  footer?: React.ReactNode;
};

const DIAL_SIZE = 180;
const CX = DIAL_SIZE / 2;
const CY = DIAL_SIZE / 2;
const R_OUTER = 86;
const R_INNER = 62;
const KNOB_RADIUS = 28;

function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegmentPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number,
): string {
  const outerStart = polar(cx, cy, rOuter, endDeg);
  const outerEnd = polar(cx, cy, rOuter, startDeg);
  const innerEnd = polar(cx, cy, rInner, startDeg);
  const innerStart = polar(cx, cy, rInner, endDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export function AdaptiveDmrvSelectorDial({
  title,
  helperText = 'Choose the evaluation type to determine the appropriate DMRV approach.',
  items,
  activeId,
  onSelect,
  footer,
}: AdaptiveDmrvSelectorDialProps): React.ReactElement {
  const uid = useId().replace(/:/g, '');
  const knobBodyGradient = `dmrv-knob-body-${uid}`;
  const knobBezelGradient = `dmrv-knob-bezel-${uid}`;
  const knobHighlightGradient = `dmrv-knob-highlight-${uid}`;
  const knobShadowFilter = `dmrv-knob-shadow-${uid}`;

  const count = Math.max(items.length, 1);
  const slice = 360 / count;

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );
  const activeItem = items[activeIndex] ?? items[0];
  const needleRotation = activeIndex * slice + slice / 2;

  const segments = useMemo(
    () =>
      items.map((item, index) => {
        const start = index * slice;
        const end = (index + 1) * slice;
        return {
          item,
          path: donutSegmentPath(CX, CY, R_OUTER, R_INNER, start, end),
        };
      }),
    [items, slice],
  );

  const handleSegmentKey = useCallback(
    (id: string) => (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(id);
      }
    },
    [onSelect],
  );

  return (
    <nav
      className="dmrv-selector-dial flex h-full flex-col rounded-2xl border border-[#1e3a5f]/20 bg-white p-4 shadow-sm lg:sticky lg:top-4"
      aria-label={title}
      style={{ '--dmrv-dial-accent': activeItem?.color ?? '#1e3a5f' } as React.CSSProperties}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1e3a5f]">{title}</p>
      <p className="mt-1 text-[11px] font-medium leading-snug text-slate-600">{helperText}</p>

      <div
        className={`dmrv-selector-dial__dial-wrap relative mx-auto my-5 ${
          activeItem ? 'dmrv-selector-dial__dial-wrap--active' : ''
        }`}
        style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
      >
        <svg
          width={DIAL_SIZE}
          height={DIAL_SIZE}
          viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
          className="block overflow-visible"
          role="img"
          aria-label="DMRV category dial"
        >
          <defs>
            <radialGradient id={knobBodyGradient} cx="38%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="42%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <linearGradient id={knobBezelGradient} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="45%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id={knobHighlightGradient} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <filter id={knobShadowFilter} x="-40%" y="-20%" width="180%" height="180%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.35" />
            </filter>
          </defs>

          <circle cx={CX} cy={CY} r={R_OUTER + 2} fill="#f1f5f9" />

          {segments.map(({ item, path }) => {
            const isActive = item.id === activeId;
            return (
              <path
                key={item.id}
                d={path}
                fill={item.color}
                className={`dmrv-selector-dial__segment ${
                  isActive ? 'dmrv-selector-dial__segment--active' : 'dmrv-selector-dial__segment--dim'
                }`}
                stroke="#ffffff"
                strokeWidth={1.5}
                role="button"
                tabIndex={0}
                aria-label={`Select ${item.label}`}
                aria-pressed={isActive}
                onClick={() => onSelect(item.id)}
                onKeyDown={handleSegmentKey(item.id)}
              />
            );
          })}

          <g className="dmrv-selector-dial__scan" aria-hidden>
            <path
              className="dmrv-selector-dial__scan-arc"
              d={donutSegmentPath(CX, CY, R_OUTER - 1, R_INNER + 1, 0, 28)}
              fill="rgba(255,255,255,0.2)"
            />
          </g>

          <circle cx={CX} cy={CY} r={R_INNER - 3} fill="#f8fafc" />

          <g
            className="dmrv-selector-dial__needle"
            style={{
              transform: `rotate(${needleRotation}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
            }}
            aria-hidden
          >
            <polygon
              points={`${CX},${CY - 6} ${CX - 3.5},${CY + 2} ${CX + 3.5},${CY + 2}`}
              fill="#cbd5e1"
            />
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - 44}
              stroke="var(--dmrv-dial-accent, #1e3a5f)"
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.35}
            />
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - 44}
              stroke="#1e293b"
              strokeWidth={1.25}
              strokeLinecap="round"
            />
            <circle
              cx={CX}
              cy={CY - 44}
              r={3.5}
              fill="var(--dmrv-dial-accent, #1e3a5f)"
              stroke="#f8fafc"
              strokeWidth={1.25}
            />
          </g>

          <g className="dmrv-selector-dial__center-knob" filter={`url(#${knobShadowFilter})`}>
            <ellipse cx={CX} cy={CY + 3} rx={KNOB_RADIUS + 1} ry={5} fill="rgba(15,23,42,0.18)" aria-hidden />
            <circle
              cx={CX}
              cy={CY}
              r={KNOB_RADIUS + 3}
              fill="none"
              stroke={`url(#${knobBezelGradient})`}
              strokeWidth={3.5}
            />
            {[0, 90, 180, 270].map((angle) => {
              const tick = polar(CX, CY, KNOB_RADIUS + 1.5, angle);
              const inner = polar(CX, CY, KNOB_RADIUS - 2, angle);
              return (
                <line
                  key={angle}
                  x1={tick.x}
                  y1={tick.y}
                  x2={inner.x}
                  y2={inner.y}
                  stroke="#64748b"
                  strokeWidth={1.25}
                  strokeLinecap="round"
                  opacity={0.65}
                />
              );
            })}
            <circle cx={CX} cy={CY} r={KNOB_RADIUS} fill={`url(#${knobBodyGradient})`} />
            <circle cx={CX} cy={CY} r={KNOB_RADIUS - 5} fill="#0f172a" opacity={0.22} />
            <path
              d={`M ${CX - KNOB_RADIUS + 6} ${CY - KNOB_RADIUS + 10} A ${KNOB_RADIUS - 4} ${KNOB_RADIUS - 4} 0 0 1 ${CX + KNOB_RADIUS - 6} ${CY - KNOB_RADIUS + 10}`}
              fill={`url(#${knobHighlightGradient})`}
              opacity={0.9}
            />
            <circle
              cx={CX}
              cy={CY}
              r={KNOB_RADIUS - 9}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
            />
            <text
              x={CX}
              y={CY + 4}
              textAnchor="middle"
              fill="#f8fafc"
              fontSize={8.5}
              fontWeight={800}
              letterSpacing="0.12em"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              DMRV
            </text>
          </g>
        </svg>
      </div>

      <ol className="mt-4 space-y-1.5">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-[11px] font-semibold transition-all duration-300 ${
                  active
                    ? 'bg-[#1e3a5f] text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100/90'
                }`}
              >
                {item.icon ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                    {item.icon}
                  </span>
                ) : (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/80"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                )}
                <span className="min-w-0 flex-1 leading-tight">{item.shortLabel ?? item.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </nav>
  );
}
