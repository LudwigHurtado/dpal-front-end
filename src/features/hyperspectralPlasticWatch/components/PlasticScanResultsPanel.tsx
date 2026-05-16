import React from 'react';
import PaceSatelliteMetadataCard from './PaceSatelliteMetadataCard';
import PlasticRiskSummaryCards from './PlasticRiskSummaryCards';
import PlasticWatchReportAssistant from './PlasticWatchReportAssistant';
import SpectralSignaturePanel from './SpectralSignaturePanel';
import { PlasticValidationChecklist } from './PlasticValidationChecklist';
import { confidenceBandLabel } from '../utils/plasticAoiUtils';
import type { HyperspectralPlasticScanResponse, PlasticEvidencePacketResponse } from '../types';

type Props = {
  scan: HyperspectralPlasticScanResponse | null;
  evidence: PlasticEvidencePacketResponse | null;
  cacheNotice: string | null;
  onOpenChat?: () => void;
};

export function PlasticScanResultsPanel({ scan, evidence, cacheNotice, onOpenChat }: Props): React.ReactElement {
  if (!scan) {
    return (
      <ResultsEmpty />
    );
  }

  const score = scan.plasticRisk.score;
  const band = confidenceBandLabel(score);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">5. Scan results — candidate plastic-risk zones</h2>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
          DPAL identified a <strong>candidate plastic-risk zone</strong> based on surface reflectance behavior, location
          context, and mission configuration. This result should be reviewed with drone imagery, field photos, cleanup
          reports, or sample confirmation before final claims.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-2">
            <span className="text-slate-500">Confidence</span>
            <p className="font-semibold text-slate-900">{score != null ? `${score} — ${band}` : band}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <span className="text-slate-500">Scan status</span>
            <p className="font-semibold text-slate-900">{scan.riskLevel.replace(/_/g, ' ')}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <span className="text-slate-500">Signal</span>
            <p className="font-semibold text-slate-900">{scan.spectralSignals.plasticRiskSignal.replace(/_/g, ' ')}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <span className="text-slate-500">Scan ID</span>
            <p className="font-mono text-[10px] font-semibold text-slate-900 truncate">{scan.scanId}</p>
          </div>
        </div>
        {cacheNotice ? <p className="mt-2 text-[10px] text-cyan-800">{cacheNotice}</p> : null}
        <p className="mt-2 text-[10px] text-slate-600">
          <span className="font-semibold">Limitations:</span> {scan.limitations.slice(0, 2).join(' ') || scan.plasticRisk.message}
        </p>
        <p className="mt-1 text-[10px] font-medium text-sky-900">
          Recommended next action: {scan.evidencePacket.nextActions?.[0] ?? 'Complete field validation checklist below.'}
        </p>
      </div>

      <PlasticRiskSummaryCards scan={scan} />
      <PlasticWatchReportAssistant scan={scan} evidence={evidence} onOpenChat={onOpenChat} />
      <PaceSatelliteMetadataCard scan={scan} fromCache={Boolean(cacheNotice)} />
      <SpectralSignaturePanel scan={scan} />
      <PlasticValidationChecklist />
    </div>
  );
}

function ResultsEmpty(): React.ReactElement {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center">
      <p className="text-sm font-semibold text-slate-800">No scan results yet</p>
      <p className="mt-1 text-[11px] text-slate-600">
        Save an AOI polygon, confirm satellite readiness, then run the plastic intelligence scan.
      </p>
    </div>
  );
}
