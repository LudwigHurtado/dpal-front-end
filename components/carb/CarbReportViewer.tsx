import React, { useEffect, useMemo, useState } from 'react';
import { getCarbReport } from '../../services/carbReportService';
import { parseCarbReportIdFromPath } from '../../utils/appRoutes';
import { downloadCarbReportPdf } from '../../services/carbPdfReportService';
import { updateCarbReportPdfHash } from '../../services/carbReportLedgerService';
import type { CarbSpecializedReport } from '../../types/carbReport';
import CarbReportQRCode from './CarbReportQRCode';

interface CarbReportViewerProps {
  reportId?: string | null;
  onReturn: () => void;
  onOpenSituationRoom?: (roomId: string) => void;
}

function text(value: unknown, fallback = 'Not available'): string {
  if (value == null) return fallback;
  const parsed = String(value).trim();
  return parsed || fallback;
}

export default function CarbReportViewer({
  reportId,
  onReturn,
  onOpenSituationRoom,
}: CarbReportViewerProps): React.ReactElement {
  const resolvedId = useMemo(() => reportId ?? parseCarbReportIdFromPath(window.location.pathname), [reportId]);
  const [report, setReport] = useState<CarbSpecializedReport | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);

  useEffect(() => {
    if (!resolvedId) {
      setReport(null);
      return;
    }
    setReport(getCarbReport(resolvedId));
  }, [resolvedId]);

  const handleDownload = async (): Promise<void> => {
    if (!report || downloadBusy) return;
    setDownloadBusy(true);
    try {
      const pdf = await downloadCarbReportPdf(report);
      const updated = updateCarbReportPdfHash(report.reportId, pdf.pdfHash);
      if (updated) setReport(updated);
    } finally {
      setDownloadBusy(false);
    }
  };

  if (!report) {
    return (
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-800 bg-slate-950/90 p-8 text-slate-200">
        <button type="button" onClick={onReturn} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">
          Back
        </button>
        <h1 className="mt-4 text-2xl font-black text-white">CARB specialized report not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-6 text-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">DPAL CARB Specialized Emissions Report</p>
            <h1 className="mt-1 text-3xl font-black text-white">Verification Viewer</h1>
            <p className="mt-2 text-sm text-slate-400">Report ID: {report.reportId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onReturn} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">Back</button>
            <button type="button" onClick={handleDownload} disabled={downloadBusy} className="rounded-xl border border-emerald-500/40 bg-emerald-900/20 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-50">
              {downloadBusy ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button type="button" onClick={() => onOpenSituationRoom?.(report.situationRoom.roomId)} className="rounded-xl border border-violet-500/40 bg-violet-900/20 px-3 py-2 text-sm font-semibold text-violet-100">
              Open Situation Room
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5 text-sm text-slate-300">
          <h2 className="text-lg font-bold text-white">Facility and Emissions Summary</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <p>Facility: {text(report.facilityIdentity.facilityName)}</p>
            <p>Operator: {text(report.facilityIdentity.operatorName)}</p>
            <p>Facility ID: {text(report.facilityIdentity.facilityId)}</p>
            <p>County / City: {text(report.location.county)} / {text(report.location.city)}</p>
            <p>Baseline / Current years: {report.reportingYears.baselineYear} / {report.reportingYears.currentYear}</p>
            <p>Baseline / Current CO2e: {report.emissionsComparison.baselineCO2e} / {report.emissionsComparison.currentCO2e}</p>
            <p>Claim result: {text(report.claimVerificationResult)}</p>
            <p>Integrity / Risk: {text(report.integrityScore)} / {text(report.riskLevel)}</p>
          </div>
          <h3 className="mt-5 text-base font-bold text-white">Legal disclaimer</h3>
          <p className="mt-2">{report.disclaimer}</p>
        </section>
        <CarbReportQRCode report={report} />
      </div>
    </div>
  );
}
