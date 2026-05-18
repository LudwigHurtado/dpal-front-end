import React from 'react';
import type { DmrvReportType } from './dmrvReportTypes';

export type DmrvReportDisclaimerProps = {
  reportType?: DmrvReportType;
  compact?: boolean;
};

export function DmrvReportDisclaimer({
  reportType = 'carbon',
  compact = false,
}: DmrvReportDisclaimerProps): React.ReactElement {
  const categoryNote =
    reportType === 'plastic' || reportType === 'water' || reportType === 'biodiversity'
      ? ' Results for plastic, water, or biodiversity monitoring must not be labeled as carbon credits unless an accepted methodology and registry process supports that claim.'
      : '';

  return (
    <aside
      className={`rounded-xl border border-amber-200/80 bg-amber-50/90 text-amber-950 ${
        compact ? 'px-3 py-2 text-[11px] leading-snug' : 'px-4 py-3 text-xs leading-relaxed'
      }`}
      role="note"
    >
      <p className="font-semibold">dMRV evidence disclaimer</p>
      <p className={compact ? 'mt-1' : 'mt-1.5'}>
        This report is a digital DMRV evidence package. It is not a certified carbon credit issuance document unless
        reviewed and accepted under an applicable carbon standard, methodology, registry, and VVB process.
        {categoryNote}
      </p>
    </aside>
  );
}
