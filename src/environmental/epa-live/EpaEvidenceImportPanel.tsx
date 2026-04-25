import React from 'react';
import type { EpaEvidencePacketRecord } from '../../types/epa';

type Props = {
  importedRecords: EpaEvidencePacketRecord[];
};

const EpaEvidenceImportPanel: React.FC<Props> = ({ importedRecords }) => {
  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 md:p-5">
      <h2 className="text-base font-bold text-slate-100">DPAL Evidence Packet Import</h2>
      <p className="mt-1 text-xs text-slate-400">Stored in local state for MVP. Ready to connect to backend persistence.</p>
      {importedRecords.length === 0 ? (
        <p className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">No EPA records imported yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {importedRecords.map((record) => (
            <article key={`${record.facilityId}-${record.importedAtIso}`} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200">
              <p className="font-semibold text-slate-100">{record.facilityName}</p>
              <p>{record.city}, {record.state} · ID {record.facilityId}</p>
              <p>CO2e: {record.reportedEmissionsCo2e?.toLocaleString() ?? 'N/A'} · Year: {record.reportingYear ?? 'N/A'}</p>
              <p className="text-slate-400">Imported: {new Date(record.importedAtIso).toLocaleString()}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default EpaEvidenceImportPanel;
