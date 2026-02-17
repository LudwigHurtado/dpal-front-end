import React, { useMemo } from 'react';
import type { Report } from '../types';
import MyReportCard from './MyReportCard';
import { useTranslations } from '../i18n';
import { Megaphone, Activity, Plus, CheckCircle, Clock, AlertTriangle } from './icons';

interface MyReportsListProps {
  reports: Report[];
  onJoinReportChat: (report: Report) => void;
  onAddNewReport: () => void;
}

const MyReportsList: React.FC<MyReportsListProps> = ({ reports, onJoinReportChat, onAddNewReport }) => {
  const { t } = useTranslations();

  const myReports = useMemo(() => {
    const toTime = (r: Report) => {
      const d = r.timestamp instanceof Date ? r.timestamp : new Date((r as any).timestamp);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };
    return reports.filter(r => r.isAuthor).sort((a, b) => toTime(b) - toTime(a));
  }, [reports]);

  const stats = useMemo(() => {
    const submitted = myReports.filter(r => r.status === 'Submitted').length;
    const inReview = myReports.filter(r => r.status === 'In Review').length;
    const resolved = myReports.filter(r => r.status === 'Resolved').length;
    return { submitted, inReview, resolved };
  }, [myReports]);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden animate-fade-in">
      <div className="bg-zinc-900/70 border-b border-zinc-800 px-5 md:px-8 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Activity className="w-4 h-4 text-cyan-500" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-white tracking-wider">My Reports</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Your personal accountability timeline</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <StatPill label="Submitted" value={stats.submitted} icon={<Clock className="w-3 h-3" />} color="text-blue-400" />
          <StatPill label="In Review" value={stats.inReview} icon={<AlertTriangle className="w-3 h-3" />} color="text-amber-400" />
          <StatPill label="Resolved" value={stats.resolved} icon={<CheckCircle className="w-3 h-3" />} color="text-emerald-400" />
        </div>
      </div>

      <div className="p-5 md:p-8 space-y-5">
        <button
          onClick={onAddNewReport}
          className="w-full group bg-zinc-950 border-2 border-dashed border-zinc-700 rounded-2xl p-6 md:p-8 flex items-center justify-between gap-4 hover:border-cyan-500/60 hover:bg-zinc-900 transition-all"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-700 group-hover:border-cyan-900">
              <Plus className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-base md:text-lg font-black text-white uppercase tracking-tight">Create New Report</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Start a new incident, escrow, or safety report</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Open</span>
        </button>

        {myReports.length > 0 ? (
          <div className="space-y-4 md:space-y-5">
            {myReports.map(report => (
              <MyReportCard key={report.id} report={report} onJoinChat={() => onJoinReportChat(report)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-zinc-950/40 border border-zinc-800 rounded-2xl">
            <Megaphone className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-black text-zinc-300 uppercase tracking-tight">{t('mainContent.noReports')}</h3>
            <p className="mt-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('mainContent.beTheFirst')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StatPill: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 min-w-[90px]">
    <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wide ${color}`}>{icon}<span>{label}</span></div>
    <div className="text-white font-black text-lg leading-none mt-1">{value}</div>
  </div>
);

export default MyReportsList;
