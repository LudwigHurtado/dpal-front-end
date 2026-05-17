import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from '../../../../components/icons';
import { dmrvReportPreviewPath } from '../dmrvNavigation';

export type DmrvWorkflowReportHeaderProps = {
  projectId: string;
  categorySlug: string;
  typeId: string;
  className?: string;
};

/** Permanent access to the living evidence report from any DMRV workflow screen. */
export function DmrvWorkflowReportHeader({
  projectId,
  categorySlug,
  typeId,
  className = '',
}: DmrvWorkflowReportHeaderProps): React.ReactElement {
  const previewPath = dmrvReportPreviewPath(projectId, categorySlug, typeId);
  const printPath = dmrvReportPreviewPath(projectId, categorySlug, typeId, { print: true });

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Link
        to={previewPath}
        className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#16304f]"
      >
        <FileText className="h-4 w-4" />
        View Live dMRV Evidence Report
      </Link>
      <Link
        to={previewPath}
        className="inline-flex items-center rounded-xl border border-[#1e3a5f]/30 bg-white px-3 py-2 text-xs font-semibold text-[#1e3a5f] hover:bg-[#e8f0f7]"
      >
        Open Living Report
      </Link>
      <Link
        to={printPath}
        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        Preview Verifier Report
      </Link>
    </div>
  );
}
