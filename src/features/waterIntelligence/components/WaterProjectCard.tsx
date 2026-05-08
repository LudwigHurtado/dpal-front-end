import React from 'react';
import type { WaterConservationProject } from '../services/waterIntelligenceTypes';
import DataSourceBadge from './DataSourceBadge';
import WaterStatusBadge from './WaterStatusBadge';
import { formatTransactionCategory } from '../services/waterIntelligenceLabels';

function getRecommendedNextAction(projectId: string): string {
  if (projectId === 'WI-CO-GV-AG-001') return 'Complete water-right documentation and validator review.';
  if (projectId === 'WI-CO-DEN-URB-002')
    return 'Confirm turf-conversion evidence and municipal conservation assumptions.';
  if (projectId === 'WI-CO-CBT-LEASE-003')
    return 'Review lease eligibility and authority approval pathway.';
  if (projectId === 'WI-CO-RES-SYS-004')
    return 'Clarify whether saved water is assigned to system enhancement or archived conservation.';
  return 'Review evidence completeness and authority pathway before any formal claim.';
}

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
      <p className="text-[11px] dpal-text-secondary leading-relaxed">
        <span className="font-semibold">Method:</span> {project.method}
        <span className="px-1">·</span>
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
        <div>
          <dt className="dpal-text-muted">Estimated savings</dt>
          <dd style={{ color: 'var(--dpal-text-primary)' }}>
            {(project.baselineUseAF - project.currentMonitoredUseAF).toLocaleString()} AF
          </dd>
        </div>
        <div>
          <dt className="dpal-text-muted">Evidence status</dt>
          <dd className="capitalize" style={{ color: 'var(--dpal-text-primary)' }}>
            {project.evidenceStatus}
          </dd>
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
      <div className="flex flex-wrap gap-1">
        {project.dataSourceLabels.map((l) => (
          <DataSourceBadge key={l} label={l} />
        ))}
        {project.humanVerified && <DataSourceBadge label="human_verified" />}
        {project.blockchainAnchored && <DataSourceBadge label="blockchain_anchored" />}
      </div>
      <p className="text-[11px] dpal-text-secondary leading-relaxed border-t dpal-border-subtle pt-2">
        <span className="font-semibold dpal-text-muted">Recommended next action:</span>{' '}
        {getRecommendedNextAction(project.id)}
      </p>
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
