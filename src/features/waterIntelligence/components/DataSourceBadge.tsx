import React from 'react';
import type { WaterDataSourceLabel } from '../services/waterIntelligenceTypes';
import { formatDataSourceLabel } from '../services/waterIntelligenceLabels';

export default function DataSourceBadge({
  label,
  className = '',
}: {
  label: WaterDataSourceLabel;
  className?: string;
}): React.ReactElement {
  const isHuman = label === 'human_verified';
  const isChain = label === 'blockchain_anchored';
  const isFallback = label === 'fallback';
  const isMock = label === 'mock_demo';
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${className}`}
      style={{
        background: isMock ? 'rgba(245,158,11,0.15)' : isFallback ? 'rgba(248,113,113,0.12)' : 'rgba(148,163,184,0.12)',
        color: isMock ? '#fde68a' : isFallback ? '#fecaca' : '#cbd5e1',
        borderColor: isMock ? 'rgba(245,158,11,0.35)' : 'rgba(148,163,184,0.35)',
      }}
      title={
        isHuman || isChain
          ? 'Shown only when explicitly true on the underlying record.'
          : formatDataSourceLabel(label)
      }
    >
      {formatDataSourceLabel(label)}
    </span>
  );
}
