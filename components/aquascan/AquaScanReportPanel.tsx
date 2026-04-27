import React from 'react';
import type { AquaScanEvidenceReport } from '../../types/aquascanReport';
import AquaScanReportQRCode from './AquaScanReportQRCode';

interface AquaScanReportPanelProps {
  title?: string;
  sourceContext?: 'compare' | 'evidence';
  canGenerate?: boolean;
  readinessLabel?: string;
  generateLabel?: string;
  ledgerLabel?: string;
  report: AquaScanEvidenceReport | null;
  busy?: boolean;
  notice?: string | null;
  allowWithoutEvidencePacket?: boolean;
  onGenerate: () => void;
  onLogLedger?: () => void;
  onDownloadPdf: () => void;
  onOpenReport: () => void;
  onOpenSituationRoom: () => void;
}

function statusChip(label: string, tone: 'ready' | 'pending' | 'logged' | 'review' | 'backend'): string {
  const palette = {
    ready: 'border-emerald-500/40 bg-emerald-900/20 text-emerald-200',
    pending: 'border-amber-500/40 bg-amber-900/20 text-amber-200',
    logged: 'border-cyan-500/40 bg-cyan-900/20 text-cyan-200',
    review: 'border-violet-500/40 bg-violet-900/20 text-violet-200',
    backend: 'border-slate-600 bg-slate-900/50 text-slate-300',
  } as const;
  return `inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${palette[tone]}`;
}

export default function AquaScanReportPanel({
  title = 'DPAL AquaScan Evidence Report',
  sourceContext = 'evidence',
  canGenerate = true,
  readinessLabel = 'Report: Ready to generate',
  generateLabel = 'Generate PDF + QR Report',
  ledgerLabel = 'Log Reading to DPAL Ledger',
  report,
  busy = false,
  notice,
  allowWithoutEvidencePacket = false,
  onGenerate,
  onLogLedger,
  onDownloadPdf,
  onOpenReport,
  onOpenSituationRoom,
}: AquaScanReportPanelProps): React.ReactElement {
  const reportStatus = canGenerate ? (report ? 'Ready' : 'Ready to generate') : 'Pending';
  const ledgerStatus = report?.ledger.verificationStatus === 'logged' ? 'Logged' : 'Pending';
  const pdfStatus = report?.hashes.pdfHash ? 'Ready' : 'Pending';
  const qrStatus = report?.qr.qrCodeDataUrl ? 'Ready' : 'Pending';
  const roomStatus = report?.situationRoom.status === 'open' ? 'Open' : 'Pending';
  const evidenceStatus = report?.evidencePacket.status === 'generated'
    ? 'Generated'
    : report?.evidencePacket.status === 'partial'
      ? 'Partial'
      : 'Optional / Not generated';

  return (
    <section className="rounded-[1.75rem] border border-cyan-500/20 bg-slate-950/80 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">Evidence Report & Blockchain Log</p>
          <h3 className="mt-1 text-xl font-black text-white">{title}</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Build a professional AquaScan report, log it on the DPAL Evidence Ledger, generate a QR verification route, and open a project-specific Situation Room.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={statusChip(readinessLabel, canGenerate ? 'ready' : 'pending')}>{readinessLabel}</span>
            <span className={statusChip('Evidence Packet Optional', allowWithoutEvidencePacket ? 'review' : 'pending')}>Evidence Packet Optional</span>
            <span className={statusChip(sourceContext === 'compare' ? 'Compare Source' : 'Evidence Source', 'backend')}>
              {sourceContext === 'compare' ? 'Compare Source' : 'Evidence Source'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Optional: Generate a deeper Evidence Packet with attachments and validator material. You can create a PDF/QR report before this step.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={busy || !canGenerate}
            className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Generating report...' : generateLabel}
          </button>
          {onLogLedger ? (
            <button
              type="button"
              onClick={onLogLedger}
              disabled={busy || !canGenerate}
              className="rounded-xl border border-violet-500/40 bg-violet-900/20 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-900/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ledgerLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Report Status</p>
          <p className="mt-3">{statusChip(reportStatus, canGenerate ? 'ready' : 'pending')}</p>
          <p className="mt-2 text-xs text-slate-500">{report?.reportId ?? 'No report generated yet.'}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Evidence Packet</p>
          <p className="mt-3">{statusChip(evidenceStatus, report?.evidencePacket.status === 'generated' ? 'ready' : 'review')}</p>
          <p className="mt-2 text-xs text-slate-500">Optional support layer for attachments and validator material.</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Ledger Status</p>
          <p className="mt-3">{statusChip(ledgerStatus, ledgerStatus === 'Logged' ? 'logged' : 'pending')}</p>
          <p className="mt-2 text-xs text-slate-500">{report ? `Chain: ${report.ledger.chainType}` : 'Ledger: Ready'}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">PDF Status</p>
          <p className="mt-3">{statusChip(pdfStatus, report?.hashes.pdfHash ? 'ready' : 'pending')}</p>
          <p className="mt-2 text-xs text-slate-500">{report?.hashes.pdfHash ? 'PDF hash recorded.' : 'PDF will be generated client-side.'}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">QR Verification</p>
          <p className="mt-3">{statusChip(qrStatus, report?.qr.qrCodeDataUrl ? 'ready' : 'pending')}</p>
          <p className="mt-2 text-xs text-slate-500">{report ? 'QR created after report generation.' : 'QR created after report generation.'}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Situation Room</p>
          <p className="mt-3">{statusChip(roomStatus, roomStatus === 'Open' ? 'review' : 'backend')}</p>
          <p className="mt-2 text-xs text-slate-500">{report?.situationRoom.roomId ?? 'Created after report generation.'}</p>
        </article>
      </div>

      {report ? (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onDownloadPdf} className="rounded-xl border border-emerald-500/40 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-100">
                Generate PDF Report
              </button>
              <button type="button" onClick={onOpenReport} className="rounded-xl border border-cyan-500/40 bg-cyan-900/20 px-3 py-2 text-xs font-semibold text-cyan-100">
                View Verification Page
              </button>
              <button type="button" onClick={onOpenSituationRoom} className="rounded-xl border border-violet-500/40 bg-violet-900/20 px-3 py-2 text-xs font-semibold text-violet-100">
                Open Situation Room
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
                <p className="font-semibold text-white">AI summary</p>
                <p className="mt-2 leading-relaxed">{report.aiIntelligence.summary}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
                <p className="font-semibold text-white">Verification posture</p>
                <p className="mt-2">Ledger: {report.ledger.verificationStatus}</p>
                <p className="mt-1">Payload hash: {report.hashes.reportPayloadHash || 'Pending generation'}</p>
                <p className="mt-1">PDF hash: {report.hashes.pdfHash || 'Pending after PDF generation'}</p>
                <p className="mt-1">Evidence Packet: {report.evidencePacket.status === 'not_generated' ? 'Not generated yet' : report.evidencePacket.status}</p>
              </div>
            </div>
          </div>
          <AquaScanReportQRCode report={report} />
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
