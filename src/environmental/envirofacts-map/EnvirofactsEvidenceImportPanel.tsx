import React from 'react';
import type { EnvirofactsEvidenceRecord } from '../../types/envirofactsTypes';

type Props = {
  records: EnvirofactsEvidenceRecord[];
};

const EnvirofactsEvidenceImportPanel: React.FC<Props> = ({ records }) => (
  <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 md:p-5">
    <h2 className="text-base font-bold text-slate-100">Evidence Packet Import</h2>
    <p className="mt-1 text-xs text-slate-400">Local state cache for MVP. Backend persistence can be wired later.</p>
    {records.length === 0 ? (
      <p className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">No imports yet.</p>
    ) : (
      <div className="mt-3 space-y-2">
        {records.map((entry) => (
          <article key={`${entry.recordId}-${entry.importedAtIso}`} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200">
            <p className="font-semibold text-slate-100">{entry.facilityName || 'EPA Record'}</p>
            <p>{entry.city}, {entry.state} · {entry.environmentalMediaCategory}</p>
            <p>{entry.dpalStatus}</p>
          </article>
        ))}
      </div>
    )}
  </section>
);

export default EnvirofactsEvidenceImportPanel;
