import React from 'react';
import type { CategoryDefinition } from '../../../types/categoryGateway';
import { calculateReportStrength, reportStrengthLabel } from '../../../utils/reportStrength';
import type { ReportDraft } from '../../../types/categoryGateway';

export type ReportModeEntryProps = {
  definition: CategoryDefinition;
  accent: string;
  reportDraft: ReportDraft | undefined;
  onContinueFullReport: () => void;
  onEditDraft: () => void;
};

const ReportModeEntry: React.FC<ReportModeEntryProps> = ({
  definition,
  accent,
  reportDraft,
  onContinueFullReport,
  onEditDraft,
}) => {
  const r = definition.modes.report;
  const strength = reportDraft ? calculateReportStrength(reportDraft) : 0;
  const label = reportStrengthLabel(strength);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Report</h2>
        <p className="mt-2 text-slate-600 leading-relaxed">{r?.intro}</p>

        {r?.reportTypes && r.reportTypes.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Report focus areas</p>
            <div className="flex flex-wrap gap-2">
              {r.reportTypes.map((t) => (
                <span key={t} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {t.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onContinueFullReport}
            className="rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-95"
            style={{ backgroundColor: accent }}
          >
            Open full report builder
          </button>
          {reportDraft && reportDraft.summary && (
            <button
              type="button"
              onClick={onEditDraft}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Resume caseboard draft
            </button>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Report strength</p>
            <p className="text-lg font-black text-slate-900">{label}</p>
          </div>
          <div className="text-3xl font-black tabular-nums" style={{ color: accent }}>
            {strength}
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${strength}%`, backgroundColor: accent }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Strength increases as you add type, summary, location, time, evidence, severity, and pattern notes.
        </p>
      </div>
    </div>
  );
};

export default ReportModeEntry;
