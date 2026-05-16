import React from 'react';
import { ChevronRight, Shield } from '../../../../components/icons';
import type { DmrvProjectStatus } from '../services/dmrvProjectContextTypes';

const STATUS_LABEL: Record<DmrvProjectStatus, string> = {
  required: 'Not started',
  draft: 'Draft',
  complete: 'Complete',
  blockchain_ready: 'Blockchain Ready',
};

const STATUS_CLASS: Record<DmrvProjectStatus, string> = {
  required: 'bg-amber-100 text-amber-950 border-amber-200',
  draft: 'bg-slate-100 text-slate-800 border-slate-200',
  complete: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  blockchain_ready: 'bg-[#1e3a5f] text-white border-[#1e3a5f]',
};

export function DmrvProjectFirstCard({
  status,
  onOpen,
}: {
  status: DmrvProjectStatus;
  onOpen: () => void;
}): React.ReactElement {
  return (
    <div className="mb-3 w-full rounded-xl border-2 border-[#1e3a5f]/30 bg-gradient-to-br from-[#e8f0f7] to-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e3a5f] text-white">
            <Shield className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#1e3a5f]">Step 1 · Project context</p>
            <p className="text-[11px] font-black text-slate-900">Project configuration (optional)</p>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-600">
              Optional. Set project identity, AOI, methodology, and reporting period — or open any evidence input directly
              from the selector icons.
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${STATUS_CLASS[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-[#1e3a5f] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-[#152a47]"
      >
        Open Project Configuration
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
