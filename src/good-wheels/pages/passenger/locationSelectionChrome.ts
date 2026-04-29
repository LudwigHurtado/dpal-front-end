import type { CSSProperties } from 'react';

/** Premium green / red chrome for pickup vs drop-off (passenger map sheet). */
const P = {
  green: {
    solid: '#16A34A',
    text: '#166534',
    textStrong: '#14532d',
    fill: 'rgba(220, 252, 231, 0.78)',
    fillSoft: 'rgba(220, 252, 231, 0.38)',
    borderSoft: 'rgba(22, 163, 74, 0.45)',
  },
  red: {
    solid: '#DC2626',
    text: '#B91C1C',
    textStrong: '#991B1B',
    fill: 'rgba(254, 226, 226, 0.78)',
    fillSoft: 'rgba(254, 226, 226, 0.38)',
    borderSoft: 'rgba(220, 38, 38, 0.45)',
  },
  neutral: {
    border: 'rgba(148, 163, 184, 0.55)',
    fill: 'rgba(255, 255, 255, 0.38)',
    text: '#64748B',
    dot: '#94A3B8',
  },
} as const;

/** Compact single-row mode switch: Pick up (green) | Drop off (red). */
export function locationModeSegmentBar(): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'stretch',
    borderRadius: 12,
    overflow: 'hidden',
    border: `1px solid ${P.neutral.border}`,
    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06)',
    background: 'rgba(255, 255, 255, 0.72)',
  };
}

export function locationModeSegment(role: 'pickup' | 'dropoff', active: boolean): CSSProperties {
  const c = role === 'pickup' ? P.green : P.red;
  return {
    flex: 1,
    minWidth: 0,
    padding: '7px 8px',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.02em',
    border: 'none',
    borderRight: role === 'pickup' ? `1px solid ${P.neutral.border}` : 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center',
    lineHeight: 1.2,
    background: active ? c.fill : 'transparent',
    color: active ? c.textStrong : P.neutral.text,
    boxShadow: active ? `inset 0 -2px 0 0 ${c.solid}` : 'none',
    transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
  };
}

export function modeToggleBox(role: 'pickup' | 'dropoff', active: boolean): CSSProperties {
  const c = role === 'pickup' ? P.green : P.red;
  return {
    flex: 1,
    minWidth: 0,
    padding: '10px 12px',
    borderRadius: 12,
    border: active ? `2px solid ${c.solid}` : `1px solid ${P.neutral.border}`,
    background: active ? c.fill : P.neutral.fill,
    color: active ? c.textStrong : P.neutral.text,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'center',
    lineHeight: 1.25,
    fontFamily: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.15s, background 0.15s, color 0.15s',
    boxShadow: active ? (role === 'pickup' ? '0 1px 0 rgba(22, 163, 74, 0.12)' : '0 1px 0 rgba(220, 38, 38, 0.12)') : 'none',
  };
}

export function addressRowChrome(
  role: 'pickup' | 'dropoff',
  active: boolean,
  hasPlace: boolean,
): CSSProperties {
  const c = role === 'pickup' ? P.green : P.red;
  const strong = active;
  const soft = !active && hasPlace;
  const idle = !active && !hasPlace;
  const border = strong
    ? `2px solid ${c.solid}`
    : soft
      ? `1px solid ${c.borderSoft}`
      : idle
        ? `1px solid ${role === 'pickup' ? 'rgba(22, 163, 74, 0.32)' : 'rgba(220, 38, 38, 0.32)'}`
        : `1px solid ${P.neutral.border}`;
  const background = strong ? c.fill : soft ? c.fillSoft : idle ? (role === 'pickup' ? 'rgba(220, 252, 231, 0.14)' : 'rgba(254, 226, 226, 0.14)') : 'rgba(255, 255, 255, 0.78)';
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderRadius: 12,
    border,
    background,
    boxShadow: strong ? (role === 'pickup' ? 'inset 0 0 0 1px rgba(22,163,74,0.06)' : 'inset 0 0 0 1px rgba(220,38,38,0.06)') : undefined,
    transition: 'border-color 0.15s, background 0.15s',
  };
}

export function roleLabelStyle(role: 'pickup' | 'dropoff', prominent: boolean): CSSProperties {
  const c = role === 'pickup' ? P.green : P.red;
  return {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.02em',
    color: c.text,
    opacity: prominent ? 1 : 0.55,
    marginBottom: 4,
    marginTop: role === 'dropoff' ? 4 : 0,
  };
}

export function roleDotColor(role: 'pickup' | 'dropoff', prominent: boolean): string {
  const c = role === 'pickup' ? P.green : P.red;
  return prominent ? c.solid : P.neutral.dot;
}

export function roleGpsIconColor(role: 'pickup' | 'dropoff', prominent: boolean): string {
  const c = role === 'pickup' ? P.green : P.red;
  return prominent ? c.solid : P.neutral.text;
}
