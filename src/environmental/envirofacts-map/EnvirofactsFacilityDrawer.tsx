import React from 'react';
import type { EnvirofactsRecord } from '../../types/envirofactsTypes';

type Props = {
  record: EnvirofactsRecord | null;
  open: boolean;
  onClose: () => void;
};

const tabs = [
  'EPA Record',
  'Location',
  'Environmental Category',
  'Source Database',
  'Compliance/Enforcement',
  'DPAL Evidence Packet',
  'Satellite Comparison',
] as const;

const EnvirofactsFacilityDrawer: React.FC<Props> = ({ record, open, onClose }) => {
  const [tab, setTab] = React.useState<(typeof tabs)[number]>('EPA Record');
  React.useEffect(() => {
    if (!open) setTab('EPA Record');
  }, [open]);
  if (!open || !record) return null;
  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/60 p-2 md:p-4">
      <aside className="h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 md:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Official EPA Record</p>
            <h3 className="text-xl font-black text-white">{record.facilityName || record.recordName}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">Close</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={`rounded border px-3 py-1 text-xs ${tab === item ? 'border-cyan-500/70 bg-cyan-900/35 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
              {item}{item === 'Satellite Comparison' ? ' (placeholder)' : ''}
            </button>
          ))}
        </div>
        <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-200 space-y-1">
          {tab === 'EPA Record' ? <p>Record ID: {record.recordId || 'Not provided'} · Table: {record.sourceTable}</p> : null}
          {tab === 'Location' ? <p>{[record.address, record.city, record.county, record.state, record.zip].filter(Boolean).join(', ') || 'Location unavailable'}</p> : null}
          {tab === 'Environmental Category' ? <p>{record.environmentalCategory || 'Facilities'}</p> : null}
          {tab === 'Source Database' ? <p>{record.sourceDatabase}</p> : null}
          {tab === 'Compliance/Enforcement' ? <p>{record.complianceStatus || 'No enforcement indicator in this record. Verification Needed.'}</p> : null}
          {tab === 'DPAL Evidence Packet' ? <p>Status: Official Public Record Imported · Public Data Baseline</p> : null}
          {tab === 'Satellite Comparison' ? <p>Coming next. Use “Compare Satellite Data” from map/table actions to start workflow.</p> : null}
        </section>
      </aside>
    </div>
  );
};

export default EnvirofactsFacilityDrawer;
