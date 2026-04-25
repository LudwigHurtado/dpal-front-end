import React from 'react';
import type { EnvirofactsRecord } from '../../types/envirofactsTypes';

type Props = {
  record: EnvirofactsRecord | null;
  open: boolean;
  onClose: () => void;
  onAddEvidence?: (recordId: string) => void;
};

const tabs = [
  'EPA Record',
  'Location',
  'Source Systems',
  'Environmental Category',
  'Coordinates / Map Context',
  'Compliance / Enforcement',
  'DPAL Evidence Packet',
  'Satellite Comparison',
  'Investigation Timeline',
] as const;

const tabBtn = (active: boolean) =>
  `rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
    active ? 'border-slate-400 bg-slate-800 text-slate-50' : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
  }`;

const EnvirofactsFacilityDrawer: React.FC<Props> = ({ record, open, onClose, onAddEvidence }) => {
  const [tab, setTab] = React.useState<(typeof tabs)[number]>('EPA Record');
  React.useEffect(() => {
    if (!open) setTab('EPA Record');
  }, [open]);
  if (!open || !record) return null;

  const loc = [record.address, record.city, record.county, record.state, record.zip].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/65 p-2 md:p-4">
      <aside className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-4 md:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Official EPA Record</p>
            <h3 className="mt-1 break-words text-lg font-semibold leading-snug text-slate-50">{record.facilityName || record.recordName}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-300">Public Data Baseline</span>
              {record.pinnable ? (
                <span className="rounded border border-emerald-900/60 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-200/90">Coordinates Available</span>
              ) : (
                <span className="rounded border border-amber-900/50 bg-amber-950/25 px-2 py-0.5 text-[10px] font-medium text-amber-100/90">Coordinates Unavailable</span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-900">
            Close
          </button>
        </div>
        <div className="border-b border-slate-800 px-3 py-2 md:px-4">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((item) => (
              <button key={item} type="button" onClick={() => setTab(item)} className={tabBtn(tab === item)}>
                {item}
                {item === 'Satellite Comparison' || item === 'Investigation Timeline' ? ' · soon' : ''}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-slate-200 md:px-5">
          {tab === 'EPA Record' ? (
            <div className="space-y-2 text-slate-300">
              <p>
                <span className="text-slate-500">Registry / record ID:</span> {record.recordId || 'Not provided'}
              </p>
              <p>
                <span className="text-slate-500">Table:</span> <span className="font-mono text-xs">{record.sourceTable}</span>
              </p>
              <p>
                <span className="text-slate-500">Source database:</span> {record.sourceDatabase}
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                DPAL treats this row as an official public-data baseline for comparison and evidence organization. It does not, by itself, establish a violation.
              </p>
            </div>
          ) : null}
          {tab === 'Location' ? <p className="text-slate-300">{loc || 'Location fields were not provided on this row.'}</p> : null}
          {tab === 'Source Systems' ? (
            <div className="space-y-2">
              <p className="text-slate-400">Program flags (normalized from EPA columns such as ICIS, NPDES, RCRAInfo, TRI, SEMS, CERCLIS, RadNet, GHG, and registry identifiers).</p>
              <p className="font-medium text-slate-200">{record.sourceFlags.length ? record.sourceFlags.join(' · ') : 'No program flags parsed on this row.'}</p>
            </div>
          ) : null}
          {tab === 'Environmental Category' ? <p className="text-slate-300">{record.environmentalCategory || 'Not categorized on this row.'}</p> : null}
          {tab === 'Coordinates / Map Context' ? (
            <div className="space-y-2 text-slate-300">
              {record.pinnable ? (
                <p>
                  Latitude {record.latitude}, longitude {record.longitude}. Suitable for map context and geospatial comparison when you add external layers.
                </p>
              ) : (
                <p>EPA returned this record without coordinates that meet DPAL validation rules, so it cannot be pinned. It remains available for tabular review.</p>
              )}
            </div>
          ) : null}
          {tab === 'Compliance / Enforcement' ? (
            <p className="text-slate-300">
              {record.complianceStatus
                ? `Fields on this row: ${record.complianceStatus}`
                : 'No compliance or enforcement narrative is attached to this row in the Envirofacts extract. Use agency systems of record for formal determinations.'}
            </p>
          ) : null}
          {tab === 'DPAL Evidence Packet' ? (
            <div className="space-y-3">
              <p className="text-slate-300">Add this row to your local evidence packet for structured review. Nothing is sent to DPAL servers until you wire persistence.</p>
              <button
                type="button"
                onClick={() => onAddEvidence?.(record.id)}
                className="rounded-lg border border-slate-500 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
              >
                Add to Evidence Packet
              </button>
            </div>
          ) : null}
          {tab === 'Satellite Comparison' ? (
            <p className="text-slate-400">Placeholder: satellite overlays and change detection will plug in here. Use the map or table action when available.</p>
          ) : null}
          {tab === 'Investigation Timeline' ? (
            <p className="text-slate-400">Placeholder: investigation milestones, agency correspondence, and internal review stages will appear here.</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
};

export default EnvirofactsFacilityDrawer;
