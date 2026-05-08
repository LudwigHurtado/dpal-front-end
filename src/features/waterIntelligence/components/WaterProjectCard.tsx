import React from 'react';
import type { WaterConservationProject } from '../services/waterIntelligenceTypes';
import DataSourceBadge from './DataSourceBadge';
import WaterStatusBadge from './WaterStatusBadge';
import { formatTransactionCategory } from '../services/waterIntelligenceLabels';

export default function WaterProjectCard({
  project,
  onOpen,
}: {
  project: WaterConservationProject;
  onOpen?: (id: string) => void;
}): React.ReactElement {
  return (
    <article
      className="rounded-2xl p-4 border dpal-border-subtle space-y-2"
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
          {project.name}
        </h3>
        <WaterStatusBadge status={project.status} />
      </div>
      <p className="text-[11px] dpal-text-secondary">
        <span className="font-semibold">Method:</span> {project.method}
      </p>
      <p className="text-[11px] dpal-text-secondary">
        <span className="font-semibold">Geography:</span> {project.geography}
      </p>
      <p className="text-[11px] dpal-text-secondary">
        <span className="font-semibold">Goal:</span> {project.goal}
      </p>
      <dl className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <dt className="dpal-text-muted">Baseline use</dt>
          <dd style={{ color: 'var(--dpal-text-primary)' }}>{project.baselineUseAF.toLocaleString()} AF</dd>
        </div>
        <div>
          <dt className="dpal-text-muted">Current monitored</dt>
          <dd style={{ color: 'var(--dpal-text-primary)' }}>{project.currentMonitoredUseAF.toLocaleString()} AF</dd>
        </div>
      </dl>
      <div>
        <div className="text-[10px] font-bold uppercase dpal-text-muted mb-1">Transaction options (demo)</div>
        <div className="flex flex-wrap gap-1">
          {project.transactionOptions.map((c) => (
            <span
              key={c}
              className="text-[10px] px-1.5 py-0.5 rounded border dpal-border-subtle"
              style={{ background: 'var(--dpal-surface-alt)' }}
            >
              {formatTransactionCategory(c)}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase dpal-text-muted mb-1">Evidence</div>
        <span className="text-[11px] capitalize" style={{ color: 'var(--dpal-text-secondary)' }}>
          {project.evidenceStatus}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {project.dataSourceLabels.map((l) => (
          <DataSourceBadge key={l} label={l} />
        ))}
      </div>
      {onOpen && (
        <button
          type="button"
          onClick={() => onOpen(project.id)}
          className="mt-1 text-[11px] font-bold underline-offset-2 hover:underline"
          style={{ color: 'var(--dpal-primary)' }}
        >
          View project context (demo)
        </button>
      )}
    </article>
  );
}
