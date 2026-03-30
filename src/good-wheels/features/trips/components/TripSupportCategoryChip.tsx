import React from 'react';
import type { SupportCategory } from '../tripTypes';

const toneToStyle: Record<SupportCategory['tone'], { bg: string; fg: string; border: string }> = {
  trust: { bg: 'rgba(37,99,235,0.10)', fg: '#1d4ed8', border: 'rgba(37,99,235,0.22)' },
  safe: { bg: 'rgba(22,163,74,0.10)', fg: '#166534', border: 'rgba(22,163,74,0.22)' },
  pending: { bg: 'rgba(245,158,11,0.10)', fg: '#92400e', border: 'rgba(245,158,11,0.22)' },
  urgent: { bg: 'rgba(251,113,133,0.10)', fg: '#9f1239', border: 'rgba(251,113,133,0.22)' },
};

const TripSupportCategoryChip: React.FC<{ category: SupportCategory }> = ({ category }) => {
  const s = toneToStyle[category.tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        fontSize: 12,
        fontWeight: 800,
      }}
      title={category.description}
    >
      {category.label}
    </span>
  );
};

export default TripSupportCategoryChip;

