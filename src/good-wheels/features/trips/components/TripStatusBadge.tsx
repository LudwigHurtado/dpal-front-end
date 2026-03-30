import React from 'react';
import type { TripStatus } from '../tripTypes';
import { formatTripStatus } from '../tripUtils';

const toneByStatus: Record<TripStatus, { bg: string; fg: string; border: string }> = {
  draft: { bg: 'rgba(15,23,42,0.04)', fg: '#334155', border: 'rgba(15,23,42,0.10)' },
  requested: { bg: 'rgba(245,158,11,0.10)', fg: '#92400e', border: 'rgba(245,158,11,0.22)' },
  matched: { bg: 'rgba(37,99,235,0.10)', fg: '#1d4ed8', border: 'rgba(37,99,235,0.22)' },
  driver_assigned: { bg: 'rgba(37,99,235,0.10)', fg: '#1d4ed8', border: 'rgba(37,99,235,0.22)' },
  driver_arriving: { bg: 'rgba(37,99,235,0.10)', fg: '#1d4ed8', border: 'rgba(37,99,235,0.22)' },
  arrived: { bg: 'rgba(22,163,74,0.10)', fg: '#166534', border: 'rgba(22,163,74,0.22)' },
  in_progress: { bg: 'rgba(22,163,74,0.10)', fg: '#166534', border: 'rgba(22,163,74,0.22)' },
  support_in_progress: { bg: 'rgba(37,99,235,0.10)', fg: '#1d4ed8', border: 'rgba(37,99,235,0.22)' },
  completed: { bg: 'rgba(22,163,74,0.10)', fg: '#166534', border: 'rgba(22,163,74,0.22)' },
  canceled: { bg: 'rgba(251,113,133,0.10)', fg: '#9f1239', border: 'rgba(251,113,133,0.22)' },
  escalated: { bg: 'rgba(251,113,133,0.10)', fg: '#9f1239', border: 'rgba(251,113,133,0.22)' },
};

const TripStatusBadge: React.FC<{ status: TripStatus }> = ({ status }) => {
  const t = toneByStatus[status];
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
      {formatTripStatus(status)}
    </span>
  );
};

export default TripStatusBadge;

