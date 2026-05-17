import React from 'react';
import { Link } from 'react-router-dom';
import type { DmrvProjectContext } from '../services/dmrvProjectContextTypes';
import { formatReportingPeriod } from '../services/dmrvProjectContextService';
import { dmrvProjectConfigPath } from '../dmrvNavigation';

export function DmrvProjectContextBanner({
  project,
}: {
  project: DmrvProjectContext;
}): React.ReactElement {
  const locationLabel =
    project.location.countryRegion.trim() ||
    project.location.aoiSummary.trim() ||
    project.location.aoiId.trim() ||
    (project.location.latitude && project.location.longitude
      ? `${project.location.latitude}, ${project.location.longitude}`
      : '—');

  return (
    <div className="mb-4 rounded-xl border border-[#1e3a5f]/25 bg-[#f8fafc] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">Project context</p>
      <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <Item label="Project" value={project.projectName || project.projectId} />
        <Item label="Location / AOI" value={locationLabel} />
        <Item label="Methodology" value={project.methodology.name || '—'} />
        <Item label="Reporting period" value={formatReportingPeriod(project)} />
        <Item label="Blockchain project ID" value={project.blockchain.ledgerRecordId || project.projectId} mono />
        <Item label="Config hash" value={project.blockchain.configHash?.slice(0, 16) ?? '—'} mono />
      </dl>
      <Link
        to={dmrvProjectConfigPath(project.projectId)}
        className="mt-2 inline-block text-xs font-semibold text-[#1e3a5f] underline"
      >
        Edit project configuration
      </Link>
    </div>
  );
}

function Item({ label, value, mono }: { label: string; value: string; mono?: boolean }): React.ReactElement {
  return (
    <div>
      <dt className="font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
