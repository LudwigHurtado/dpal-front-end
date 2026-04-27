import React from 'react';
import type { CarbSpecializedReport } from '../../types/carbReport';
import CarbReportQRCode from './CarbReportQRCode';

interface CarbReportPanelProps {
  report: CarbSpecializedReport | null;
  canGenerate: boolean;
  busy?: boolean;
  notice?: string | null;
  onGenerateReport: () => void;
  onDownloadPdf: () => void;
  onOpenReport: () => void;
  onOpenSituationRoom: () => void;
  onExportEvidencePacket: () => void;
}

function statusChip(label: string, tone: 'ready' | 'pending' | 'review'): string {
  const palette = {
    ready: 'border-emerald-500/40 bg-emerald-900/20 text-emerald-200',
    pending: 'border-amber-500/40 bg-amber-900/20 text-amber-200',
    review: 'border-cyan-500/40 bg-cyan-900/20 text-cyan-200',
  } as const;
  return `inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${palette[tone]}`;
}

export default function CarbReportPanel({
  report,
  canGenerate,
  busy = false,
  notice,
  onGenerateReport,
  onDownloadPdf,
  onOpenReport,
  onOpenSituationRoom,
  onExportEvidencePacket,
}: CarbReportPanelProps): React.ReactElement {
  const reportStatus = report ? 'Generated' : canGenerate ? 'Ready' : 'Pending';
  const dataSourceStatus = report?.sourceMode ?? 'Pending';
  const pdfReady = Boolean(report?.hashes.pdfHash);
  const qrReady = Boolean(report?.qr.qrCodeDataUrl);
  const roomReady = Boolean(report?.situationRoom.roomId);

  return (
    <section className="rounded-[1.75rem] border border-cyan-500/20 bg-slate-950/80 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">CARB Specialized Report</p>
          <h3 className="mt-1 text-xl font-black text-white">DPAL CARB Specialized Report</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Level 1: Generate a readable, professional investor/legal/regulatory report. Level 2: Export the full evidence packet JSON with calculations and limitations. Level 3: Open the CARB Situation Room for ongoing regulator-ready investigation.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-900/15 px-3 py-2 text-xs text-cyan-100">
              <p className="font-semibold">Level 1: CARB Specialized Report</p>
              <p className="mt-1 text-cyan-200/90">Readable professional summary for investors, legal teams, and regulators.</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/15 px-3 py-2 text-xs text-emerald-100">
              <p className="font-semibold">Level 2: Evidence Packet</p>
              <p className="mt-1 text-emerald-200/90">Full JSON/data bundle with sources, calculations, checklist, and limitations.</p>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-900/15 px-3 py-2 text-xs text-violet-100">
              <p className="font-semibold">Level 3: Situation Room</p>
              <p className="mt-1 text-violet-200/90">Ongoing review space for notes, documents, evidence, and legal/regulatory prep.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGenerateReport}
          disabled={!canGenerate || busy}
          className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Generating report...' : 'Generate CARB Report'}
        </button>
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={!report || busy}
          className="rounded-xl border border-emerald-500/40 bg-emerald-900/20 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-50"
        >
          Download PDF Report
        </button>
        <button
          type="button"
          onClick={onOpenReport}
          disabled={!report || busy}
          className="rounded-xl border border-cyan-500/40 bg-cyan-900/20 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50"
        >
          View Verification Page
        </button>
        <button
          type="button"
          onClick={onOpenSituationRoom}
          disabled={!report || busy}
          className="rounded-xl border border-violet-500/40 bg-violet-900/20 px-4 py-2 text-sm font-semibold text-violet-100 disabled:opacity-50"
        >
          Open Situation Room
        </button>
        <button
          type="button"
          onClick={onExportEvidencePacket}
          className="rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-100"
        >
          Export Evidence Packet JSON
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Report Status</p>
          <p className="mt-3">{statusChip(reportStatus, report ? 'ready' : 'pending')}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Data Source Status</p>
          <p className="mt-3">{statusChip(dataSourceStatus, report ? 'review' : 'pending')}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">PDF Status</p>
          <p className="mt-3">{statusChip(pdfReady ? 'Ready' : 'Pending', pdfReady ? 'ready' : 'pending')}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">QR Verification</p>
          <p className="mt-3">{statusChip(qrReady ? 'Ready' : 'Pending', qrReady ? 'ready' : 'pending')}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Situation Room</p>
          <p className="mt-3">{statusChip(roomReady ? 'Ready' : 'Pending', roomReady ? 'review' : 'pending')}</p>
        </article>
      </div>

      {report ? (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
            <p className="font-semibold text-white">Report ID</p>
            <p className="mt-1 break-all">{report.reportId}</p>
            <p className="mt-3 font-semibold text-white">Facility</p>
            <p className="mt-1">{report.facilityIdentity.facilityName} ({report.facilityIdentity.facilityId})</p>
            <p className="mt-3 font-semibold text-white">Disclaimer</p>
            <p className="mt-1">{report.disclaimer}</p>
          </div>
          <CarbReportQRCode report={report} />
        </div>
      ) : null}

      {notice ? (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-900/15 px-3 py-2 text-xs text-amber-100">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
