import React from 'react';
import type { MissionReportOverview } from '../types';
import SectorCard from './SectorCard';

interface ReportOverviewSectorProps {
  report: MissionReportOverview;
}

const ReportOverviewSector: React.FC<ReportOverviewSectorProps> = ({ report }) => {
  return (
    <SectorCard title="Report Overview">
      <div className="rounded-lg border border-slate-300 bg-slate-50 p-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
          {report.imageUrl ? (
            <img src={report.imageUrl} alt="Report snapshot" className="h-28 w-full rounded-md object-cover" />
          ) : (
            <div className="flex h-28 w-full items-center justify-center rounded-md border border-slate-300 bg-slate-200 text-xs font-semibold text-slate-500">
              No report image
            </div>
          )}
          <div className="text-sm text-slate-700">
            <p className="mb-2 text-xl font-semibold text-slate-900">{report.title}</p>
            <p className="mb-1">◉ Report ID: #{report.reportId.replace('rep-', '')}</p>
            <p className="mb-1">◉ Location: {report.location}</p>
            <p>☑ Issue: {report.issueType}</p>
          </div>
        </div>
      </div>
    </SectorCard>
  );
};

export default ReportOverviewSector;
