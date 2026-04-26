import React from 'react';
import type { EnvirofactsEvidencePacket } from '../../types/envirofactsTypes';

type Props = {
  records: EnvirofactsEvidencePacket[];
  expanded: boolean;
  onToggle: () => void;
};

const EnvirofactsEvidenceImportPanel: React.FC<Props> = ({ records, expanded, onToggle }) => {
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <section className="rounded-xl border border-slate-700/90 bg-slate-900/75 p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">Evidence packet import</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Evidence Packet: {records.length} record{records.length === 1 ? '' : 's'} imported
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-900"
        >
          {expanded ? 'Hide Evidence Packet' : 'View Evidence Packet'}
        </button>
      </div>
      {!expanded ? (
        <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-400">
          Expand to review imported records and JSON payloads.
        </p>
      ) : records.length === 0 ? (
        <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-400">No records in the packet yet. Use Add to Evidence Packet from the map or table.</p>
      ) : (
        <div className="mt-4 max-h-[min(520px,55vh)] space-y-3 overflow-y-auto pr-1">
          {records.map((entry) => {
            const key = `${entry.recordId}-${entry.importedAt}`;
            const open = openId === key;
            return (
              <article key={key} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100">{entry.facilityName || 'EPA Record'}</p>
                    <p className="text-[11px] text-slate-500">
                      {entry.city}, {entry.state} · {entry.environmentalCategory}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : key)}
                    className="shrink-0 rounded border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-900"
                  >
                    {open ? 'Hide JSON' : 'View JSON'}
                  </button>
                </div>
                <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">{entry.dpalStatus}</p>
                <p className="mt-1 text-[10px] text-slate-600">{entry.confidence}</p>
                {open ? (
                  <pre className="mt-3 max-h-64 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 text-[10px] leading-relaxed text-slate-400">
                    {JSON.stringify(entry, null, 2)}
                  </pre>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default EnvirofactsEvidenceImportPanel;
