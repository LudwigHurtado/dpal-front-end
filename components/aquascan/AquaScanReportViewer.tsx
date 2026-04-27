import React, { useEffect, useMemo, useState } from 'react';
import type { AquaScanEvidenceReport } from '../../types/aquascanReport';
import { getAquaScanEvidenceReport } from '../../services/aquascanReportService';
import { downloadAquaScanEvidencePdf } from '../../services/aquascanPdfReportService';
import { updateAquaScanReportPdfHash } from '../../services/aquascanReportLedgerService';
import { parseAquaScanReportIdFromPath } from '../../utils/appRoutes';
import AquaScanReportQRCode from './AquaScanReportQRCode';

interface AquaScanReportViewerProps {
  reportId?: string | null;
  onBack: () => void;
  onOpenSituationRoom: (roomId: string) => void;
}

function display(value: unknown, fallback = 'Not available'): string {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

export default function AquaScanReportViewer({
  reportId,
  onBack,
  onOpenSituationRoom,
}: AquaScanReportViewerProps): React.ReactElement {
  const resolvedId = useMemo(() => reportId ?? parseAquaScanReportIdFromPath(window.location.pathname), [reportId]);
  const [report, setReport] = useState<AquaScanEvidenceReport | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);

  useEffect(() => {
    if (!resolvedId) {
      setReport(null);
      return;
    }
    setReport(getAquaScanEvidenceReport(resolvedId));
  }, [resolvedId]);

  const handleDownload = async (): Promise<void> => {
    if (!report || downloadBusy) return;
    setDownloadBusy(true);
    try {
      const pdf = await downloadAquaScanEvidencePdf(report);
      const updated = updateAquaScanReportPdfHash(report.reportId, pdf.pdfHash);
      if (updated) setReport(updated);
    } finally {
      setDownloadBusy(false);
    }
  };

  if (!report) {
    return (
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-800 bg-slate-950/90 p-8 text-slate-200">
        <button type="button" onClick={onBack} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">
          Back
        </button>
        <h1 className="mt-4 text-2xl font-black text-white">AquaScan report not found</h1>
        <p className="mt-2 text-sm text-slate-400">
          This verification route is local/internal until backend storage for AquaScan reports is connected.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-6 text-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">DPAL AquaScan Evidence Report</p>
            <h1 className="mt-1 text-3xl font-black text-white">Verification Viewer</h1>
            <p className="mt-2 text-sm text-slate-400">Report ID: {report.reportId}</p>
            <p className="text-sm text-slate-400">Project: {display(report.projectName, display(report.projectId))}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBack} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">
              Back
            </button>
            <button type="button" onClick={handleDownload} disabled={downloadBusy} className="rounded-xl border border-emerald-500/40 bg-emerald-900/20 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-50">
              {downloadBusy ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button type="button" onClick={() => onOpenSituationRoom(report.situationRoom.roomId)} className="rounded-xl border border-violet-500/40 bg-violet-900/20 px-3 py-2 text-sm font-semibold text-violet-100">
              Open Situation Room
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5">
            <h2 className="text-lg font-bold text-white">Executive Summary</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{report.aiIntelligence.summary}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                <p className="font-semibold text-white">Risk level</p>
                <p className="mt-2">{display(report.aiIntelligence.riskLevel)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                <p className="font-semibold text-white">Confidence</p>
                <p className="mt-2">{report.aquaScanResult.confidence != null ? `${Math.round(report.aquaScanResult.confidence * 100)}%` : 'Not available'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                <p className="font-semibold text-white">Verification status</p>
                <p className="mt-2">{report.ledger.verificationStatus}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5">
            <h2 className="text-lg font-bold text-white">AquaScan Readings</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="pb-2 pr-4">Index</th>
                    <th className="pb-2 pr-4">Before</th>
                    <th className="pb-2 pr-4">After</th>
                    <th className="pb-2 pr-4">Change</th>
                    <th className="pb-2">Percent</th>
                  </tr>
                </thead>
                <tbody>
                  {(['ndwi', 'ndvi', 'ndmi', 'nbr'] as const).map((key) => {
                    const reading = report.aquaScanResult.indices[key];
                    return (
                      <tr key={key} className="border-t border-slate-800">
                        <td className="py-2 pr-4 font-semibold uppercase text-white">{key}</td>
                        <td className="py-2 pr-4">{display(reading?.before)}</td>
                        <td className="py-2 pr-4">{display(reading?.after)}</td>
                        <td className="py-2 pr-4">{display(reading?.change)}</td>
                        <td className="py-2">{display(reading?.percentChange)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5">
            <h2 className="text-lg font-bold text-white">Satellite Metadata</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <p className="text-sm text-slate-300">Source: {display(report.satelliteMetadata.source)}</p>
              <p className="text-sm text-slate-300">Provider: {display(report.satelliteMetadata.provider)}</p>
              <p className="text-sm text-slate-300">Product: {display(report.satelliteMetadata.product)}</p>
              <p className="text-sm text-slate-300">Layer: {display(report.satelliteMetadata.layerName)}</p>
              <p className="text-sm text-slate-300">Acquisition date: {display(report.satelliteMetadata.acquisitionDate)}</p>
              <p className="text-sm text-slate-300">Resolution: {display(report.satelliteMetadata.resolution)}</p>
              <p className="text-sm text-slate-300">Cloud cover: {display(report.satelliteMetadata.cloudCover)}</p>
              <p className="text-sm text-slate-300">AOI area: {display(report.aquaScanResult.areaSqKm)}</p>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5">
            <h2 className="text-lg font-bold text-white">Hashes & Ledger</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <p className="break-all text-sm text-slate-300">Report payload hash: {display(report.hashes.reportPayloadHash)}</p>
              <p className="break-all text-sm text-slate-300">PDF hash: {display(report.hashes.pdfHash, 'Pending after PDF generation')}</p>
              <p className="break-all text-sm text-slate-300">Evidence hash: {display(report.hashes.evidenceHash)}</p>
              <p className="break-all text-sm text-slate-300">Previous block hash: {display(report.hashes.previousBlockHash)}</p>
              <p className="break-all text-sm text-slate-300">Current block hash: {display(report.hashes.blockHash)}</p>
              <p className="text-sm text-slate-300">Block ID: {display(report.ledger.blockId)}</p>
              <p className="text-sm text-slate-300">Verification status: {display(report.ledger.verificationStatus)}</p>
              <p className="text-sm text-slate-300">Transaction ID: {display(report.ledger.transactionId)}</p>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <AquaScanReportQRCode report={report} />
          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5">
            <h2 className="text-lg font-bold text-white">Situation Room</h2>
            <p className="mt-2 text-sm text-slate-400">Room ID: {report.situationRoom.roomId}</p>
            <p className="mt-1 text-sm text-slate-400">Status: {report.situationRoom.status}</p>
            <button type="button" onClick={() => onOpenSituationRoom(report.situationRoom.roomId)} className="mt-4 rounded-xl border border-violet-500/40 bg-violet-900/20 px-3 py-2 text-sm font-semibold text-violet-100">
              Open Situation Room
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
