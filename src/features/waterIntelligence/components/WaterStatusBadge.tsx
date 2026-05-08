import React from 'react';
import type { WaterProjectStatus } from '../services/waterIntelligenceTypes';
import { formatProjectStatus } from '../services/waterIntelligenceLabels';

export default function WaterStatusBadge({ status }: { status: WaterProjectStatus }): React.ReactElement {
  return (
    <span
      className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold capitalize border dpal-border-subtle"
      style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-secondary)' }}
    >
      {formatProjectStatus(status)}
    </span>
  );
}
