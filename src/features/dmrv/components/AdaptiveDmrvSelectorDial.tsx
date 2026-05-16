import React, { useCallback, useMemo } from 'react';
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
const GRADIENT_ID = 'dmrv-knob-gradient';

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
            <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
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
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - 40}
              stroke="#e2e8f0"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - 40}
              stroke="#334155"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <circle cx={CX} cy={CY - 40} r={2.5} fill="#f8fafc" stroke="#64748b" strokeWidth={1} />
          </g>

          <circle
            cx={CX}
            cy={CY}
            r={26}
            className="dmrv-selector-dial__center-knob"
            fill={`url(#${GRADIENT_ID})`}
            stroke="#ffffff"
            strokeWidth={2}
          />
          <text
            x={CX}
            y={CY + 4}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={9}
            fontWeight={800}
            letterSpacing="0.08em"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            DMRV
          </text>
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
