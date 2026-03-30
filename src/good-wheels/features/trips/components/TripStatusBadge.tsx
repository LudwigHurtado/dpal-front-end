import React from 'react';
import type { TripStatus } from '../tripTypes';
import { TRIP_BADGE_TONE, TRIP_STATUS_LABEL, type TripBadgeTone } from '../tripConstants';

const toneStyle: Record<TripBadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: 'rgba(15,23,42,0.04)', fg: '#334155', border: 'rgba(15,23,42,0.10)' },
  info: { bg: 'rgba(37,99,235,0.10)', fg: '#1d4ed8', border: 'rgba(37,99,235,0.22)' },
  success: { bg: 'rgba(22,163,74,0.10)', fg: '#166534', border: 'rgba(22,163,74,0.22)' },
  warning: { bg: 'rgba(245,158,11,0.10)', fg: '#92400e', border: 'rgba(245,158,11,0.22)' },
  danger: { bg: 'rgba(251,113,133,0.10)', fg: '#9f1239', border: 'rgba(251,113,133,0.22)' },
};

const TripStatusBadge: React.FC<{ status: TripStatus }> = ({ status }) => {
  const t = toneStyle[TRIP_BADGE_TONE[status]];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.border}`,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '0.02em',
      }}
    >
      {TRIP_STATUS_LABEL[status]}
    </span>
  );
};

export default TripStatusBadge;

