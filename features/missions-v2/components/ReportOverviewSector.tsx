import React from 'react';
import type { MissionReportOverview } from '../types';
import SectorCard from './SectorCard';

interface ReportOverviewSectorProps {
  report: MissionReportOverview;
}

const ReportOverviewSector: React.FC<ReportOverviewSectorProps> = ({ report }) => {
  return (
    <SectorCard title="Report Overview Sector" subtitle="Snapshot of the source report for this mission">
      <div className="space-y-3">
        <img src={report.imageUrl} alt="Report snapshot" className="h-40 w-full rounded-xl object-cover" />
        <div className="grid grid-cols-1 gap-2 text-xs text-zinc-300">
          <p><span className="text-zinc-500">Report ID:</span> {report.reportId}</p>
          <p><span className="text-zinc-500">Location:</span> {report.location}</p>
          <p><span className="text-zinc-500">Issue Type:</span> {report.issueType}</p>
          <p>{report.snapshot}</p>
        </div>
      </div>
    </SectorCard>
  );
};

export default ReportOverviewSector;
