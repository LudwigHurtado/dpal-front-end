import React from 'react';
import type { ForestIntegrityScanResponse } from '../types';
import {
  carbonLaneSummary,
  dataConfidencePercent,
  deforestationLanePoints20,
  deforestationLaneSummary,
  evidenceCompletenessPoints,
  fireLanePoints20,
  fireLaneSummary,
  overallIntegrityRiskBand,
} from '../utils/forestRiskMetrics';

type Props = {
  scan: ForestIntegrityScanResponse | null;
};

function CardShell({
  title,
  headline,
  subline,
  foot,
}: {
  title: string;
  headline: string;
  subline: string;
  foot?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm min-w-0 flex flex-col">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 truncate">{title}</p>
      <p className="mt-1.5 text-lg font-bold text-slate-900 tracking-tight truncate">{headline}</p>
      <p className="mt-0.5 text-xs text-slate-600 tabular-nums truncate">{subline}</p>
      {foot ? <p className="mt-1 text-[10px] text-slate-400 leading-snug line-clamp-2">{foot}</p> : null}
    </div>
  );
}

const ForestRiskSummaryCards: React.FC<Props> = ({ scan }) => {
  const overall = overallIntegrityRiskBand(scan);
  const defo = deforestationLaneSummary(scan);
  const defoPts = deforestationLanePoints20(scan);
  const fire = fireLaneSummary(scan);
  const firePts = fireLanePoints20(scan);
  const carbon = carbonLaneSummary(scan);
  const conf = dataConfidencePercent(scan);
  const evid = evidenceCompletenessPoints(scan);

  const evidLine =
    evid != null ? `${Math.round((evid / 10) * 100)}%` : scan ? 'N/A' : 'Awaiting scan';
  const evidBand =
    evid == null
      ? scan
        ? 'PARTIAL'
        : 'N/A'
      : evid >= 8
      ? 'GOOD'
      : evid >= 5
      ? 'FAIR'
      : 'LOW';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
      <CardShell
        title="Overall risk"
        headline={overall.band}
        subline={overall.scoreLine}
        foot={overall.detail}
      />
      <CardShell
        title="Deforestation risk"
        headline={defo.headline}
        subline={defoPts != null ? `${defoPts} / 20` : 'N/A'}
        foot={defo.subline}
      />
      <CardShell
        title="Fire risk"
        headline={fire.headline}
        subline={firePts != null ? `${firePts} / 20` : 'N/A'}
        foot={fire.subline}
      />
      <CardShell
        title="Carbon impact"
        headline={carbon.headline}
        subline={scan?.providers.gedi.status === 'not_configured' ? 'N/A' : 'See GEDI lane'}
        foot={carbon.subline}
      />
      <CardShell
        title="Data confidence"
        headline={conf != null ? `${conf}%` : 'N/A'}
        subline={conf != null ? 'Provider availability' : scan ? 'Unavailable' : 'Awaiting scan'}
      />
      <CardShell
        title="Evidence completeness"
        headline={evidBand}
        subline={evidLine}
        foot="Lane coverage (sentinel / FIRMS / GFW) from scan response."
      />
    </div>
  );
};

export default ForestRiskSummaryCards;
