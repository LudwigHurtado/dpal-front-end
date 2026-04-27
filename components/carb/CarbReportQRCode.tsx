import React from 'react';
import type { CarbSpecializedReport } from '../../types/carbReport';

interface CarbReportQRCodeProps {
  report: CarbSpecializedReport;
}

export default function CarbReportQRCode({ report }: CarbReportQRCodeProps): React.ReactElement {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">QR Verification</p>
      <p className="mt-1 text-xs text-slate-400">
        Scan to verify this CARB specialized report.
      </p>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-white p-2">
          {report.qr.qrCodeDataUrl ? (
            <img src={report.qr.qrCodeDataUrl} alt={`QR code for ${report.reportId}`} className="h-full w-full object-contain" />
          ) : (
            <span className="text-[11px] font-semibold text-slate-500">Pending QR</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-200">Verification URL</p>
          <a href={report.qr.verificationUrl} className="mt-1 block break-all text-[11px] text-cyan-300 hover:text-cyan-200">
            {report.qr.verificationUrl}
          </a>
        </div>
      </div>
    </div>
  );
}
